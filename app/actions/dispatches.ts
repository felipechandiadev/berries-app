'use server';

import { revalidatePath } from 'next/cache';
import { Brackets, SelectQueryBuilder } from 'typeorm';
import { getDb } from '@/data/db';
import { Transaction, TransactionType, TransactionDirection, TransactionUnit, type DispatchMetadata } from '@/data/entities/Transaction';
import { Pallet, PalletStatus } from '@/data/entities/Pallet';
import { createTransaction, logTransactionAudit, type TransactionResult } from './transactions';
import { getCustomerById } from './customers';
import { getVarietyById } from './varieties';
import { getFormatById } from './formats';
import { getCurrentUserSession } from './auth.server';
import { AuditActionType } from '@/data/entities/audit.types';

type DispatchPalletInput = {
  palletId?: number;
  trayId: string | null;
  trayLabel?: string | null;
  trayWeight?: number;
  trayCount: number;
  palletWeight: number;
  grossWeight: number;
  netWeight?: number;
};

export interface CreateDispatchPayload {
  clientId: string;
  varietyId?: number;
  formatId?: number;
  pricePerKg: number;
  pallets: DispatchPalletInput[];
  notes?: string;
}

const DISPATCH_VALID_FIELDS = [
  'id',
  'clientId',
  'clientName',
  'clientRut',
  'varietyName',
  'palletsCount',
  'totalNetWeight',
  'pricePerKg',
  'totalAmount',
  'currency',
  'operatorId',
  'operatorName',
  'createdAt',
];

const DISPATCH_VALID_SORT_FIELDS = [
  'createdAt',
  'totalAmount',
  'totalNetWeight',
  'pricePerKg',
  'clientName',
  'clientRut',
];

function getDispatchSortColumn(sortBy: string): string {
  switch (sortBy) {
    case 'clientName':
      return 'person.name';
    case 'clientRut':
      return 'person.dni';
    case 'totalAmount':
      return 'transaction.amount';
    case 'totalNetWeight':
      return "CAST(JSON_UNQUOTE(JSON_EXTRACT(transaction.metadata, '$.sale.totalNetWeight')) AS DECIMAL(12,4))";
    case 'pricePerKg':
      return "CAST(JSON_UNQUOTE(JSON_EXTRACT(transaction.metadata, '$.sale.pricePerKg')) AS DECIMAL(12,4))";
    case 'createdAt':
    default:
      return 'transaction.createdAt';
  }
}

function normalizeString(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n');
}

