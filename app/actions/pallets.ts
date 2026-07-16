// Server Actions para CRUD de la entidad Pallet
'use server';

import { Pallet, PalletStatus, PalletMetadata, PalletTrayAssignment } from '../../data/entities/Pallet';
import { Storage } from '../../data/entities/Storage';
import { Tray } from '../../data/entities/Tray';
import { Transaction, TransactionType, TransactionDirection, TransactionUnit, PalletTrayTransferMetadata } from '../../data/entities/Transaction';
import { Audit } from '../../data/entities/Audit';
import { AuditActionType } from '../../data/entities/audit.types';
import { getDb } from '../../data/db';
import moment from 'moment-timezone';
import { revalidatePath } from 'next/cache';
import { getCurrentUserSession } from './auth.server';
import { getActiveSeason } from './seasons';
import { Brackets, EntityManager, IsNull } from 'typeorm';
import { syncPalletsPacksNetWeight } from './palletPacksNet';

const APP_TIMEZONE = 'America/Santiago';

async function ensureTransactionTypeEnum(manager: EntityManager) {
  try {
    const [columnInfo] = await manager.query(`SHOW COLUMNS FROM transactions LIKE 'type'`);
    const columnType: string | undefined = columnInfo?.Type ?? columnInfo?.type;

    if (typeof columnType !== 'string') {
      return;
    }

    const enumValues = Object.values(TransactionType);
    const missingValues = enumValues.filter((value) => !columnType.includes(`'${value}'`));

    if (missingValues.length > 0) {
      console.warn('[ensureTransactionTypeEnum] Updating transactions.type enum to include:', missingValues);
      const enumList = enumValues.map((value) => `'${value}'`).join(', ');
      await manager.query(`ALTER TABLE transactions MODIFY COLUMN \`type\` ENUM(${enumList}) NOT NULL`);
    }
  } catch (error) {
    console.error('[ensureTransactionTypeEnum] Error ensuring enum values:', error);
  }
}

/**
 * Convierte una entidad Pallet a un objeto plano serializable
 */
function serializePallet(pallet: Pallet): any {
  const weight = Number((pallet as any).weight ?? 0);
  const dispatchWeight = Number((pallet as any).dispatchWeight ?? 0);
  const packsNetWeight = Number((pallet as any).packsNetWeight ?? 0);

  return JSON.parse(JSON.stringify({
    id: pallet.id,
    storageId: pallet.storageId,
    storageName: pallet.storage ? pallet.storage.name : null,
    trayId: pallet.trayId,
    trayName: pallet.tray ? pallet.tray.name : null,
    traysQuantity: typeof pallet.traysQuantity === 'number' ? pallet.traysQuantity : 0,
    capacity: pallet.capacity,
    weight,
    dispatchWeight,
    packsNetWeight,
    status: pallet.status,
    metadata: pallet.metadata ?? null,
    createdAt: pallet.createdAt,
    updatedAt: pallet.updatedAt,
    deletedAt: pallet.deletedAt,
  }));
}

/**
 * Convierte un array de entidades Pallet a objetos planos serializables
 */
function serializePallets(pallets: Pallet[]): any[] {
  return pallets.map(serializePallet);
}

export interface CreatePalletInput {
  storageId: string;
  trayId: string;
  traysQuantity?: number;
  capacity: number;
  weight: number;
  dispatchWeight: number;
  status?: PalletStatus;
  metadata?: PalletMetadata;
}

export interface UpdatePalletInput {
  id: number;
  storageId?: string;
  trayId?: string;
  traysQuantity?: number;
  capacity?: number;
  weight?: number;
  dispatchWeight?: number;
  status?: PalletStatus;
  metadata?: PalletMetadata;
}

export interface GetPalletsFilters {
  storageId?: string;
  trayId?: string;
  status?: PalletStatus;
}

export interface PalletResult {
  success: boolean;
  message?: string;
  data?: Pallet | Pallet[] | null;
  error?: string;
}

export interface PalletGridFilters {
  fields?: string;
  page?: number;
  limit?: number;
  search?: string;
  filtration?: boolean;
  filters?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc' | 'ASC' | 'DESC';
}

export interface PalletGridResponse {
  data: any[];
  total: number;
  pages: number;
  currentPage: number;
  limit: number;
}

export interface PalletExportResponse {
  success: boolean;
  data?: any[];
  recordCount?: number;
  error?: string;
}

export interface PalletAvailabilitySummary {
  id: number;
  storageId?: string | null;
  storageName: string | null;
  trayId?: string | null;
  trayName: string | null;
  status: PalletStatus;
  capacity: number;
  traysQuantity: number;
  availableTrays: number;
  weight: number;
  dispatchWeight: number;
  availableWeight: number;
  metadata: PalletMetadata;
  updatedAt: Date;
}

export interface AvailablePalletFilters {
  trayId?: string;
  storageId?: string;
  excludePalletId?: number;
}

const PALLET_VALID_FIELDS = [
  'id',
  'storageId',
  'storageName',
  'trayId',
  'trayName',
  'traysQuantity',
  'capacity',
  'weight',
  'dispatchWeight',
  'packsNetWeight',
  'status',
  'createdAt',
  'updatedAt',
];

const PALLET_VALID_SORT_FIELDS = [
  'id',
  'storageName',
  'trayName',
  'storageId',
  'trayId',
  'traysQuantity',
  'capacity',
  'weight',
  'dispatchWeight',
  'packsNetWeight',
  'status',
  'createdAt',
  'updatedAt',
];

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/ñ/g, 'n');
}

function parseColumnFilters(
  filtersString: string,
  allowedFields: string[]
): Array<{ column: string; value: string }> {
  return filtersString
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.includes('-'))
    .map((part) => {
      const dashIndex = part.indexOf('-');
      return {
        column: part.substring(0, dashIndex).trim(),
        value: decodeURIComponent(part.substring(dashIndex + 1).trim()),
      };
    })
    .filter((filter) => filter.column && filter.value && allowedFields.includes(filter.column));
}

function normalizeColumnSql(column: string): string {
  return `LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(${column}, ''), 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u'), 'ñ', 'n'))`;
}

