'use server';

import { Producer } from '../../data/entities/Producer';
import { Person, AccountTypeName, BankName, type PersonBankAccount } from '../../data/entities/Person';
import { Audit } from '../../data/entities/Audit';
import { AuditActionType } from '../../data/entities/audit.types';
import { getDb } from '../../data/db';
import moment from 'moment-timezone';
import { revalidatePath } from 'next/cache';
import { getCurrentUserSession } from './auth.server';
import { listPendingReceptions, listPendingAdvances } from './settlements';
import { EntityManager, IsNull } from 'typeorm';

const APP_TIMEZONE = 'America/Santiago';
const VALID_FIELDS = ['name', 'dni'];
const VALID_SORT_FIELDS = ['name', 'dni', 'createdAt', 'updatedAt'];
const VALID_CALCULATED_SORT_FIELDS = ['pendingAdvances', 'pendingReceptions', 'balance'];

/**
 * Normalize string for search (remove accents, convert to lowercase)
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Parse column filters from string format
 */
function parseColumnFilters(filterStr?: string): Record<string, string> {
  if (!filterStr) return {};
  
  const filters: Record<string, string> = {};
  const parts = filterStr.split(',');
  
  for (const part of parts) {
    const [key, ...valueParts] = part.split('-');
    if (key && valueParts.length > 0) {
      filters[key.trim()] = decodeURIComponent(valueParts.join('-').trim());
    }
  }
  
  return filters;
}

/**
 * Calculate pending advances total for a producer
 */
async function calculatePendingAdvances(producerId: string): Promise<number> {
  try {
    if (!producerId?.trim()) {
      return 0;
    }

    // Validate producerId format
    if (typeof producerId !== 'string' || producerId.length === 0) {
      console.warn('[calculatePendingAdvances] Invalid producerId format:', producerId);
      return 0;
    }

    const result = await listPendingAdvances({ producerId, limit: 50 });
    return Math.max(0, result.totals.availableAmount || 0);
  } catch (error) {
    console.error('[calculatePendingAdvances] Error for producer', producerId, ':', error instanceof Error ? error.message : String(error));
    return 0;
  }
}

/**
 * Calculate pending receptions total for a producer
 */
async function calculatePendingReceptions(producerId: string): Promise<number> {
  try {
    if (!producerId?.trim()) {
      return 0;
    }

    // Validate producerId format
    if (typeof producerId !== 'string' || producerId.length === 0) {
      console.warn('[calculatePendingReceptions] Invalid producerId format:', producerId);
      return 0;
    }

    const result = await listPendingReceptions({ producerId, limit: 50 });
    const total = result.rows.reduce((acc: number, row: any) => {
      const clp = typeof row.totalToPayCLP === 'number' ? row.totalToPayCLP : 0;
      const usd = typeof row.totalToPayUSD === 'number' ? row.totalToPayUSD : 0;
      const rate = typeof row.exchangeRate === 'number' ? row.exchangeRate : 0;
      const fallback = typeof row.totalCLPToPay === 'number' ? row.totalCLPToPay : 0;
      const computed = clp + usd * rate;
      const amount = computed > 0 ? computed : fallback;
      return acc + Math.max(0, amount);
    }, 0);
    return total;
  } catch (error) {
    console.error('[calculatePendingReceptions] Error for producer', producerId, ':', error instanceof Error ? error.message : String(error));
    return 0;
  }
}

/**
 * Serialize producer for transmission
 */