function parseColumnFilters(filtersString: string, allowedFields: string[]): Array<{ column: string; value: string }> {
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

export interface DispatchGridFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  filters?: string;
  filtration?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export interface DispatchGridRow {
  id: string;
  clientId?: string | null;
  clientName: string;
  clientRut?: string | null;
  varietyName?: string | null;
  formatName?: string | null;
  palletsCount: number;
  totalNetWeight: number;
  pricePerKg: number;
  totalAmount: number;
  currency: 'CLP' | 'USD';
  operatorId?: string;
  operatorName?: string | null;
  createdAt: string;
}

export interface DispatchGridResponse {
  data: DispatchGridRow[];
  total: number;
  pages: number;
  currentPage: number;
  limit: number;
}

function mapTransactionToDispatchRow(transaction: Transaction): DispatchGridRow {
  const metadata = (transaction.metadata as DispatchMetadata | null) ?? undefined;
  const saleInfo = metadata?.sale;
  const palletsInfo = metadata?.pallets ?? [];

  const totalNetWeightFromMetadata = saleInfo?.totalNetWeight ?? palletsInfo.reduce((acc, pallet) => acc + Number(pallet.netWeight ?? 0), 0);
  const pricePerKg = Number(saleInfo?.pricePerKg ?? 0);
  const totalAmount = Number(saleInfo?.totalAmount ?? transaction.amount ?? 0);
  const currency = (saleInfo?.currency ?? 'CLP') as 'CLP' | 'USD';

  const clientName = metadata?.client?.name
    ?? transaction.client?.person?.name
    ?? 'Cliente no registrado';
  const clientRut = metadata?.client?.rut ?? transaction.client?.person?.dni ?? null;

  return {
    id: transaction.id ? String(transaction.id) : 'N/A',
    clientId: transaction.clientId ?? metadata?.client?.id ?? null,
    clientName,
    clientRut,
    varietyName: metadata?.variety?.name ?? null,
    formatName: metadata?.format?.name ?? null,
    palletsCount: palletsInfo.length,
    totalNetWeight: Number(totalNetWeightFromMetadata || 0),
    pricePerKg,
    totalAmount,
    currency,
    operatorId: transaction.userId,
    operatorName: transaction.user?.userName ?? transaction.user?.person?.name ?? null,
    createdAt: transaction.createdAt?.toISOString?.() ?? new Date().toISOString(),
  };
}

function applyDispatchFilters(
  query: SelectQueryBuilder<Transaction>,
  filters?: DispatchGridFilters
) {
  if (!filters?.filtration || !filters.filters) {
    return query;
  }

  const columnFilters = parseColumnFilters(filters.filters, DISPATCH_VALID_FIELDS);

  columnFilters.forEach((filter, index) => {
    const paramName = `dispatchFilter${index}`;
    const normalizedValue = normalizeString(filter.value);
    const plainLowerValue = filter.value.trim().toLowerCase();

    switch (filter.column) {
      case 'clientId':
        query = query.andWhere('transaction.clientId = :' + paramName, { [paramName]: filter.value });
        break;
      case 'clientName':
        query = query.andWhere(`${normalizeColumnSql('person.name')} LIKE :${paramName}`, {
          [paramName]: `%${normalizedValue}%`,
        });
        break;
      case 'clientRut':
        query = query.andWhere(`${normalizeColumnSql('person.dni')} LIKE :${paramName}`, {
          [paramName]: `%${normalizedValue}%`,
        });
        break;
      case 'operatorId':
        query = query.andWhere('transaction.userId = :' + paramName, { [paramName]: filter.value });
        break;
      case 'operatorName':
        query = query.andWhere(`${normalizeColumnSql('user.userName')} LIKE :${paramName}`, {
          [paramName]: `%${normalizedValue}%`,
        });
        break;
      case 'currency':
        query = query.andWhere(`JSON_UNQUOTE(JSON_EXTRACT(transaction.metadata, '$.sale.currency')) = :${paramName}`, {
          [paramName]: filter.value.toUpperCase(),
        });
        break;
      case 'pricePerKg': {
        const numericValue = Number(filter.value);
        if (!Number.isNaN(numericValue)) {
          query = query.andWhere(
            `CAST(JSON_UNQUOTE(JSON_EXTRACT(transaction.metadata, '$.sale.pricePerKg')) AS DECIMAL(12,4)) = :${paramName}`,
            { [paramName]: numericValue },
          );
        }
        break;
      }
      case 'totalAmount': {
        const numericValue = Number(filter.value);
        if (!Number.isNaN(numericValue)) {
          query = query.andWhere(`transaction.amount = :${paramName}`, { [paramName]: numericValue });
        }
        break;
      }
      case 'totalNetWeight': {
        const numericValue = Number(filter.value);
        if (!Number.isNaN(numericValue)) {
          query = query.andWhere(
            `CAST(JSON_UNQUOTE(JSON_EXTRACT(transaction.metadata, '$.sale.totalNetWeight')) AS DECIMAL(12,4)) = :${paramName}`,
            { [paramName]: numericValue },
          );
        }
        break;
      }
      case 'varietyName':
        query = query.andWhere(
          `LOWER(JSON_UNQUOTE(JSON_EXTRACT(transaction.metadata, '$.variety.name'))) LIKE :${paramName}`,
          { [paramName]: `%${plainLowerValue}%` },
        );
        break;
      default:
        break;
    }
  });

  return query;
}

export async function getDispatchesGridData(filters?: DispatchGridFilters): Promise<DispatchGridResponse> {
  const safeLimit = Math.min(Math.max(5, filters?.limit || 25), 100);

  try {
    const db = await getDb();
    const page = Math.max(1, filters?.page || 1);
    const sortOrder = (filters?.sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const sortByRaw = filters?.sortBy && DISPATCH_VALID_SORT_FIELDS.includes(filters.sortBy)
      ? filters.sortBy
      : 'createdAt';
    const sortColumn = getDispatchSortColumn(sortByRaw);

    let query = db
      .getRepository(Transaction)
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.client', 'client')
      .leftJoinAndSelect('client.person', 'person')
      .leftJoinAndSelect('transaction.user', 'user')
      .where('transaction.type = :type', { type: TransactionType.DISPATCH })
      .andWhere('transaction.deletedAt IS NULL');

    if (filters?.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      if (!Number.isNaN(fromDate.getTime())) {
        query = query.andWhere('transaction.createdAt >= :dateFrom', { dateFrom: fromDate });
      }
    }

    if (filters?.dateTo) {
      const toDate = new Date(filters.dateTo);
      if (!Number.isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        query = query.andWhere('transaction.createdAt <= :dateTo', { dateTo: toDate });
      }
    }

    if (filters?.search && filters.search.trim().length > 0) {
      const trimmedSearch = filters.search.trim();
      const normalizedSearch = normalizeString(trimmedSearch);
      const searchNormalizedValue = `%${normalizedSearch}%`;
      const searchPlainValue = `%${trimmedSearch.toLowerCase()}%`;
      const searchRawValue = `%${trimmedSearch}%`;

      query = query.andWhere(new Brackets((qb) => {
        qb.where(`${normalizeColumnSql('person.name')} LIKE :searchNormalized`, { searchNormalized: searchNormalizedValue })
          .orWhere(`${normalizeColumnSql('person.dni')} LIKE :searchNormalized`, { searchNormalized: searchNormalizedValue })
          .orWhere(`${normalizeColumnSql('user.userName')} LIKE :searchNormalized`, { searchNormalized: searchNormalizedValue })
          .orWhere(`LOWER(JSON_UNQUOTE(JSON_EXTRACT(transaction.metadata, '$.variety.name'))) LIKE :searchPlain`, { searchPlain: searchPlainValue })
          .orWhere('CAST(transaction.id AS CHAR) LIKE :searchRaw', { searchRaw: searchRawValue });
      }));
    }

    query = applyDispatchFilters(query, filters);

    const total = await query.getCount();

    const rows = await query
      .clone()
      .orderBy(sortColumn, sortOrder as 'ASC' | 'DESC')
      .skip((page - 1) * safeLimit)
      .take(safeLimit)
      .getMany();

    const data = rows.map(mapTransactionToDispatchRow);

    return {
      data,
      total,
      pages: Math.ceil(total / safeLimit),
      currentPage: page,
      limit: safeLimit,
    };
  } catch (error) {
    console.error('[getDispatchesGridData] Error:', error);
    return {
      data: [],
      total: 0,
      pages: 0,
      currentPage: 1,
      limit: safeLimit,
    };
  }
}

export async function createDispatch(payload: CreateDispatchPayload): Promise<TransactionResult> {
  try {
    const { userId: sessionUserId } = await getCurrentUserSession();

    if (!sessionUserId) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    if (!payload.clientId) {
      return { success: false, error: 'El cliente es obligatorio' };
    }
    if (!payload.pallets?.length) {
      return { success: false, error: 'Debes ingresar al menos un pallet' };
    }
    if (!payload.pricePerKg || payload.pricePerKg <= 0) {
      return { success: false, error: 'El precio de venta debe ser mayor a 0' };
    }

    const customerResult = await getCustomerById(payload.clientId);
    const customerEntity = Array.isArray(customerResult.data)
      ? customerResult.data[0]
      : customerResult.data ?? null;

    if (!customerResult.success || !customerEntity) {
      return { success: false, error: customerResult.error || 'Cliente no encontrado' };
    }

    const varietyResult = payload.varietyId ? await getVarietyById(payload.varietyId) : null;
    if (payload.varietyId && (!varietyResult?.success || !varietyResult.data)) {
      return { success: false, error: varietyResult?.error || 'Variedad no encontrada' };
    }

    const formatResult = payload.formatId ? await getFormatById(payload.formatId) : null;
    if (payload.formatId && (!formatResult?.success || !formatResult.data)) {
      return { success: false, error: formatResult?.error || 'Formato no encontrado' };
    }

    const normalizedPallets = payload.pallets.map((pallet) => {
      const trayWeight = pallet.trayWeight ?? 0;
      const trayMass = trayWeight * (pallet.trayCount ?? 0);
      const computedNet = pallet.netWeight ?? (pallet.grossWeight - pallet.palletWeight - trayMass);
      return {
        palletId: pallet.palletId,
        trayId: pallet.trayId || undefined,
        trayLabel: pallet.trayLabel || undefined,
        trayCount: pallet.trayCount,
        trayWeight: trayWeight || undefined,
        palletWeight: pallet.palletWeight,
        grossWeight: pallet.grossWeight,
        netWeight: Number(Math.max(computedNet, 0).toFixed(2)),
      };
    });

    const totalNetWeight = normalizedPallets.reduce((sum, pallet) => sum + (pallet.netWeight ?? 0), 0);
    if (totalNetWeight <= 0) {
      return { success: false, error: 'El peso neto total debe ser mayor a 0' };
    }

    const totalAmount = Math.round(totalNetWeight * payload.pricePerKg);

    const metadata: DispatchMetadata = {
      client: {
        id: customerEntity.id,
        rut: customerEntity.person?.dni ?? undefined,
        name: customerEntity.person?.name ?? 'Cliente sin nombre',
      },
      variety: payload.varietyId && varietyResult?.data ? {
        id: String(payload.varietyId),
        name: (varietyResult.data as any).name ?? 'Variedad',
      } : undefined,
      format: payload.formatId && formatResult?.data ? {
        id: String(payload.formatId),
        name: (formatResult.data as any).name ?? 'Formato',
      } : undefined,
      pallets: normalizedPallets,
      sale: {
        pricePerKg: payload.pricePerKg,
        currency: 'CLP',
        totalNetWeight: Number(totalNetWeight.toFixed(2)),
        totalAmount,
      },
      notes: payload.notes,
    };

    const response = await createTransaction({
      type: TransactionType.DISPATCH,
      clientId: payload.clientId,
      formatId: payload.formatId,
      direction: TransactionDirection.IN,
      amount: totalAmount,
      unit: TransactionUnit.CLP,
      metadata,
    }, sessionUserId);

    if (response.success) {
      // Actualizar estado y neto de despacho de cada pallet
      const db = await getDb();
      for (const pallet of normalizedPallets) {
        if (pallet.palletId == null) continue;
        await db.getRepository(Pallet).update(pallet.palletId, {
          status: PalletStatus.DISPATCHED,
          dispatchWeight: Number((pallet.netWeight ?? 0).toFixed(3)),
        });
      }
      console.log(`[createDispatch] Updated ${normalizedPallets.filter(p => p.palletId != null).length} pallets to DISPATCHED with dispatchWeight`);
      
      revalidatePath('/home/dispatch/dispatchs');
      revalidatePath('/home/storage/pallets');
    }

    // Serializar para evitar errores de Client Components
    return JSON.parse(JSON.stringify(response, (key, value) => 
      typeof value === 'bigint' ? value.toString() : value
    ));
  } catch (error: any) {
    console.error('[createDispatch] Error:', error);
    return { success: false, error: error?.message || 'No fue posible registrar el despacho' };
  }
}

export async function getDispatchById(id: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const db = await getDb();
    const transaction = await db.getRepository(Transaction).findOne({
      where: { id: BigInt(id), type: TransactionType.DISPATCH },
      relations: ['client', 'client.person', 'user', 'user.person', 'season', 'format'],
    });

    if (!transaction) {
      return { success: false, error: 'Despacho no encontrado' };
    }

    // Serializar para evitar errores de Client Components (BigInt, Date, etc)
    const serializedData = JSON.parse(
      JSON.stringify(transaction, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );

    return { success: true, data: serializedData };
  } catch (error: any) {
    console.error('[getDispatchById] Error:', error);
    return { success: false, error: error?.message || 'Error al obtener el despacho' };
  }
}

export async function updateDispatchPallets(
  dispatchId: string,
  pallets: DispatchPalletInput[]
): Promise<TransactionResult> {
  try {
    const { userId: sessionUserId, userName: sessionUserName } = await getCurrentUserSession();
    if (!sessionUserId) return { success: false, error: 'Usuario no autenticado' };

    const db = await getDb();
    const transaction = await db.getRepository(Transaction).findOne({
      where: { id: BigInt(dispatchId), type: TransactionType.DISPATCH },
    });

    if (!transaction) return { success: false, error: 'Despacho no encontrado' };

    const metadata = (transaction.metadata as DispatchMetadata) || {};
    const oldTotalNetWeight = metadata.sale?.totalNetWeight || 0;
    const oldTotalAmount = metadata.sale?.totalAmount || 0;
    
    const normalizedPallets = pallets.map((pallet) => {
      const trayWeight = pallet.trayWeight ?? 0;
      const trayMass = trayWeight * (pallet.trayCount ?? 0);
      const computedNet = pallet.netWeight ?? (pallet.grossWeight - pallet.palletWeight - trayMass);
      return {
        palletId: pallet.palletId,
        trayId: pallet.trayId || undefined,
        trayLabel: pallet.trayLabel || undefined,
        trayCount: pallet.trayCount,
        trayWeight: trayWeight || undefined,
        palletWeight: pallet.palletWeight,
        grossWeight: pallet.grossWeight,
        netWeight: Number(Math.max(computedNet, 0).toFixed(2)),
      };
    });

    const totalNetWeight = normalizedPallets.reduce((sum, pallet) => sum + (pallet.netWeight ?? 0), 0);
    const pricePerKg = metadata.sale?.pricePerKg || 0;
    const totalAmount = Math.round(totalNetWeight * pricePerKg);

    // Update metadata
    metadata.pallets = normalizedPallets;
    if (metadata.sale) {
      metadata.sale.totalNetWeight = Number(totalNetWeight.toFixed(2));
      metadata.sale.totalAmount = totalAmount;
    }

    // Add history entry
    const historyEntry = {
      date: new Date().toISOString(),
      userId: sessionUserId,
      userName: sessionUserName || 'Usuario',
      action: 'Edición de pallets',
      details: `Se actualizaron los pallets. Peso neto total anterior: ${oldTotalNetWeight}kg, nuevo: ${totalNetWeight}kg. Total venta anterior: $${new Intl.NumberFormat('es-CL').format(oldTotalAmount)}, nuevo: $${new Intl.NumberFormat('es-CL').format(totalAmount)}.`,
    };

    metadata.history = [...(metadata.history || []), historyEntry];

    transaction.metadata = metadata;
    transaction.amount = totalAmount;

    await db.getRepository(Transaction).save(transaction);

    // Persist neto despacho on each pallet entity
    for (const pallet of normalizedPallets) {
      if (pallet.palletId == null) continue;
      await db.getRepository(Pallet).update(pallet.palletId, {
        dispatchWeight: Number((pallet.netWeight ?? 0).toFixed(3)),
      });
    }

    // Registrar auditoría de actualización
    await logTransactionAudit(
      db.manager,
      dispatchId,
      AuditActionType.UPDATE,
      sessionUserId,
      {
        totalNetWeight: oldTotalNetWeight,
        totalAmount: oldTotalAmount,
        palletsCount: (metadata as DispatchMetadata).pallets?.length || 0,
      },
      {
        totalNetWeight: totalNetWeight,
        totalAmount: totalAmount,
        palletsCount: normalizedPallets.length,
      }
    );
    
    revalidatePath('/home/dispatch/dispatchs');
    revalidatePath('/home/storage/pallets');
    
    return { success: true };
  } catch (error: any) {
    console.error('[updateDispatchPallets] Error:', error);
    return { success: false, error: error?.message || 'Error al actualizar los pallets' };
  }
}
