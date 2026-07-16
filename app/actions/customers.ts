// Server Actions para CRUD de la entidad Customer
'use server';

import { Customer } from '../../data/entities/Customer';
import { Audit } from '../../data/entities/Audit';
import { AuditActionType } from '../../data/entities/audit.types';
import { getDb } from '../../data/db';
import moment from 'moment-timezone';
import { revalidatePath } from 'next/cache';
import { getCurrentUserSession } from './auth.server';
import { Brackets } from 'typeorm';
import { EntityManager, IsNull, Not } from 'typeorm';

const APP_TIMEZONE = 'America/Santiago';

/**
 * Convierte una entidad Customer a un objeto plano serializable
 */
function serializeCustomer(customer: Customer): any {
  return JSON.parse(JSON.stringify({
    id: customer.id,
    personId: customer.personId,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
    deletedAt: customer.deletedAt,
  }));
}

/**
 * Convierte un array de entidades Customer a objetos planos serializables
 */
function serializeCustomers(customers: Customer[]): any[] {
  return customers.map(customer => JSON.parse(JSON.stringify({
    id: customer.id,
    personId: customer.personId,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
    deletedAt: customer.deletedAt,
  })));
}

export interface CreateCustomerInput {
  personId: string;
}

export interface UpdateCustomerInput {
  id: string;
  personId?: string;
}

export interface GetCustomersFilters {
  personId?: string;
}

export interface CustomerResult {
  success: boolean;
  message?: string;
  data?: Customer | Customer[] | null;
  error?: string;
}

/**
 * Helper function to log audit for customer
 * Uses Chile timezone (America/Santiago) for consistent timestamp handling
 */
async function logCustomerAudit(
  manager: EntityManager,
  entityId: string,
  action: AuditActionType,
  userId: string | undefined,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>
) {
  try {
    console.log('[logCustomerAudit] Iniciando registro de auditoría. userId:', userId, 'action:', action);

    const crypto = require('crypto');
    const auditId = crypto.randomUUID();

    // Crear los cambios detectados
    const fields: Record<string, any> = {};
    let changeCount = 0;

    if (oldValues && newValues) {
      // Para UPDATE, comparar valores viejos y nuevos
      for (const key in newValues) {
        if (oldValues[key] !== newValues[key]) {
          fields[key] = {
            oldValue: oldValues[key],
            newValue: newValues[key],
          };
          changeCount++;
        }
      }
    } else if (newValues && !oldValues) {
      // Para CREATE, todos los valores son nuevos
      for (const key in newValues) {
        fields[key] = {
          oldValue: null,
          newValue: newValues[key],
        };
        changeCount++;
      }
    } else if (oldValues && !newValues) {
      // Para DELETE, todos los valores se eliminan
      for (const key in oldValues) {
        fields[key] = {
          oldValue: oldValues[key],
          newValue: null,
        };
        changeCount++;
      }
    }

    await manager.insert(Audit, {
      entityName: 'Customer',
      entityId: String(entityId),
      userId: userId,
      action: action,
      description: `${action} customer ${entityId}`,
      oldValues: oldValues as any,
      newValues: newValues,
      changes: changeCount > 0 ? fields : undefined,
      createdAt: new Date(moment.tz(APP_TIMEZONE).format('YYYY-MM-DD HH:mm:ss')), // Use Chile timezone for consistent timestamp
    });
    console.log('[logCustomerAudit] Auditoría registrada exitosamente');
  } catch (error) {
    console.error('[logCustomerAudit] Error al registrar auditoría:', error);
    // No fallar la operación principal por error de auditoría
  }
}

/**
 * READ - Obtener todos los clientes con filtros opcionales
 */