async function serializeProducer(producer: Producer, includeFinancials: boolean = true): Promise<ProducerGridData> {
  try {
    let pendingAdvances = 0;
    let pendingReceptions = 0;
    let balance = 0;

    if (includeFinancials) {
      pendingAdvances = await calculatePendingAdvances(producer.id);
      pendingReceptions = await calculatePendingReceptions(producer.id);
      balance = pendingReceptions - pendingAdvances;
    }

    return {
      id: producer.id,
      name: producer.name,
      dni: producer.dni,
      mail: typeof producer.mail === 'string' ? producer.mail : undefined,
      phone: typeof producer.phone === 'string' ? producer.phone : undefined,
      address: typeof producer.address === 'string' ? producer.address : undefined,
      productiveUnitId: producer.productiveUnitId || undefined,
      productiveUnitName: producer.productiveUnit?.name || undefined,
      pendingAdvances,
      pendingReceptions,
      balance,
    };
  } catch (error) {
    console.error('[serializeProducer] Error serializing producer', producer.id, ':', error);
    // Return safe defaults if calculation fails
    return {
      id: producer.id,
      name: producer.name,
      dni: producer.dni,
      mail: typeof producer.mail === 'string' ? producer.mail : undefined,
      phone: typeof producer.phone === 'string' ? producer.phone : undefined,
      address: typeof producer.address === 'string' ? producer.address : undefined,
      productiveUnitId: producer.productiveUnitId || undefined,
      productiveUnitName: producer.productiveUnit?.name || undefined,
      pendingAdvances: 0,
      pendingReceptions: 0,
      balance: 0,
    };
  }
}

/**
 * Serialize producers array
 */
async function serializeProducers(producers: Producer[], includeFinancials: boolean = true): Promise<ProducerGridData[]> {
  const results = await Promise.all(producers.map(producer => serializeProducer(producer, includeFinancials)));
  return results;
}

const allowedAccountTypes = new Set<string>(Object.values(AccountTypeName));
const allowedBankNames = new Set<string>(Object.values(BankName));

function sanitizeBankAccounts(input?: PersonBankAccount[] | null): PersonBankAccount[] | undefined {
  if (!Array.isArray(input)) {
    return undefined;
  }

  const sanitizedAccounts: PersonBankAccount[] = [];

  for (const rawAccount of input) {
    if (!rawAccount) {
      continue;
    }

    const accountTypeRaw = typeof rawAccount.accountType === 'string' ? rawAccount.accountType.trim() : '';
    const bankRaw = typeof rawAccount.bank === 'string' ? rawAccount.bank.trim() : '';
    const accountNumber = typeof rawAccount.accountNumber === 'string' ? rawAccount.accountNumber.trim() : '';

    if (!accountTypeRaw || !bankRaw || !accountNumber) {
      continue;
    }

    if (!allowedAccountTypes.has(accountTypeRaw) || !allowedBankNames.has(bankRaw)) {
      continue;
    }

    const sanitizedAccount: PersonBankAccount = {
      accountType: accountTypeRaw as AccountTypeName,
      bank: bankRaw as BankName,
      accountNumber,
    };

    if (typeof rawAccount.alias === 'string') {
      const alias = rawAccount.alias.trim();
      if (alias) {
        sanitizedAccount.alias = alias;
      }
    }

    if (rawAccount.isPrimary !== undefined) {
      sanitizedAccount.isPrimary = Boolean(rawAccount.isPrimary);
    }

    sanitizedAccounts.push(sanitizedAccount);
  }

  return sanitizedAccounts.length > 0 ? sanitizedAccounts : undefined;
}

export interface CreateProducerInput {
  name: string;
  dni: string;
  mail?: string;
  phone?: string;
  address?: string;
  bankAccounts?: PersonBankAccount[];
  productiveUnitId?: string;
}

export interface UpdateProducerInput {
  id: string;
  name?: string;
  dni?: string;
  mail?: string;
  phone?: string;
  address?: string;
  productiveUnitId?: string | null;
}

export interface GetProducersGridDataInput {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  columnFilters?: string;
}

export interface ProducerGridData {
  id: string;
  name: string;
  dni: string;
  mail?: string;
  phone?: string;
  address?: string;
  productiveUnitId?: string;
  productiveUnitName?: string;
  pendingAdvances: number; // Suma de anticipos pendientes
  pendingReceptions: number; // Suma de recepciones pendientes
  balance: number; // Saldo (recepciones pendientes - anticipos pendientes)
}