function applyPalletFilters(query: any, filters?: PalletGridFilters) {
  if (!filters) {
    return query;
  }

  if (filters.filtration && filters.filters) {
    const columnFilters = parseColumnFilters(filters.filters, PALLET_VALID_FIELDS);

    columnFilters.forEach((filter, index) => {
      const paramName = `colFilter${index}`;
      const normalizedValue = normalizeString(filter.value);

      switch (filter.column) {
        case 'status':
          query = query.andWhere(`pallet.status = :${paramName}`, {
            [paramName]: filter.value as PalletStatus,
          });
          break;
        case 'storageName':
          query = query.andWhere(`${normalizeColumnSql('storage.name')} LIKE :${paramName}`, {
            [paramName]: `%${normalizedValue}%`,
          });
          break;
        case 'trayName':
          query = query.andWhere(`${normalizeColumnSql('tray.name')} LIKE :${paramName}`, {
            [paramName]: `%${normalizedValue}%`,
          });
          break;
        case 'storageId':
        case 'trayId':
          query = query.andWhere(`${normalizeColumnSql(`pallet.${filter.column}`)} LIKE :${paramName}`, {
            [paramName]: `%${normalizedValue}%`,
          });
          break;
        case 'id':
        case 'traysQuantity':
        case 'capacity':
        case 'weight':
        case 'dispatchWeight':
        case 'packsNetWeight': {
          const numericValue = Number(filter.value);
          if (!Number.isNaN(numericValue)) {
            query = query.andWhere(`pallet.${filter.column} = :${paramName}`, {
              [paramName]: numericValue,
            });
          }
          break;
        }
        default:
          query = query.andWhere(`${normalizeColumnSql(`pallet.${filter.column}`)} LIKE :${paramName}`, {
            [paramName]: `%${normalizedValue}%`,
          });
          break;
      }
    });
  }

  if (filters.search?.trim()) {
    const normalizedSearch = normalizeString(filters.search.trim());

    query = query.andWhere(new Brackets((qb) => {
      qb.where(`${normalizeColumnSql('storage.name')} LIKE :search`, { search: `%${normalizedSearch}%` })
        .orWhere(`${normalizeColumnSql('tray.name')} LIKE :search`, { search: `%${normalizedSearch}%` })
        .orWhere(`${normalizeColumnSql('pallet.status')} LIKE :search`, { search: `%${normalizedSearch}%` })
        .orWhere(`${normalizeColumnSql('pallet.storageId')} LIKE :search`, { search: `%${normalizedSearch}%` })
        .orWhere(`${normalizeColumnSql('pallet.trayId')} LIKE :search`, { search: `%${normalizedSearch}%` });
    }));
  }

  return query;
}

/**
 * Helper function to log audit for pallet
 * Uses Chile timezone (America/Santiago) for consistent timestamp handling
 */
async function logPalletAudit(
  manager: EntityManager,
  entityId: string | number,
  action: AuditActionType,
  userId: string | undefined,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>
) {
  try {
    console.log('[logPalletAudit] Iniciando registro de auditoría. userId:', userId, 'action:', action);

    const crypto = require('crypto');
    const auditId = crypto.randomUUID();
    const entityIdString = String(entityId);

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

    const audit = manager.create(Audit, {
      id: auditId,
      entityName: 'Pallet',
      entityId: entityIdString,
      userId: userId,
      action: action,
      description: `${action} pallet ${entityIdString}`,
      oldValues: oldValues,
      newValues: newValues,
      changes: changeCount > 0 ? fields : undefined,
      createdAt: new Date(moment.tz(APP_TIMEZONE).format('YYYY-MM-DD HH:mm:ss')), // Use Chile timezone for consistent timestamp
    });

    await manager.save(Audit, audit);
    console.log('[logPalletAudit] Auditoría registrada exitosamente');
  } catch (error) {
    console.error('[logPalletAudit] Error al registrar auditoría:', error);
    // No fallar la operación principal por error de auditoría
  }
}

/**
 * GET - Obtener todos los pallets con filtros opcionales
 */
export async function getPallets(filters?: GetPalletsFilters): Promise<PalletResult> {
  try {
    const db = await getDb();
    const repo = db.getRepository(Pallet);

    const queryBuilder = repo.createQueryBuilder('pallet')
      .leftJoinAndSelect('pallet.storage', 'storage')
      .leftJoinAndSelect('pallet.tray', 'tray');

    // Aplicar filtros
    if (filters?.storageId) {
      queryBuilder.andWhere('pallet.storageId = :storageId', { storageId: filters.storageId });
    }

    if (filters?.trayId) {
      queryBuilder.andWhere('pallet.trayId = :trayId', { trayId: filters.trayId });
    }

    if (filters?.status) {
      queryBuilder.andWhere('pallet.status = :status', { status: filters.status });
    }

    // Solo registros no eliminados
    queryBuilder.andWhere('pallet.deletedAt IS NULL');

    // Ordenar por fecha de creación descendente (más recientes primero)
    queryBuilder.orderBy('pallet.createdAt', 'DESC');

    const pallets = await queryBuilder.getMany();

    return {
      success: true,
      data: serializePallets(pallets),
    };
  } catch (error: any) {
    console.error('[getPallets] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al obtener los pallets',
    };
  }
}

export async function getAvailablePalletSummaries(filters?: AvailablePalletFilters): Promise<{
  success: boolean;
  data?: PalletAvailabilitySummary[];
  error?: string;
}> {
  try {
    const db = await getDb();
    const repo = db.getRepository(Pallet);

    const query = repo.createQueryBuilder('pallet')
      .leftJoinAndSelect('pallet.storage', 'storage')
      .leftJoinAndSelect('pallet.tray', 'tray')
      .where('pallet.deletedAt IS NULL')
      .andWhere('pallet.status = :status', { status: PalletStatus.AVAILABLE })
      .andWhere('pallet.traysQuantity < pallet.capacity')
      .orderBy('pallet.updatedAt', 'DESC');

    if (filters?.trayId) {
      query.andWhere('pallet.trayId = :trayId', { trayId: filters.trayId });
    }

    if (filters?.storageId) {
      query.andWhere('pallet.storageId = :storageId', { storageId: filters.storageId });
    }

    if (filters?.excludePalletId) {
      query.andWhere('pallet.id <> :excludePalletId', { excludePalletId: filters.excludePalletId });
    }

    const pallets = await query.getMany();

    const summaries: PalletAvailabilitySummary[] = pallets.map((pallet) => {
      const weight = Number((pallet as any).weight ?? 0);
      const dispatchWeight = Number((pallet as any).dispatchWeight ?? 0);
      const traysQuantity = typeof pallet.traysQuantity === 'number' ? pallet.traysQuantity : 0;
      const capacity = typeof pallet.capacity === 'number' ? pallet.capacity : 0;
      const availableTrays = Math.max(capacity - traysQuantity, 0);
      const availableWeight = Math.max(weight - dispatchWeight, 0);

      return {
        id: pallet.id,
        storageId: pallet.storageId,
        storageName: pallet.storage ? pallet.storage.name : null,
        trayId: pallet.trayId,
        trayName: pallet.tray ? pallet.tray.name : null,
        status: pallet.status,
        capacity,
        traysQuantity,
        availableTrays,
        weight,
        dispatchWeight,
        availableWeight,
        metadata: pallet.metadata ?? null,
        updatedAt: pallet.updatedAt,
      };
    });

    return {
      success: true,
      data: summaries,
    };
  } catch (error: any) {
    console.error('[getAvailablePalletSummaries] Error:', error);

    if (error?.code === 'ER_BAD_FIELD_ERROR') {
      return {
        success: false,
        error: 'La columna metadata no existe en la tabla pallets. Ejecuta la migración update-pallets-table para sincronizar el esquema.',
      };
    }

    return {
      success: false,
      error: error?.message || 'Error al obtener pallets disponibles',
    };
  }
}