export async function getCustomers(filters?: GetCustomersFilters): Promise<CustomerResult> {
  try {
    const db = await getDb();
    const repo = db.getRepository(Customer);

    const where: any = {};

    if (filters?.personId) {
      where.personId = filters.personId;
    }

    // Excluir registros soft-deleted
    where.deletedAt = IsNull();

    const customer = await repo.find({
      where,
      relations: ['person'],
      order: { createdAt: 'DESC' }
    });

    return {
      success: true,
      data: serializeCustomers(customer),
    };
  } catch (error: any) {
    console.error('[getCustomers] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al obtener clientes',
      data: [],
    };
  }
}

export async function getCustomersSimpleListWithLabel(): Promise<Array<{ id: string; label: string }>> {
  try {
    const db = await getDb();
    const customers = await db.getRepository(Customer)
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.person', 'person')
      .where('customer.deletedAt IS NULL')
      .andWhere('person.deletedAt IS NULL')
      .orderBy('person.name', 'ASC')
      .getMany();

    return customers.map((customer) => {
      const name = customer.person?.name?.trim() || 'Cliente sin nombre';
      const dni = customer.person?.dni?.trim();
      return {
        id: customer.id,
        label: dni ? `${name} - ${dni}` : name,
      };
    });
  } catch (error: any) {
    console.error('[getCustomersSimpleListWithLabel] Error:', error);
    return [];
  }
}

/**
 * READ - Obtener un cliente por ID
 */
export async function getCustomerById(id: string): Promise<CustomerResult> {
  try {
    if (!id || id.trim() === '') {
      return { success: false, error: 'ID inválido', data: null };
    }

    const db = await getDb();
    const customer = await db.getRepository(Customer).findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['person']
    });

    if (!customer) {
      return { success: false, error: 'Cliente no encontrado', data: null };
    }

    return {
      success: true,
      data: customer,
    };
  } catch (error: any) {
    console.error('[getCustomerById] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al obtener el cliente',
      data: null,
    };
  }
}

/**
 * CREATE - Crear un nuevo cliente
 */
export async function createCustomer(data: CreateCustomerInput, auditUserId?: string): Promise<CustomerResult> {
  try {
    // Validaciones
    if (!data.personId?.trim()) {
      return { success: false, error: 'La persona es requerida' };
    }

    const db = await getDb();

    // Verificar que la persona existe
    const personExists = await db.getRepository('Person').findOne({
      where: { id: data.personId, deletedAt: IsNull() }
    });

    if (!personExists) {
      return { success: false, error: 'La persona especificada no existe' };
    }

    // Verificar que no exista ya un cliente con la misma persona
    const existingCustomer = await db.getRepository(Customer).findOne({
      where: {
        personId: data.personId,
        deletedAt: IsNull()
      }
    });

    if (existingCustomer) {
      return { success: false, error: 'Ya existe un cliente con esta persona' };
    }

    // Obtener userId para auditoría si no se proporcionó
    let userId = auditUserId;
    if (!userId) {
      try {
        const { userId: sessionUserId } = await getCurrentUserSession();
        userId = sessionUserId;
      } catch (error) {
        console.warn('[createCustomer] No se pudo obtener la sesión del usuario para auditoría');
      }
    }

    const customerData = {
      personId: data.personId.trim(),
    };

    const result = await db.transaction(async (manager) => {
      const customer = manager.create(Customer, customerData);
      const savedCustomer = await manager.save(Customer, customer);

      // Registrar auditoría
      await logCustomerAudit(
        manager,
        savedCustomer.id,
        AuditActionType.CREATE,
        userId,
        undefined,
        customerData
      );

      return savedCustomer;
    });

    revalidatePath('/home/customers');

    return {
      success: true,
      message: 'Cliente creado exitosamente',
      data: result ? serializeCustomer(result) : null,
    };
  } catch (error: any) {
    console.error('[createCustomer] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al crear el cliente',
    };
  }
}

/**
 * UPDATE - Actualizar un cliente existente
 */