export interface GridResponse {
  success: boolean;
  data: ProducerGridData[];
  totalRecords: number;
  page: number;
  limit: number;
  totalPages: number;
  error?: string;
}

export interface ProducerResult {
  success: boolean;
  message?: string;
  data?: Producer | Producer[] | ProducerGridData | null;
  error?: string;
}

/**
 * Audit logging helper for producers
 */
async function logProducerAudit(
  manager: EntityManager,
  entityId: string,
  action: AuditActionType,
  userId: string | undefined,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>
) {
  try {
    const crypto = require('crypto');
    const auditId = crypto.randomUUID();

    const fields: Record<string, any> = {};
    let changeCount = 0;

    if (oldValues && newValues) {
      for (const key in newValues) {
        if (oldValues[key] !== newValues[key]) {
          fields[key] = { oldValue: oldValues[key], newValue: newValues[key] };
          changeCount++;
        }
      }
    } else if (newValues && !oldValues) {
      for (const key in newValues) {
        fields[key] = { oldValue: null, newValue: newValues[key] };
        changeCount++;
      }
    } else if (oldValues && !newValues) {
      for (const key in oldValues) {
        fields[key] = { oldValue: oldValues[key], newValue: null };
        changeCount++;
      }
    }

    await manager.insert(Audit, {
      entityName: 'Producer',
      entityId: String(entityId),
      userId: userId,
      action: action,
      description: `${action} producer ${entityId}`,
      oldValues: oldValues as any,
      newValues: newValues,
      changes: changeCount > 0 ? fields : undefined,
      createdAt: new Date(moment.tz(APP_TIMEZONE).format('YYYY-MM-DD HH:mm:ss')),
    });
  } catch (error) {
    console.error('[logProducerAudit] Error:', error);
  }
}

/**
 * Get producers grid data with filters, search, and pagination
 */
export async function getProducersGridData(input: GetProducersGridDataInput): Promise<GridResponse> {
  try {
    const page = Math.max(1, input.page || 1);
    const limit = Math.min(100, Math.max(1, input.limit || 25));
    const sortBy = [...VALID_SORT_FIELDS, ...VALID_CALCULATED_SORT_FIELDS].includes(input.sortBy || '') ? input.sortBy : 'name';
    const isCalculatedSort = sortBy && VALID_CALCULATED_SORT_FIELDS.includes(sortBy);
    const sortOrder = input.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const db = await getDb();
    const query = db.createQueryBuilder(Producer, 'producer')
      .leftJoinAndSelect('producer.productiveUnit', 'productiveUnit')
      .where('producer.deletedAt IS NULL');

    // Apply search
    if (input.search?.trim()) {
      const searchTerm = normalizeString(input.search.trim());
      query.andWhere(
        `(LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(CONCAT(producer.name, producer.dni), 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u'), 'ñ', 'n')) LIKE :search)`,
        { search: `%${searchTerm}%` }
      );
    }

    // Apply column filters
    const columnFilters = parseColumnFilters(input.columnFilters);
    for (const [field, value] of Object.entries(columnFilters)) {
      if (VALID_FIELDS.includes(field)) {
        const normalizedValue = normalizeString(value);
        query.andWhere(
          `LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(producer.${field}, 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u'), 'ñ', 'n')) LIKE :${field}`,
          { [field]: `%${normalizedValue}%` }
        );
      }
    }

    // Apply productive unit filter
    // Count total
    const totalRecords = await query.getCount();
    const totalPages = Math.ceil(totalRecords / limit);

    // Apply sort and pagination
    if (!isCalculatedSort) {
      query.orderBy(`producer.${sortBy}`, sortOrder)
        .skip((page - 1) * limit)
        .take(limit);
    } else {
      // For calculated fields, we need to get all records first, then sort and paginate in memory
      // This is less efficient but necessary for calculated fields
      query.skip(0).take(1000); // Get a reasonable number of records
    }

    const producers = await query.getMany();

    // Calculate financial totals always, even during search
    const includeFinancials = true;
    let serializedData = await serializeProducers(producers, includeFinancials);

    // Handle sorting and pagination for calculated fields
    if (isCalculatedSort) {
      // Sort by calculated field
      serializedData.sort((a, b) => {
        const aValue = a[sortBy as keyof ProducerGridData] as number;
        const bValue = b[sortBy as keyof ProducerGridData] as number;
        const comparison = aValue - bValue;
        return sortOrder === 'ASC' ? comparison : -comparison;
      });

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      serializedData = serializedData.slice(startIndex, endIndex);
    }

    return {
      success: true,
      data: serializedData,
      totalRecords,
      page,
      limit,
      totalPages,
    };
  } catch (error: any) {
    console.error('[getProducersGridData] Error:', error);
    return {
      success: false,
      data: [],
      totalRecords: 0,
      page: 1,
      limit: 25,
      totalPages: 0,
      error: error?.message || 'Error fetching producers',
    };
  }
}