/**
 * GET - Obtener un pallet por ID
 */
export async function getPalletById(id: string | number): Promise<PalletResult> {
  try {
    const palletId = Number(id);
    if (!Number.isInteger(palletId) || palletId < 1) {
      return { success: false, error: 'ID inválido' };
    }

    const db = await getDb();
    const pallet = await db.getRepository(Pallet).findOne({
      where: { id: palletId, deletedAt: IsNull() },
      relations: ['storage', 'tray']
    });

    if (!pallet) {
      return { success: false, error: 'Pallet no encontrado' };
    }

    return {
      success: true,
      data: pallet,
    };
  } catch (error: any) {
    console.error('[getPalletById] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al obtener el pallet',
    };
  }
}

/**
 * GET - Obtener pallets con paginación, filtros y ordenamiento para DataGrid
 */
export async function getPalletsGridData(
  filters?: PalletGridFilters
): Promise<PalletGridResponse> {
  const safeLimit = Math.min(Math.max(5, filters?.limit || 25), 100);

  try {
    const db = await getDb();

    const requestedFields = filters?.fields
      ? filters.fields.split(',').map(field => field.trim()).filter(field => PALLET_VALID_FIELDS.includes(field))
      : PALLET_VALID_FIELDS;

    if (requestedFields.length === 0) {
      requestedFields.push('id');
    }

    const page = Math.max(1, filters?.page || 1);
    const sortOrder = (filters?.sortOrder || 'DESC').toUpperCase() as 'ASC' | 'DESC';
    const sortByRaw = filters?.sortBy && PALLET_VALID_SORT_FIELDS.includes(filters.sortBy)
      ? filters.sortBy
      : 'createdAt';

    let query = db
      .getRepository(Pallet)
      .createQueryBuilder('pallet')
      .leftJoinAndSelect('pallet.storage', 'storage')
      .leftJoinAndSelect('pallet.tray', 'tray')
      .where('pallet.deletedAt IS NULL');

    query = applyPalletFilters(query, filters);

    const total = await query.getCount();

    const sortColumn = sortByRaw === 'storageName'
      ? 'storage.name'
      : sortByRaw === 'trayName'
        ? 'tray.name'
        : `pallet.${sortByRaw}`;

    const data = await query
      .clone()
      .orderBy(sortColumn, sortOrder)
      .skip((page - 1) * safeLimit)
      .take(safeLimit)
      .getMany();

    const serialized = serializePallets(data);

    const shaped = serialized.map((row) => {
      if (!filters?.fields) {
        return row;
      }

      const shapedRow: Record<string, any> = {};
      requestedFields.forEach((field) => {
        shapedRow[field] = (row as Record<string, any>)[field];
      });

      if (!requestedFields.includes('id')) {
        shapedRow.id = row.id;
      }

      // Siempre incluir storageId y trayId para edición
      if (!requestedFields.includes('storageId')) {
        shapedRow.storageId = (row as Record<string, any>).storageId;
      }

      if (!requestedFields.includes('trayId')) {
        shapedRow.trayId = (row as Record<string, any>).trayId;
      }

      if (!requestedFields.includes('storageName')) {
        shapedRow.storageName = (row as Record<string, any>).storageName;
      }

      if (!requestedFields.includes('trayName')) {
        shapedRow.trayName = (row as Record<string, any>).trayName;
      }

      return shapedRow;
    });

    return {
      data: shaped,
      total,
      pages: Math.ceil(total / safeLimit),
      currentPage: page,
      limit: safeLimit,
    };
  } catch (error) {
    console.error('[getPalletsGridData] Error:', error);
    return {
      data: [],
      total: 0,
      pages: 0,
      currentPage: 1,
      limit: safeLimit,
    };
  }
}

/**
 * GET - Obtener pallets para exportar a Excel (máx. 10.000 registros)
 */