export async function updateCustomer(data: UpdateCustomerInput, auditUserId?: string): Promise<CustomerResult> {
  try {
    if (!data.id || data.id.trim() === '') {
      return { success: false, error: 'ID inválido' };
    }

    const db = await getDb();

    // Obtener el cliente actual
    const existingCustomer = await db.getRepository(Customer).findOne({
      where: { id: data.id, deletedAt: IsNull() }
    });

    if (!existingCustomer) {
      return { success: false, error: 'Cliente no encontrado' };
    }

    // Validaciones
    const updates: Partial<Customer> = {};

    if (data.personId !== undefined) {
      if (!data.personId.trim()) {
        return { success: false, error: 'La persona es requerida' };
      }

      // Verificar que la persona existe
      const personExists = await db.getRepository('Person').findOne({
        where: { id: data.personId, deletedAt: IsNull() }
      });

      if (!personExists) {
        return { success: false, error: 'La persona especificada no existe' };
      }

      // Verificar que no exista ya un cliente con la misma persona (excluyendo el actual)
      const duplicateCustomer = await db.getRepository(Customer).findOne({
        where: {
          personId: data.personId,
          deletedAt: IsNull(),
          id: Not(data.id) // Excluir el registro actual
        }
      });

      if (duplicateCustomer) {
        return { success: false, error: 'Ya existe otro cliente con esta persona' };
      }

      updates.personId = data.personId.trim();
    }

    // Verificar que haya cambios
    const hasChanges = Object.keys(updates).length > 0;
    if (!hasChanges) {
      return { success: false, error: 'No se detectaron cambios' };
    }

    // Obtener userId para auditoría si no se proporcionó
    let userId = auditUserId;
    if (!userId) {
      try {
        const { userId: sessionUserId } = await getCurrentUserSession();
        userId = sessionUserId;
      } catch (error) {
        console.warn('[updateCustomer] No se pudo obtener la sesión del usuario para auditoría');
      }
    }

    const oldValues = {
      personId: existingCustomer.personId,
    };

    const result = await db.transaction(async (manager) => {
      await manager.update(Customer, data.id, updates);

      const updatedCustomer = await manager.findOne(Customer, {
        where: { id: data.id },
        relations: ['person']
      });

      // Registrar auditoría
      await logCustomerAudit(
        manager,
        data.id,
        AuditActionType.UPDATE,
        userId,
        oldValues,
        updates
      );

      return updatedCustomer;
    });

    revalidatePath('/home/customers');

    return {
      success: true,
      message: 'Cliente actualizado exitosamente',
      data: result ? serializeCustomer(result) : null,
    };
  } catch (error: any) {
    console.error('[updateCustomer] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al actualizar el cliente',
    };
  }
}

/**
 * DELETE - Eliminar un cliente (soft delete)
 */
export async function deleteCustomer(id: string, auditUserId?: string): Promise<CustomerResult> {
  try {
    if (!id || id.trim() === '') {
      return { success: false, error: 'ID inválido' };
    }

    const db = await getDb();

    // Obtener el cliente actual
    const existingCustomer = await db.getRepository(Customer).findOne({
      where: { id, deletedAt: IsNull() }
    });

    if (!existingCustomer) {
      return { success: false, error: 'Cliente no encontrado' };
    }

    // Obtener userId para auditoría si no se proporcionó
    let userId = auditUserId;
    if (!userId) {
      try {
        const { userId: sessionUserId } = await getCurrentUserSession();
        userId = sessionUserId;
      } catch (error) {
        console.warn('[deleteCustomer] No se pudo obtener la sesión del usuario para auditoría');
      }
    }

    const oldValues = {
      personId: existingCustomer.personId,
    };

    const result = await db.transaction(async (manager) => {
      // Soft delete
      await manager.update(Customer, id, {
        deletedAt: new Date(),
      });

      // Registrar auditoría
      await logCustomerAudit(
        manager,
        id,
        AuditActionType.DELETE,
        userId,
        oldValues,
        undefined
      );

      return existingCustomer;
    });

    revalidatePath('/home/customers');

    return {
      success: true,
      message: 'Cliente eliminado exitosamente',
      data: result ? serializeCustomer(result) : null,
    };
  } catch (error: any) {
    console.error('[deleteCustomer] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al eliminar el cliente',
    };
  }
}