/**
 * Get producers data for export (up to 10,000 records)
 */
export async function getProducersExportData(input: GetProducersGridDataInput = {}): Promise<GridResponse> {
  try {
    const limit = 10000;
    const sortBy = VALID_SORT_FIELDS.includes(input.sortBy || '') ? input.sortBy : 'createdAt';
    const sortOrder = input.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const db = await getDb();
    const query = db.createQueryBuilder(Producer, 'producer')
      .leftJoinAndSelect('producer.person', 'person')
      .where('producer.deletedAt IS NULL');

    // Apply search
    if (input.search?.trim()) {
      const searchTerm = normalizeString(input.search.trim());
      query.andWhere(
        `(LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(CONCAT(producer.name, producer.dni), 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u'), 'ñ', 'n')) LIKE :search)`,
        { search: `%${searchTerm}%` }
      );
    }

    // Apply column filters
    const columnFilters = parseColumnFilters(input.columnFilters);
    for (const [field, value] of Object.entries(columnFilters)) {
      if (VALID_FIELDS.includes(field)) {
        const normalizedValue = normalizeString(value);
        query.andWhere(
          `LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(producer.${field}, 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u'), 'ñ', 'n')) LIKE :${field}`,
          { [field]: `%${normalizedValue}%` }
        );
      }
    }

    const totalRecords = await query.getCount();

    query.orderBy(`producer.${sortBy}`, sortOrder)
      .take(limit);

    const producers = await query.getMany();

    return {
      success: true,
      data: await serializeProducers(producers, true),
      totalRecords,
      page: 1,
      limit: limit,
      totalPages: 1,
    };
  } catch (error: any) {
    console.error('[getProducersExportData] Error:', error);
    return {
      success: false,
      data: [],
      totalRecords: 0,
      page: 1,
      limit: 10000,
      totalPages: 0,
      error: error?.message || 'Error exporting producers',
    };
  }
}

/**
 * Get simple producers list for autocomplete
 */
export async function getProducersSimpleList(): Promise<Array<{ id: string; name: string }>> {
  try {
    const db = await getDb();
    const producers = await db.getRepository(Producer)
      .find({
        where: { deletedAt: IsNull() },
        order: { name: 'ASC' },
      });

    return producers.map(p => ({ id: p.id, name: p.name }));
  } catch (error: any) {
    console.error('[getProducersSimpleList] Error:', error);
    return [];
  }
}

/**
 * Get producers simple list with label (= name + dni) for select inputs
 */
export async function getProducersSimpleListWithLabel(): Promise<Array<{ id: string; label: string }>> {
  try {
    const db = await getDb();
    const producers = await db.getRepository(Producer).find({ where: { deletedAt: IsNull() }, order: { name: 'ASC' } });
    return producers.map(p => ({ id: p.id, label: `${p.name} - ${p.dni}` }));
  } catch (error: any) {
    console.error('[getProducersSimpleListWithLabel] Error:', error);
    return [];
  }
}