export async function getPalletsExportData(filters?: PalletGridFilters): Promise<PalletExportResponse> {
  try {
    const db = await getDb();
    const maxRows = 10000;

    const sortOrder = (filters?.sortOrder || 'DESC').toUpperCase() as 'ASC' | 'DESC';
    const sortByRaw = filters?.sortBy && PALLET_VALID_SORT_FIELDS.includes(filters.sortBy)
      ? filters.sortBy
      : 'createdAt';

    let query = db
      .getRepository(Pallet)
      .createQueryBuilder('pallet')
      .leftJoinAndSelect('pallet.storage', 'storage')
      .leftJoinAndSelect('pallet.tray', 'tray')
      .where('pallet.deletedAt IS NULL');

    query = applyPalletFilters(query, filters);

    const sortColumn = sortByRaw === 'storageName'
      ? 'storage.name'
      : sortByRaw === 'trayName'
        ? 'tray.name'
        : `pallet.${sortByRaw}`;

    const rows = await query
      .orderBy(sortColumn, sortOrder)
      .take(maxRows + 1)
      .getMany();

    if (rows.length > maxRows) {
      return {
        success: false,
        error: `Total de registros (${rows.length}) excede el límite permitido de ${maxRows}. Refina los filtros antes de exportar.`,
      };
    }

    const serialized = serializePallets(rows);

    return {
      success: true,
      data: serialized,
      recordCount: serialized.length,
    };
  } catch (error) {
    console.error('[getPalletsExportData] Error:', error);
    return {
      success: false,
      error: `Error al obtener pallets para exportación: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * CREATE - Crear un nuevo pallet
 */
export async function createPallet(data: CreatePalletInput, auditUserId?: string): Promise<PalletResult> {
  try {
    // Validaciones
    if (!data.storageId || data.storageId.trim() === '') {
      return { success: false, error: 'El storageId es requerido' };
    }

    if (!data.trayId || data.trayId.trim() === '') {
      return { success: false, error: 'El trayId es requerido' };
    }

    const traysQuantity = data.traysQuantity ?? 0;
    if (traysQuantity < 0) {
      return { success: false, error: 'La cantidad de bandejas no puede ser negativa' };
    }

    if (data.capacity === undefined || data.capacity < 1) {
      return { success: false, error: 'La capacidad debe ser mayor a 0' };
    }

    if (data.weight === undefined || data.weight < 0) {
      return { success: false, error: 'El peso inicial debe ser un número positivo' };
    }

    if (data.dispatchWeight === undefined || data.dispatchWeight < 0) {
      return { success: false, error: 'El peso de despacho debe ser un número positivo' };
    }

    if (traysQuantity > data.capacity) {
      return { success: false, error: 'La cantidad de bandejas no puede exceder la capacidad' };
    }

    const db = await getDb();

    // Verificar que existan las entidades relacionadas
    const storage = await db.getRepository(Storage).findOne({
      where: { id: data.storageId, deletedAt: IsNull() }
    });

    if (!storage) {
      return { success: false, error: 'Storage no encontrado' };
    }

    const tray = await db.getRepository(Tray).findOne({
      where: { id: data.trayId, deletedAt: IsNull() }
    });

    if (!tray) {
      return { success: false, error: 'Tray no encontrado' };
    }

    // Obtener userId para auditoría si no se proporcionó
    let userId = auditUserId;
    if (!userId) {
      try {
        const { userId: sessionUserId } = await getCurrentUserSession();
        userId = sessionUserId;
      } catch (error) {
        console.warn('[createPallet] No se pudo obtener la sesión del usuario para auditoría');
      }
    }

    const palletData = {
      storageId: data.storageId,
      trayId: data.trayId,
      traysQuantity,
      capacity: data.capacity,
      weight: data.weight,
      dispatchWeight: data.dispatchWeight,
      packsNetWeight: 0,
      status: data.status || PalletStatus.AVAILABLE,
      metadata: data.metadata ?? null,
    };

    const result = await db.transaction(async (manager) => {
      const pallet = manager.create(Pallet, palletData);
      const savedPallet = await manager.save(Pallet, pallet);

      // Registrar auditoría
      await logPalletAudit(
        manager,
        savedPallet.id,
        AuditActionType.CREATE,
        userId,
        undefined,
        palletData
      );

      return savedPallet;
    });

    try {
      revalidatePath('/home/storage/pallets');
    } catch (revalidateError) {
      console.warn('[createPallet] No se pudo ejecutar revalidatePath:', revalidateError);
    }

    return {
      success: true,
      message: 'Pallet creado exitosamente',
      data: result ? serializePallet(result) : null,
    };
  } catch (error: any) {
    console.error('[createPallet] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al crear el pallet',
    };
  }
}

/**
 * UPDATE - Actualizar un pallet existente
 */
export async function updatePallet(data: UpdatePalletInput, auditUserId?: string): Promise<PalletResult> {
  try {
    const palletId = Number(data.id);
    if (!Number.isInteger(palletId) || palletId < 1) {
      return { success: false, error: 'ID inválido' };
    }

    const db = await getDb();

    // Obtener el pallet actual
    const existingPallet = await db.getRepository(Pallet).findOne({
      where: { id: palletId, deletedAt: IsNull() }
    });

    if (!existingPallet) {
      return { success: false, error: 'Pallet no encontrado' };
    }

    // Validaciones y actualizaciones
    const updates: Partial<Pallet> = {};

    if (data.storageId !== undefined) {
      if (!data.storageId.trim()) {
        return { success: false, error: 'El storageId es requerido' };
      }

      // Verificar que el storage existe
      const storage = await db.getRepository(Storage).findOne({
        where: { id: data.storageId, deletedAt: IsNull() }
      });

      if (!storage) {
        return { success: false, error: 'Storage no encontrado' };
      }

      updates.storageId = data.storageId;
    }

    if (data.trayId !== undefined) {
      if (!data.trayId.trim()) {
        return { success: false, error: 'El trayId es requerido' };
      }

      // Verificar que el tray existe
      const tray = await db.getRepository(Tray).findOne({
        where: { id: data.trayId, deletedAt: IsNull() }
      });

      if (!tray) {
        return { success: false, error: 'Tray no encontrado' };
      }

      updates.trayId = data.trayId;
    }

    if (data.traysQuantity !== undefined) {
      if (data.traysQuantity < 0) {
        return { success: false, error: 'La cantidad de bandejas no puede ser negativa' };
      }
      updates.traysQuantity = data.traysQuantity;
    }

    if (data.capacity !== undefined) {
      if (data.capacity < 1) {
        return { success: false, error: 'La capacidad debe ser mayor a 0' };
      }
      updates.capacity = data.capacity;
    }

    if (data.weight !== undefined) {
      if (data.weight < 0) {
        return { success: false, error: 'El peso inicial debe ser un número positivo' };
      }
      updates.weight = data.weight;
    }

    if (data.dispatchWeight !== undefined) {
      if (data.dispatchWeight < 0) {
        return { success: false, error: 'El peso de despacho debe ser un número positivo' };
      }
      updates.dispatchWeight = data.dispatchWeight;
    }

    if (data.status !== undefined) {
      updates.status = data.status;
    }

    if (data.metadata !== undefined) {
      updates.metadata = data.metadata ?? null;
    }

    // Verificar que haya cambios
    const nextTraysQuantity = updates.traysQuantity ?? existingPallet.traysQuantity;
    const nextCapacity = updates.capacity ?? existingPallet.capacity;
    if (nextTraysQuantity > nextCapacity) {
      return { success: false, error: 'La cantidad de bandejas no puede exceder la capacidad' };
    }

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
        console.warn('[updatePallet] No se pudo obtener la sesión del usuario para auditoría');
      }
    }

    const oldValues = {
      storageId: existingPallet.storageId,
      trayId: existingPallet.trayId,
      traysQuantity: existingPallet.traysQuantity,
      capacity: existingPallet.capacity,
      weight: existingPallet.weight,
      dispatchWeight: existingPallet.dispatchWeight,
      status: existingPallet.status,
      metadata: existingPallet.metadata ?? null,
    };

    const result = await db.transaction(async (manager) => {
      await manager.update(Pallet, palletId, updates);

      if (updates.metadata !== undefined) {
        await syncPalletsPacksNetWeight(manager, [palletId]);
      }

      const updatedPallet = await manager.findOne(Pallet, {
        where: { id: palletId },
        relations: ['storage', 'tray']
      });

      // Registrar auditoría
      await logPalletAudit(
        manager,
        palletId,
        AuditActionType.UPDATE,
        userId,
        oldValues,
        updates
      );

      return updatedPallet;
    });

    try {
      revalidatePath('/home/storage/pallets');
    } catch (revalidateError) {
      console.warn('[updatePallet] No se pudo ejecutar revalidatePath:', revalidateError);
    }

    return {
      success: true,
      message: 'Pallet actualizado exitosamente',
      data: result ? serializePallet(result) : null,
    };
  } catch (error: any) {
    console.error('[updatePallet] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al actualizar el pallet',
    };
  }
}

/**
 * DELETE - Eliminar un pallet (soft delete)
 */
export async function deletePallet(id: string | number, auditUserId?: string): Promise<PalletResult> {
  try {
    const palletId = Number(id);
    if (!Number.isInteger(palletId) || palletId < 1) {
      return { success: false, error: 'ID inválido' };
    }

    const db = await getDb();

    // Obtener el pallet actual
    const existingPallet = await db.getRepository(Pallet).findOne({
      where: { id: palletId, deletedAt: IsNull() }
    });

    if (!existingPallet) {
      return { success: false, error: 'Pallet no encontrado' };
    }

    // Obtener userId para auditoría si no se proporcionó
    let userId = auditUserId;
    if (!userId) {
      try {
        const { userId: sessionUserId } = await getCurrentUserSession();
        userId = sessionUserId;
      } catch (error) {
        console.warn('[deletePallet] No se pudo obtener la sesión del usuario para auditoría');
      }
    }

    const oldValues = {
      storageId: existingPallet.storageId,
      trayId: existingPallet.trayId,
      traysQuantity: existingPallet.traysQuantity,
      capacity: existingPallet.capacity,
      weight: existingPallet.weight,
      dispatchWeight: existingPallet.dispatchWeight,
      status: existingPallet.status,
      metadata: existingPallet.metadata ?? null,
    };

    const result = await db.transaction(async (manager) => {
      // Soft delete
      await manager.update(Pallet, palletId, {
        deletedAt: new Date(),
      });

      // Registrar auditoría
      await logPalletAudit(
        manager,
        palletId,
        AuditActionType.DELETE,
        userId,
        oldValues,
        undefined
      );

      return existingPallet;
    });

    try {
      revalidatePath('/home/storage/pallets');
    } catch (revalidateError) {
      console.warn('[deletePallet] No se pudo ejecutar revalidatePath:', revalidateError);
    }

    return {
      success: true,
      message: 'Pallet eliminado exitosamente',
      data: result ? serializePallet(result) : null,
    };
  } catch (error: any) {
    console.error('[deletePallet] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al eliminar el pallet',
    };
  }
}
/**
 * Obtiene una lista simple de pallets
 */
export async function getPalletsSimpleList() {
  try {
    const db = await getDb();
    const palletRepository = db.getRepository(Pallet);

    const pallets = await palletRepository.find({
      where: { deletedAt: IsNull() },
      relations: ['tray', 'storage'],
      order: { createdAt: 'DESC' },
    });

    return serializePallets(pallets);
  } catch (error) {
    console.error("Error obteniendo lista de pallets:", error);
    throw error;
  }
}

// ============================================
// INTERFACES PARA TRANSFERENCIA DE BANDEJAS
// ============================================

export interface TransferTrayItem {
  receptionPackId: string;
  trayId: string;
  quantity: number;
}

export interface TransferTraysInput {
  sourcePalletId: number;
  targetPalletId: number;
  traysToTransfer: TransferTrayItem[];
  notes?: string;
}

export interface TransferTraysResult {
  success: boolean;
  message?: string;
  error?: string;
  sourcePallet?: any;
  targetPallet?: any;
}

// ============================================
// INTERFACES PARA DETALLE DE PALLET
// ============================================

export interface PalletPackDetail {
  receptionPackId: string;
  trayId: string;
  trayName: string | null;
  quantity: number;
  varietyName: string;
  formatName: string;
  producerName: string | null;
  productiveUnitName: string | null;
  netWeight: number;
}

export interface PalletDetailResult {
  success: boolean;
  data?: {
    id: number;
    storageName: string | null;
    trayName: string | null;
    traysQuantity: number;
    capacity: number;
    status: string;
    packs: PalletPackDetail[];
  };
  error?: string;
}

/**
 * Obtiene el detalle completo de un pallet con información de packs,
 * productores y unidades productivas
 */
export async function getPalletDetail(palletId: number): Promise<PalletDetailResult> {
  try {
    const db = await getDb();
    
    // Obtener el pallet
    const pallet = await db.getRepository(Pallet).findOne({
      where: { id: palletId, deletedAt: IsNull() },
      relations: ['storage', 'tray'],
    });

    if (!pallet) {
      return { success: false, error: 'Pallet no encontrado' };
    }

    const metadata = pallet.metadata ?? [];
    const packs: PalletPackDetail[] = [];

    if (metadata.length > 0) {
      // Obtener todos los receptionPackIds únicos
      const packIds = [...new Set(metadata.map(m => m.receptionPackId))];
      
      // Buscar los ReceptionPacks con sus transacciones y productores
      const receptionPacks = await db.query(`
        SELECT 
          rp.id,
          rp.varietyName,
          rp.formatName,
          rp.trayId,
          rp.trayLabel,
          rp.traysQuantity,
          rp.netWeight,
          t.producerId,
          p.name as producerName,
          p.productiveUnitId,
          pu.name as productiveUnitName
        FROM reception_packs rp
        LEFT JOIN transactions t ON rp.receptionTransactionId = t.id
        LEFT JOIN producers p ON t.producerId = p.id
        LEFT JOIN productive_units pu ON p.productiveUnitId = pu.id
        WHERE rp.id IN (?)
      `, [packIds]);

      // Crear mapa de packs
      const packMap = new Map<string, any>();
      for (const rp of receptionPacks) {
        packMap.set(String(rp.id), rp);
      }

      // Obtener nombres de bandejas
      const trayIds = [...new Set(metadata.map(m => m.trayId))];
      const trays = await db.getRepository(Tray).find({
        where: trayIds.map(id => ({ id })),
      });
      const trayMap = new Map<string, string>();
      for (const tray of trays) {
        trayMap.set(tray.id, tray.name);
      }

      // Construir el array de packs con detalle
      for (const assignment of metadata) {
        const packInfo = packMap.get(String(assignment.receptionPackId));
        const packNet = Number(packInfo?.netWeight) || 0;
        const packTrays = Number(packInfo?.traysQuantity) || 0;
        const assigned = Number(assignment.quantity) || 0;
        // Prorratear neto del pack por bandejas presentes en este pallet
        const netWeight =
          packTrays > 0
            ? Number(((packNet * assigned) / packTrays).toFixed(3))
            : 0;

        packs.push({
          receptionPackId: assignment.receptionPackId,
          trayId: assignment.trayId,
          trayName: trayMap.get(assignment.trayId) ?? packInfo?.trayLabel ?? null,
          quantity: assignment.quantity,
          varietyName: packInfo?.varietyName ?? 'Desconocida',
          formatName: packInfo?.formatName ?? 'Desconocido',
          producerName: packInfo?.producerName ?? null,
          productiveUnitName: packInfo?.productiveUnitName ?? null,
          netWeight,
        });
      }
    }

    return {
      success: true,
      data: {
        id: pallet.id,
        storageName: pallet.storage?.name ?? null,
        trayName: pallet.tray?.name ?? null,
        traysQuantity: pallet.traysQuantity,
        capacity: pallet.capacity,
        status: pallet.status,
        packs,
      },
    };
  } catch (error: any) {
    console.error('[getPalletDetail] Error:', error);
    return { success: false, error: error?.message || 'Error al obtener detalle del pallet' };
  }
}

/**
 * Obtiene los pallets disponibles para transferencia (que tienen bandejas)
 * Excluye pallets DISPATCHED
 */
export async function getAvailablePalletsForTransfer(excludePalletId?: number): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> {
  try {
    const db = await getDb();
    const palletRepo = db.getRepository(Pallet);

    let query = palletRepo.createQueryBuilder('pallet')
      .leftJoinAndSelect('pallet.storage', 'storage')
      .leftJoinAndSelect('pallet.tray', 'tray')
      .where('pallet.deletedAt IS NULL')
      .andWhere('pallet.status != :dispatchedStatus', { dispatchedStatus: PalletStatus.DISPATCHED });

    if (excludePalletId) {
      query = query.andWhere('pallet.id != :excludeId', { excludeId: excludePalletId });
    }

    const pallets = await query.orderBy('pallet.id', 'ASC').getMany();

    // Enrich metadata with reception information
    const enrichedPallets = await Promise.all(pallets.map(async (p) => {
      const metadata = p.metadata ?? [];
      if (metadata.length === 0) {
        return p;
      }

      // Get unique reception pack IDs
      const packIds = [...new Set(metadata.map((m: any) => m.receptionPackId))];

      // Query reception information
      const receptionPackRepo = db.getRepository('reception_packs');
      const receptionPacks = await receptionPackRepo.createQueryBuilder('rp')
        .leftJoinAndSelect('rp.receptionTransaction', 'rt')
        .where('rp.id IN (:...packIds)', { packIds })
        .getMany();

      // Create a map of packId to reception info
      const packMap = new Map();
      receptionPacks.forEach((pack: any) => {
        const receptionNote = pack.receptionTransaction?.metadata?.receptionNote;
        const receptionId = pack.receptionTransaction?.id;
        packMap.set(String(pack.id), {
          receptionId: receptionId ? String(receptionId) : undefined,
          receptionNote: receptionNote || undefined,
        });
      });

      // Enrich metadata
      const enrichedMetadata = metadata.map((assignment: any) => ({
        ...assignment,
        receptionId: packMap.get(assignment.receptionPackId)?.receptionId,
        receptionNote: packMap.get(assignment.receptionPackId)?.receptionNote,
      }));

      return {
        ...p,
        metadata: enrichedMetadata,
      };
    }));

    const serializedPallets = enrichedPallets.map(p => ({
      id: p.id,
      storageId: p.storageId,
      storageName: p.storage?.name ?? null,
      trayId: p.trayId,
      trayName: p.tray?.name ?? null,
      traysQuantity: p.traysQuantity,
      capacity: p.capacity,
      availableSpace: p.capacity - p.traysQuantity,
      status: p.status,
      metadata: p.metadata ?? [],
    }));

    return { success: true, data: serializedPallets };
  } catch (error: any) {
    console.error('[getAvailablePalletsForTransfer] Error:', error);
    return { success: false, error: error?.message || 'Error al obtener pallets' };
  }
}

/**
 * Transferir bandejas de un pallet origen a un pallet destino
 * Soporta transferencia parcial por pack
 */
export async function transferTraysBetweenPallets(
  input: TransferTraysInput,
  auditUserId?: string
): Promise<TransferTraysResult> {
  try {
    const { sourcePalletId, targetPalletId, traysToTransfer, notes } = input;

    // Validaciones básicas
    if (!sourcePalletId || !targetPalletId) {
      return { success: false, error: 'Debes seleccionar pallet origen y destino' };
    }

    if (sourcePalletId === targetPalletId) {
      return { success: false, error: 'El pallet origen y destino deben ser diferentes' };
    }

    if (!traysToTransfer || traysToTransfer.length === 0) {
      return { success: false, error: 'Debes seleccionar al menos un pack para transferir' };
    }

    const totalToTransfer = traysToTransfer.reduce((sum, item) => sum + item.quantity, 0);
    if (totalToTransfer <= 0) {
      return { success: false, error: 'La cantidad total a transferir debe ser mayor a 0' };
    }

    const db = await getDb();

    // Obtener temporada activa
    const activeSeasonResult = await getActiveSeason();
    if (!activeSeasonResult.success || !activeSeasonResult.data) {
      return { success: false, error: 'No hay temporada activa configurada' };
    }
    const seasonId = (activeSeasonResult.data as any).id;

    // Obtener userId para auditoría
    let userId = auditUserId;
    if (!userId) {
      try {
        const { userId: sessionUserId } = await getCurrentUserSession();
        userId = sessionUserId;
      } catch (error) {
        console.warn('[transferTraysBetweenPallets] No se pudo obtener la sesión del usuario');
      }
    }

    const result = await db.transaction(async (manager) => {
      // Obtener pallet origen
      const sourcePallet = await manager.findOne(Pallet, {
        where: { id: sourcePalletId, deletedAt: IsNull() },
        relations: ['storage', 'tray'],
      });

      if (!sourcePallet) {
        throw new Error('Pallet origen no encontrado');
      }

      if (sourcePallet.status === PalletStatus.DISPATCHED) {
        throw new Error('No se puede transferir desde un pallet despachado');
      }

      // Obtener pallet destino
      const targetPallet = await manager.findOne(Pallet, {
        where: { id: targetPalletId, deletedAt: IsNull() },
        relations: ['storage', 'tray'],
      });

      if (!targetPallet) {
        throw new Error('Pallet destino no encontrado');
      }

      if (targetPallet.status === PalletStatus.DISPATCHED) {
        throw new Error('No se puede transferir a un pallet despachado');
      }

      // Verificar espacio en pallet destino
      const availableSpace = targetPallet.capacity - targetPallet.traysQuantity;
      if (totalToTransfer > availableSpace) {
        throw new Error(`El pallet destino solo tiene espacio para ${availableSpace} bandejas, pero intentas transferir ${totalToTransfer}`);
      }

      // Obtener metadata de ambos pallets
      const sourceMetadata: PalletTrayAssignment[] = Array.isArray(sourcePallet.metadata) 
        ? [...sourcePallet.metadata] 
        : [];
      const targetMetadata: PalletTrayAssignment[] = Array.isArray(targetPallet.metadata) 
        ? [...targetPallet.metadata] 
        : [];

      // Procesar cada transferencia
      for (const transfer of traysToTransfer) {
        const { receptionPackId, trayId, quantity } = transfer;

        if (quantity <= 0) continue;

        // Buscar el pack en el origen
        const sourceIndex = sourceMetadata.findIndex(
          m => m.receptionPackId === receptionPackId && m.trayId === trayId
        );

        if (sourceIndex === -1) {
          throw new Error(`Pack ${receptionPackId} no encontrado en el pallet origen`);
        }

        const sourceAssignment = sourceMetadata[sourceIndex];
        if (quantity > sourceAssignment.quantity) {
          throw new Error(`Intentas transferir ${quantity} bandejas del pack ${receptionPackId}, pero solo hay ${sourceAssignment.quantity} disponibles`);
        }

        // Reducir cantidad en origen
        if (quantity === sourceAssignment.quantity) {
          // Remover completamente el assignment
          sourceMetadata.splice(sourceIndex, 1);
        } else {
          // Reducir parcialmente
          sourceMetadata[sourceIndex] = {
            ...sourceAssignment,
            quantity: sourceAssignment.quantity - quantity,
          };
        }

        // Agregar al destino
        const targetIndex = targetMetadata.findIndex(
          m => m.receptionPackId === receptionPackId && m.trayId === trayId
        );

        if (targetIndex === -1) {
          // Crear nuevo assignment
          targetMetadata.push({
            receptionPackId,
            trayId,
            quantity,
            receptionId: sourceAssignment.receptionId,
            receptionNote: sourceAssignment.receptionNote,
          });
        } else {
          // Incrementar existente
          targetMetadata[targetIndex] = {
            ...targetMetadata[targetIndex],
            quantity: targetMetadata[targetIndex].quantity + quantity,
          };
        }
      }

      // Guardar valores anteriores para auditoría
      const sourceOldValues = {
        traysQuantity: sourcePallet.traysQuantity,
        metadata: sourcePallet.metadata,
        status: sourcePallet.status,
      };
      const targetOldValues = {
        traysQuantity: targetPallet.traysQuantity,
        metadata: targetPallet.metadata,
        status: targetPallet.status,
      };

      // Actualizar pallet origen
      const newSourceTraysQuantity = sourcePallet.traysQuantity - totalToTransfer;
      const sourceStatus = newSourceTraysQuantity === 0 
        ? PalletStatus.AVAILABLE 
        : (newSourceTraysQuantity >= sourcePallet.capacity ? PalletStatus.FULL : sourcePallet.status);

      await manager.update(Pallet, sourcePalletId, {
        traysQuantity: newSourceTraysQuantity,
        metadata: sourceMetadata.length > 0 ? sourceMetadata : null,
        status: sourceStatus,
      });

      // Actualizar pallet destino
      const newTargetTraysQuantity = targetPallet.traysQuantity + totalToTransfer;
      const targetStatus = newTargetTraysQuantity >= targetPallet.capacity 
        ? PalletStatus.FULL 
        : PalletStatus.AVAILABLE;

      await manager.update(Pallet, targetPalletId, {
        traysQuantity: newTargetTraysQuantity,
        metadata: targetMetadata,
        status: targetStatus,
      });

      await syncPalletsPacksNetWeight(manager, [sourcePalletId, targetPalletId]);

      // Crear transacción de auditoría
      const transactionMetadata: PalletTrayTransferMetadata = {
        sourcePalletId,
        targetPalletId,
        sourcePalletStorageName: sourcePallet.storage?.name ?? null,
        targetPalletStorageName: targetPallet.storage?.name ?? null,
        transfers: traysToTransfer,
        totalTransferred: totalToTransfer,
        notes: notes ?? null,
        performedBy: userId,
        performedAt: moment().tz(APP_TIMEZONE).toISOString(),
      };

      await ensureTransactionTypeEnum(manager);

      const transaction = manager.create(Transaction, {
        type: TransactionType.PALLET_TRAY_TRANSFER,
        direction: TransactionDirection.OUT,
        amount: totalToTransfer,
        unit: TransactionUnit.TRAY,
        seasonId: seasonId,
        userId: userId || '',
        metadata: transactionMetadata,
      });
      await manager.save(Transaction, transaction);

      // Registrar auditorías
      await logPalletAudit(
        manager,
        sourcePalletId,
        AuditActionType.UPDATE,
        userId,
        sourceOldValues,
        {
          traysQuantity: newSourceTraysQuantity,
          metadata: sourceMetadata,
          status: sourceStatus,
          action: 'TRANSFER_OUT',
          targetPalletId,
          transferredQuantity: totalToTransfer,
        }
      );

      await logPalletAudit(
        manager,
        targetPalletId,
        AuditActionType.UPDATE,
        userId,
        targetOldValues,
        {
          traysQuantity: newTargetTraysQuantity,
          metadata: targetMetadata,
          status: targetStatus,
          action: 'TRANSFER_IN',
          sourcePalletId,
          receivedQuantity: totalToTransfer,
        }
      );

      // Obtener pallets actualizados
      const updatedSourcePallet = await manager.findOne(Pallet, {
        where: { id: sourcePalletId },
        relations: ['storage', 'tray'],
      });
      const updatedTargetPallet = await manager.findOne(Pallet, {
        where: { id: targetPalletId },
        relations: ['storage', 'tray'],
      });

      return {
        sourcePallet: updatedSourcePallet ? serializePallet(updatedSourcePallet) : null,
        targetPallet: updatedTargetPallet ? serializePallet(updatedTargetPallet) : null,
      };
    });

    try {
      revalidatePath('/home/storage/pallets');
    } catch (revalidateError) {
      console.warn('[transferTraysBetweenPallets] No se pudo ejecutar revalidatePath:', revalidateError);
    }

    return {
      success: true,
      message: `Se transfirieron ${totalToTransfer} bandejas exitosamente`,
      sourcePallet: result.sourcePallet,
      targetPallet: result.targetPallet,
    };
  } catch (error: any) {
    console.error('[transferTraysBetweenPallets] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al transferir bandejas',
    };
  }
}

// ============================================
// INTERFACES PARA DESPACHO DE PALLETS
// ============================================

export interface PalletForDispatch {
  id: number;
  storageName: string | null;
  trayId: string | null;
  trayName: string | null;
  trayWeight: number;
  traysQuantity: number;
  capacity: number;
  status: string;
  weight: number;
  varietyName: string | null;
  formatName: string | null;
  estimatedNetWeight: number;
}

export interface GetPalletsForDispatchFilters {
  varietyId?: number | null;
  formatId?: number | null;
  search?: string;
}

export interface GetPalletsForDispatchResult {
  success: boolean;
  data?: PalletForDispatch[];
  error?: string;
}

/**
 * Obtiene los pallets disponibles para despacho con toda su información
 * Filtra pallets que tienen bandejas y no están despachados
 */
export async function getPalletsForDispatch(
  filters?: GetPalletsForDispatchFilters
): Promise<GetPalletsForDispatchResult> {
  try {
    const db = await getDb();
    
    let query = db.getRepository(Pallet)
      .createQueryBuilder('pallet')
      .leftJoinAndSelect('pallet.storage', 'storage')
      .leftJoinAndSelect('pallet.tray', 'tray')
      .leftJoinAndSelect('pallet.variety', 'variety')
      .leftJoinAndSelect('pallet.format', 'format')
      .where('pallet.deletedAt IS NULL')
      .andWhere('pallet.status != :dispatchedStatus', { dispatchedStatus: PalletStatus.DISPATCHED })
      .andWhere('pallet.traysQuantity > 0');

    // Filtrar por variedad si se especifica
    if (filters?.varietyId) {
      query = query.andWhere('pallet.varietyId = :varietyId', { varietyId: filters.varietyId });
    }

    // Filtrar por formato si se especifica
    if (filters?.formatId) {
      query = query.andWhere('pallet.formatId = :formatId', { formatId: filters.formatId });
    }

    // Búsqueda por ID o nombre de storage
    if (filters?.search) {
      query = query.andWhere(
        new Brackets(qb => {
          qb.where('CAST(pallet.id AS CHAR) LIKE :search', { search: `%${filters.search}%` })
            .orWhere('storage.name LIKE :search', { search: `%${filters.search}%` });
        })
      );
    }

    query = query.orderBy('pallet.id', 'DESC');

    const pallets = await query.getMany();

    // Procesar cada pallet para calcular peso neto estimado
    const palletsForDispatch: PalletForDispatch[] = pallets.map(pallet => {
      const trayWeight = pallet.tray?.weight ?? 0;
      const traysWeight = trayWeight * pallet.traysQuantity;
      // Peso neto estimado = peso total guardado - peso de bandejas
      // Si no hay peso guardado, estimamos basado en metadata
      let estimatedNetWeight = 0;
      
      if (pallet.metadata && Array.isArray(pallet.metadata)) {
        // Sumar cantidades de todas las asignaciones
        estimatedNetWeight = pallet.metadata.reduce((sum, assignment) => {
          return sum + (assignment.quantity || 0);
        }, 0);
        // Esto es cantidad de bandejas, no peso. Necesitamos calcular diferente
        // Por ahora usamos el peso del pallet si existe
      }
      
      // Usar el peso registrado del pallet
      const palletWeight = Number(pallet.weight) || 0;
      
      return {
        id: pallet.id,
        storageName: pallet.storage?.name ?? null,
        trayId: pallet.trayId ?? null,
        trayName: pallet.tray?.name ?? null,
        trayWeight: Number(trayWeight),
        traysQuantity: pallet.traysQuantity,
        capacity: pallet.capacity,
        status: pallet.status,
        weight: palletWeight,
        varietyName: pallet.variety?.name ?? null,
        formatName: pallet.format?.name ?? null,
        estimatedNetWeight: Math.max(0, palletWeight - traysWeight),
      };
    });

    return {
      success: true,
      data: palletsForDispatch,
    };
  } catch (error: any) {
    console.error('[getPalletsForDispatch] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al obtener pallets para despacho',
    };
  }
}

// ============================================
// CERRAR PALLET
// ============================================

export interface ClosePalletResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

/**
 * Cierra un pallet, impidiendo que se puedan agregar más bandejas.
 * Solo se pueden cerrar pallets con estado AVAILABLE o FULL.
 */
export async function closePallet(palletId: number): Promise<ClosePalletResult> {
  try {
    const { userId } = await getCurrentUserSession();
    
    if (!userId) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    const db = await getDb();
    const palletRepo = db.getRepository(Pallet);
    
    const pallet = await palletRepo.findOne({
      where: { id: palletId, deletedAt: IsNull() },
    });

    if (!pallet) {
      return { success: false, error: 'Pallet no encontrado' };
    }

    // Validar que el pallet no esté ya cerrado o despachado
    if (pallet.status === PalletStatus.CLOSED) {
      return { success: false, error: 'El pallet ya está cerrado' };
    }

    if (pallet.status === PalletStatus.DISPATCHED) {
      return { success: false, error: 'No se puede cerrar un pallet despachado' };
    }

    // Actualizar estado a CLOSED
    await palletRepo.update(palletId, { status: PalletStatus.CLOSED });

    // Registrar auditoría
    const auditRepo = db.getRepository(Audit);
    await auditRepo.save({
      entityName: 'Pallet',
      entityId: String(palletId),
      action: AuditActionType.UPDATE,
      newValues: { status: PalletStatus.CLOSED },
      oldValues: { status: pallet.status },
      userId,
    });

    try {
      revalidatePath('/home/storage/pallets');
    } catch (revalidateError) {
      console.warn('[closePallet] No se pudo ejecutar revalidatePath:', revalidateError);
    }

    return {
      success: true,
      message: 'Pallet cerrado exitosamente',
    };
  } catch (error: any) {
    console.error('[closePallet] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al cerrar el pallet',
    };
  }
}