export interface CustomerGridFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  filters?: string;
}

export interface CustomerGridRow {
  id: string;
  personId?: string | null;
  name: string;
  dni: string;
  phone?: string | null;
  mail?: string | null;
  address?: string | null;
}

export interface CustomerGridResponse {
  data: CustomerGridRow[];
  total: number;
  pages: number;
  currentPage: number;
  limit: number;
}

const CUSTOMER_VALID_SORT_FIELDS = [
  'name',
  'dni',
  'phone',
  'mail',
  'createdAt',
];

function getCustomerSortColumn(sortBy: string): string {
  switch (sortBy) {
    case 'name':
      return 'person.name';
    case 'dni':
      return 'person.dni';
    case 'phone':
      return 'person.phone';
    case 'mail':
      return 'person.mail';
    case 'createdAt':
    default:
      return 'customer.createdAt';
  }
}

function normalizeString(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n');
}

export async function getCustomersGridData(filters?: CustomerGridFilters): Promise<CustomerGridResponse> {
  const safeLimit = Math.min(Math.max(5, filters?.limit || 25), 100);

  try {
    const db = await getDb();
    const page = Math.max(1, filters?.page || 1);
    const sortOrder = (filters?.sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const sortByRaw = filters?.sortBy && CUSTOMER_VALID_SORT_FIELDS.includes(filters.sortBy)
      ? filters.sortBy
      : 'createdAt';
    const sortColumn = getCustomerSortColumn(sortByRaw);

    let query = db
      .getRepository(Customer)
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.person', 'person')
      .where('customer.deletedAt IS NULL')
      .andWhere('person.deletedAt IS NULL');

    if (filters?.search && filters.search.trim().length > 0) {
      const trimmedSearch = filters.search.trim();
      const normalizedSearch = normalizeString(trimmedSearch);
      const searchNormalizedValue = `%${normalizedSearch}%`;
      const searchRawValue = `%${trimmedSearch}%`;

      query = query.andWhere(new Brackets((qb) => {
        qb.where(`LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(person.name, ''), 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u'), 'ñ', 'n')) LIKE :searchNormalized`, { searchNormalized: searchNormalizedValue })
          .orWhere(`LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(person.dni, ''), 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u'), 'ñ', 'n')) LIKE :searchNormalized`, { searchNormalized: searchNormalizedValue })
          .orWhere(`LOWER(COALESCE(person.phone, '')) LIKE :searchRaw`, { searchRaw: searchRawValue })
          .orWhere(`LOWER(COALESCE(person.mail, '')) LIKE :searchRaw`, { searchRaw: searchRawValue })
          .orWhere('CAST(customer.id AS CHAR) LIKE :searchRaw', { searchRaw: searchRawValue });
      }));
    }

    const total = await query.getCount();

    const rows = await query
      .clone()
      .orderBy(sortColumn, sortOrder as 'ASC' | 'DESC')
      .skip((page - 1) * safeLimit)
      .take(safeLimit)
      .getMany();

    const data = rows.map((customer) => ({
      id: customer.id,
      personId: customer.personId,
      name: customer.person?.name || 'Sin nombre',
      dni: customer.person?.dni || 'Sin DNI',
      phone: typeof customer.person?.phone === 'string' ? customer.person.phone : undefined,
      mail: typeof customer.person?.mail === 'string' ? customer.person.mail : undefined,
      address: typeof customer.person?.address === 'string' ? customer.person.address : undefined,
    }));

    return {
      data,
      total,
      pages: Math.ceil(total / safeLimit),
      currentPage: page,
      limit: safeLimit,
    };
  } catch (error) {
    console.error('[getCustomersGridData] Error:', error);
    return {
      data: [],
      total: 0,
      pages: 0,
      currentPage: 1,
      limit: safeLimit,
    };
  }
}