/**
 * Create producer
 */
export async function createProducer(input: CreateProducerInput, auditUserId?: string): Promise<ProducerResult> {
  try {
    if (!input.name?.trim()) {
      return { success: false, error: 'Name is required' };
    }
    if (!input.dni?.trim()) {
      return { success: false, error: 'DNI is required' };
    }
    const db = await getDb();

    // Check duplicate DNI in Producer table
    const existingProducer = await db.getRepository(Producer).findOne({
      where: { dni: input.dni.trim(), deletedAt: IsNull() }
    });

    if (existingProducer) {
      return { success: false, error: 'Producer with this DNI already exists' };
    }

    let userId = auditUserId;
    if (!userId) {
      try {
        const { userId: sessionUserId } = await getCurrentUserSession();
        userId = sessionUserId;
      } catch (error) {
        console.warn('[createProducer] Could not get user session for audit');
      }
    }

    const sanitizedBankAccounts = sanitizeBankAccounts(input.bankAccounts);

    const result = await db.transaction(async (manager) => {
      const personData: Partial<Person> = {
        name: input.name.trim(),
        dni: input.dni.trim(),
        mail: input.mail?.trim() || undefined,
        phone: input.phone?.trim() || undefined,
        address: input.address?.trim() || undefined,
        bankAccounts: sanitizedBankAccounts ?? null,
      };

      const person = manager.create(Person, personData);

      const savedPerson = await manager.save(Person, person);

      // Create Producer record with all fields
      const producerEntityData: Partial<Producer> = {
        name: input.name.trim(),
        dni: input.dni.trim(),
        mail: input.mail?.trim() || undefined,
        phone: input.phone?.trim() || undefined,
        address: input.address?.trim() || undefined,
        personId: savedPerson.id,
        person: savedPerson,
        productiveUnitId: input.productiveUnitId || undefined,
      };

      const producer = manager.create(Producer, producerEntityData);

      const savedProducer = await manager.save(Producer, producer);
      savedProducer.person = savedPerson;

      // Audit log
      const auditProducerData = {
        name: input.name.trim(),
        dni: input.dni.trim(),
        mail: input.mail?.trim() || undefined,
        phone: input.phone?.trim() || undefined,
        address: input.address?.trim() || undefined,
        bankAccounts: sanitizedBankAccounts ?? null,
      };

      await logProducerAudit(
        manager,
        savedProducer.id,
        AuditActionType.CREATE,
        userId,
        undefined,
        auditProducerData
      );

      return savedProducer;
    });

    revalidatePath('/home/productiveManagement/producers');

    return {
      success: true,
      message: 'Producer created successfully',
      data: result ? await serializeProducer(result) : null,
    };
  } catch (error: any) {
    console.error('[createProducer] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error creating producer',
    };
  }
}

/**
 * Update producer
 */
export async function updateProducer(input: UpdateProducerInput, auditUserId?: string): Promise<ProducerResult> {
  try {
    if (!input.id?.trim()) {
      return { success: false, error: 'ID is required' };
    }

    const db = await getDb();

    const existingProducer = await db.getRepository(Producer).findOne({
      where: { id: input.id, deletedAt: IsNull() }
    });

    if (!existingProducer) {
      return { success: false, error: 'Producer not found' };
    }

    const producerUpdates: Partial<Producer> = {};

    if (input.name !== undefined) {
      if (!input.name.trim()) {
        return { success: false, error: 'Name is required' };
      }
      producerUpdates.name = input.name.trim();
    }

    if (input.dni !== undefined) {
      if (!input.dni.trim()) {
        return { success: false, error: 'DNI is required' };
      }
      // Check duplicate DNI (excluding current producer)
      const duplicateProducer = await db.getRepository(Producer).findOne({
        where: {
          dni: input.dni.trim(),
          deletedAt: IsNull(),
        }
      });
      if (duplicateProducer && duplicateProducer.id !== input.id) {
        return { success: false, error: 'Producer with this DNI already exists' };
      }
      producerUpdates.dni = input.dni.trim();
    }

    if (input.mail !== undefined) {
      producerUpdates.mail = input.mail?.trim() || undefined;
    }

    if (input.phone !== undefined) {
      producerUpdates.phone = input.phone?.trim() || undefined;
    }

    if (input.address !== undefined) {
      producerUpdates.address = input.address?.trim() || undefined;
    }

    if (input.productiveUnitId !== undefined) {
      producerUpdates.productiveUnitId = input.productiveUnitId || undefined;
    }

    if (Object.keys(producerUpdates).length === 0) {
      return { success: false, error: 'No changes detected' };
    }

    let userId = auditUserId;
    if (!userId) {
      try {
        const { userId: sessionUserId } = await getCurrentUserSession();
        userId = sessionUserId;
      } catch (error) {
        console.warn('[updateProducer] Could not get user session for audit');
      }
    }

    const oldValues = {
      name: existingProducer.name,
      dni: existingProducer.dni,
      mail: existingProducer.mail,
      phone: existingProducer.phone,
      address: existingProducer.address,
      productiveUnitId: existingProducer.productiveUnitId,
    };

    const newValues = {
      name: producerUpdates.name || existingProducer.name,
      dni: producerUpdates.dni || existingProducer.dni,
      mail: producerUpdates.mail || existingProducer.mail,
      phone: producerUpdates.phone || existingProducer.phone,
      address: producerUpdates.address || existingProducer.address,
      productiveUnitId: producerUpdates.productiveUnitId !== undefined ? producerUpdates.productiveUnitId : existingProducer.productiveUnitId,
    };

    const result = await db.transaction(async (manager) => {
      // Update Producer
      await manager.update(Producer, input.id, producerUpdates);

      const updatedProducer = await manager.findOne(Producer, {
        where: { id: input.id }
      });

      await logProducerAudit(
        manager,
        input.id,
        AuditActionType.UPDATE,
        userId,
        oldValues,
        newValues
      );

      return updatedProducer;
    });

    revalidatePath('/home/productiveManagement/producers');

    return {
      success: true,
      message: 'Producer updated successfully',
      data: result ? await serializeProducer(result) : null,
    };
  } catch (error: any) {
    console.error('[updateProducer] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error updating producer',
    };
  }
}

/**
 * Delete producer
 */
export async function deleteProducer(id: string, auditUserId?: string): Promise<ProducerResult> {
  try {
    if (!id?.trim()) {
      return { success: false, error: 'ID is required' };
    }

    const db = await getDb();

    const existingProducer = await db.getRepository(Producer).findOne({
      where: { id, deletedAt: IsNull() }
    });

    if (!existingProducer) {
      return { success: false, error: 'Producer not found' };
    }

    const oldValues = {
      name: existingProducer.name,
      dni: existingProducer.dni,
      mail: existingProducer.mail,
      phone: existingProducer.phone,
    };

    let userId = auditUserId;
    if (!userId) {
      try {
        const { userId: sessionUserId } = await getCurrentUserSession();
        userId = sessionUserId;
      } catch (error) {
        console.warn('[deleteProducer] Could not get user session for audit');
      }
    }

    const result = await db.transaction(async (manager) => {
      await manager.update(Producer, id, {
        deletedAt: new Date(),
      });

      await logProducerAudit(
        manager,
        id,
        AuditActionType.DELETE,
        userId,
        oldValues as any,
        undefined
      );

      return existingProducer;
    });

    revalidatePath('/home/productiveManagement/producers');

    return {
      success: true,
      message: 'Producer deleted successfully',
      data: result ? await serializeProducer(result) : null,
    };
  } catch (error: any) {
    console.error('[deleteProducer] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error deleting producer',
    };
  }
}