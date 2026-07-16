'use server';

import { getDb } from '../../data/db';
import { Transaction, TransactionType, TransactionDirection, TransactionUnit, AdvanceMetadata, SettlementMetadata } from '../../data/entities/Transaction';
import { TransactionRelation, TransactionRelationType } from '../../data/entities/TransactionRelation';
import { ReceptionPack } from '../../data/entities/ReceptionPack';
import { PersonBankAccount } from '../../data/entities/Person';
import { In } from 'typeorm';
import { revalidatePath } from 'next/cache';
import { logTransactionAudit } from './transactions';
import { logSettlementAudit } from './audit.settlements';
import { updateReceptionExchangeRate } from './receptions';
import { AuditActionType } from '../../data/entities/audit.types';

export interface ListPendingReceptionsInput {
  producerId?: string;
  seasonId?: string;
  page?: number;
  limit?: number;
  includeSettlementId?: string;
}

export interface PendingReceptionRow {
  transactionId: string;
  createdAt: string;
  guideNumber: string | null;
  seasonName: string | null;
  producerName: string | null;
  varieties: string[];
  packCount: number;
  netWeightKg: number;
  totalToPayCLP: number;
  totalToPayUSD: number;
  exchangeRate: number;
  totalCLPToPay: number;
}

export interface PendingReceptionsResult {
  rows: PendingReceptionRow[];
  total: number;
  page: number;
  limit: number;
}
export interface ListPendingAdvancesInput {
  producerId?: string;
  page?: number;
  limit?: number;
  includeSettlementId?: string;
}

export interface PendingAdvanceRow {
  transactionId: string;
  createdAt: string;
  seasonName: string | null;
  operatorName: string | null;
  paymentMethod: string;
  paymentReference: string | null;
  notes: string | null;
  amount: number;
  appliedAmount: number;
  availableAmount: number;
}

export interface PendingAdvancesResult {
  rows: PendingAdvanceRow[];
  total: number;
  page: number;
  limit: number;
  totals: {
    amount: number;
    appliedAmount: number;
    availableAmount: number;
  };
}

export interface ListSettlementsInput {
  producerId?: string;
  seasonId?: string;
  page?: number;
  limit?: number;
}

export interface SettlementRow {
  id: string;
  transactionId: string;
  createdAt: string;
  producerName: string | null;
  seasonName: string | null;
  amount: number;
  receptionsCount: number;
  advancesCount: number;
  status: 'DRAFT' | 'COMPLETED';
}

export interface SettlementsResult {
  rows: SettlementRow[];
  total: number;
  page: number;
  limit: number;
}

const MAX_LIMIT = 100;

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return fallback;
    }

    // Remove any character that is not part of a number representation
    const sanitized = trimmed.replace(/[^0-9,.-]/g, '');
    if (!sanitized) {
      return fallback;
    }

    const commaCount = (sanitized.match(/,/g) ?? []).length;
    const dotCount = (sanitized.match(/\./g) ?? []).length;

    let normalized = sanitized;

    if (commaCount > 0 && dotCount === 0) {
      // Formats like "1.234,56" or "123,45" (comma as decimal)
      normalized = sanitized.replace(/\./g, '').replace(',', '.');
    } else if (commaCount > 0 && dotCount > 0) {
      const lastComma = sanitized.lastIndexOf(',');
      const lastDot = sanitized.lastIndexOf('.');
      if (lastComma > lastDot) {
        // Assume comma as decimal separator, dot as thousands
        normalized = sanitized.replace(/\./g, '').replace(',', '.');
      } else {
        // Assume dot as decimal separator, comma as thousands
        normalized = sanitized.replace(/,/g, '');
      }
    } else {
      // No commas, treat dot (if present) as decimal and remove remaining commas
      normalized = sanitized.replace(/,/g, '');
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
};

const resolveNumberFromKeys = (
  source: Record<string, unknown> | null | undefined,
  keys: string[],
  fallback = Number.NaN,
): number => {
  if (!source) {
    return fallback;
  }

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const candidate = toNumber((source as Record<string, unknown>)[key], Number.NaN);
      if (Number.isFinite(candidate)) {
        return candidate;
      }
    }
  }

  return fallback;
};

const parseMetadata = (value: unknown): Record<string, any> | null => {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn('[parseMetadata] No se pudo parsear metadata string:', error);
      return null;
    }
  }
  if (typeof value === 'object') {
    return value as Record<string, any>;
  }
  console.warn('[parseMetadata] Tipo de metadata inesperado:', typeof value, value);
  return null;
};

export async function listPendingReceptions(
  input: ListPendingReceptionsInput,
): Promise<PendingReceptionsResult> {
  const producerId = input.producerId?.trim();
  const page = Number.isFinite(input.page) ? Math.max(1, Math.floor(input.page as number)) : 1;
  const limitCandidate = Number.isFinite(input.limit) ? Math.max(1, Math.floor(input.limit as number)) : 25;
  const limit = Math.min(limitCandidate, MAX_LIMIT);

  if (!producerId) {
    return {
      rows: [],
      total: 0,
      page,
      limit,
    };
  }

  const db = await getDb();
  const receptionRepo = db.getRepository(Transaction);

  const qb = receptionRepo
    .createQueryBuilder('reception')
    .leftJoinAndSelect('reception.producer', 'producer')
    .leftJoinAndSelect('reception.season', 'season')
    .leftJoin(
      TransactionRelation,
      'settlementRelation',
      'settlementRelation.childTransactionId = reception.id AND settlementRelation.relationType = :relationType',
      { relationType: TransactionRelationType.RECEPTION_TO_SETTLEMENT },
    )
    .where('reception.type = :receptionType', { receptionType: TransactionType.RECEPTION })
    .andWhere('reception.deletedAt IS NULL')
    .andWhere('reception.producerId = :producerId', { producerId });

  if (input.includeSettlementId) {
    qb.andWhere('(settlementRelation.id IS NULL OR settlementRelation.parentTransactionId = :includeSettlementId)', { includeSettlementId: BigInt(input.includeSettlementId) });
  } else {
    qb.andWhere('settlementRelation.id IS NULL');
  }

  qb.orderBy('reception.createdAt', 'DESC');

  if (input.seasonId?.trim()) {
    qb.andWhere('reception.seasonId = :seasonId', { seasonId: input.seasonId.trim() });
  }

  qb.skip((page - 1) * limit).take(limit);

  const [receptions, total] = await qb.getManyAndCount();

  const receptionIds = receptions.map((reception) => String(reception.id));
  const packStats = new Map<string, { packCount: number; netWeightKg: number }>();
  const varietiesMap = new Map<string, string[]>();

  if (receptionIds.length > 0) {
    const rawStats = await db
      .getRepository(ReceptionPack)
      .createQueryBuilder('pack')
      .select('pack.receptionTransactionId', 'receptionId')
      .addSelect('COUNT(pack.id)', 'packCount')
      .addSelect('COALESCE(SUM(pack.netWeight), 0)', 'netWeightKg')
      .where('pack.receptionTransactionId IN (:...ids)', { ids: receptionIds })
      .groupBy('pack.receptionTransactionId')
      .getRawMany<{ receptionId: string; packCount: string; netWeightKg: string }>();

    rawStats.forEach((row) => {
      packStats.set(row.receptionId, {
        packCount: Number(row.packCount ?? 0),
        netWeightKg: Number(row.netWeightKg ?? 0),
      });
    });

    const rawVarieties = await db
      .getRepository(ReceptionPack)
      .createQueryBuilder('pack')
      .select('pack.receptionTransactionId', 'receptionId')
      .addSelect('pack.varietyName', 'varietyName')
      .where('pack.receptionTransactionId IN (:...ids)', { ids: receptionIds })
      .distinct(true)
      .getRawMany<{ receptionId: string; varietyName: string }>();

    rawVarieties.forEach((row) => {
      const existing = varietiesMap.get(row.receptionId) || [];
      existing.push(row.varietyName);
      varietiesMap.set(row.receptionId, existing);
    });
  }

  const rows: PendingReceptionRow[] = receptions.map((reception) => {
    try {
      const transactionId = String(reception.id);
      const metadata = parseMetadata(reception.metadata);
      const totals = metadata?.totals ?? {};
      const packsFromMetadata = Array.isArray(metadata?.packs) ? metadata.packs : [];

      const packCountFromTotals = toNumber(totals?.packsCount, Number.NaN);
      const netWeightFromTotals = toNumber(totals?.netWeightKg, Number.NaN);
      const totalCLPFromTotals = resolveNumberFromKeys(totals, ['totalCLPToPay', 'totalToPayCLP', 'payableCLP'], Number.NaN);

      const stats = packStats.get(transactionId);

      const packCount = Number.isFinite(packCountFromTotals)
        ? packCountFromTotals
        : packsFromMetadata.length || stats?.packCount || 0;

      const netWeightKg = Number.isFinite(netWeightFromTotals)
        ? netWeightFromTotals
        : stats?.netWeightKg || 0;

      const totalToPayCLPRaw = resolveNumberFromKeys(totals, ['totalToPayCLP', 'payableCLP', 'clpAmount'], Number.NaN);
      const totalToPayUSD = Math.max(0, resolveNumberFromKeys(totals, ['totalToPayUSD', 'payableUSD', 'usdAmount', 'usdToPay', 'totalUSDToPay', 'totalUsdToPay'], 0));

      const exchangeRateCandidates = [
        resolveNumberFromKeys(totals, ['exchangeRate', 'rate', 'exchangeRateValue'], Number.NaN),
        toNumber(metadata?.exchangeRate, Number.NaN),
        toNumber(metadata?.summary?.exchangeRate, Number.NaN),
      ];
      const exchangeRateRaw = exchangeRateCandidates.find((candidate) => Number.isFinite(candidate)) ?? 0;
      const exchangeRate = Math.max(0, exchangeRateRaw);
      const fallbackAmount = Math.max(0, toNumber(reception.amount, 0));

      let totalCLPToPay = Number.isFinite(totalCLPFromTotals)
        ? totalCLPFromTotals
        : Number.isFinite(totalToPayCLPRaw)
          ? totalToPayCLPRaw + totalToPayUSD * exchangeRate
          : fallbackAmount;

      if (!Number.isFinite(totalCLPToPay)) {
        totalCLPToPay = fallbackAmount;
      }

      totalCLPToPay = Math.max(0, totalCLPToPay);

      let totalToPayCLP = Number.isFinite(totalToPayCLPRaw)
        ? totalToPayCLPRaw
        : totalCLPToPay - totalToPayUSD * exchangeRate;

      if (!Number.isFinite(totalToPayCLP) || totalToPayCLP < 0) {
        const difference = totalCLPToPay - totalToPayUSD * exchangeRate;
        totalToPayCLP = difference > 0 ? difference : 0;
      }

      const guideNumberRaw = metadata?.guideNumber ?? null;

      return {
        transactionId,
        createdAt: reception.createdAt?.toISOString?.() ?? new Date().toISOString(),
        guideNumber: guideNumberRaw ? String(guideNumberRaw) : null,
        seasonName: reception.season?.name ?? null,
        producerName: reception.producer?.name ?? null,
        varieties: varietiesMap.get(transactionId) || [],
        packCount: Number(packCount),
        netWeightKg: Number(netWeightKg),
        totalToPayCLP: Number(totalToPayCLP),
        totalToPayUSD: Number(totalToPayUSD),
        exchangeRate,
        totalCLPToPay: Number(totalCLPToPay),
      };
    } catch (error) {
      console.error('[listPendingReceptions] Error processing reception', reception.id, ':', error);
      // Return safe defaults
      return {
        transactionId: String(reception.id),
        createdAt: new Date().toISOString(),
        guideNumber: null,
        seasonName: null,
        producerName: null,
        varieties: [],
        packCount: 0,
        netWeightKg: 0,
        totalToPayCLP: 0,
        totalToPayUSD: 0,
        exchangeRate: 0,
        totalCLPToPay: 0,
      };
    }
  });

  return {
    rows,
    total,
    page,
    limit,
  };
}

export interface BulkUpdatePendingReceptionExchangeRateInput {
  receptionIds: string[];
  exchangeRate: number;
  reason: string;
  userId: string;
}

export interface BulkUpdatePendingReceptionExchangeRateResult {
  success: boolean;
  updated: number;
  failures?: Array<{ receptionId: string; message: string }>;
  error?: string;
}

export async function bulkUpdatePendingReceptionExchangeRate(
  input: BulkUpdatePendingReceptionExchangeRateInput,
): Promise<BulkUpdatePendingReceptionExchangeRateResult> {
  try {
    const { receptionIds, exchangeRate, reason, userId } = input;

    if (!Array.isArray(receptionIds) || receptionIds.length === 0) {
      return {
        success: false,
        updated: 0,
        error: 'Seleccione al menos una recepción para actualizar el tipo de cambio',
      };
    }

    if (!userId) {
      return {
        success: false,
        updated: 0,
        error: 'Usuario no autenticado',
      };
    }

    const trimmedReason = reason?.trim() ?? '';
    if (!trimmedReason) {
      return {
        success: false,
        updated: 0,
        error: 'Debe proporcionar un motivo para actualizar el tipo de cambio',
      };
    }

    const normalizedRate = Number(exchangeRate);
    if (!Number.isFinite(normalizedRate) || normalizedRate <= 0) {
      return {
        success: false,
        updated: 0,
        error: 'El tipo de cambio debe ser un número positivo',
      };
    }

    const uniqueIds = Array.from(new Set(receptionIds.map((id) => String(id).trim()).filter(Boolean)));
    if (uniqueIds.length === 0) {
      return {
        success: false,
        updated: 0,
        error: 'No se encontraron recepciones válidas para actualizar',
      };
    }

    const failures: Array<{ receptionId: string; message: string }> = [];
    let updated = 0;

    for (const receptionId of uniqueIds) {
      const result = await updateReceptionExchangeRate({
        receptionId,
        newExchangeRate: normalizedRate,
        reason: trimmedReason,
        userId,
      });

      if (result.success) {
        updated += 1;
      } else {
        failures.push({ receptionId, message: result.error || 'No fue posible actualizar la recepción' });
      }
    }

    if (updated > 0) {
      revalidatePath('/home/economicManagement/settlements');
    }

    return {
      success: failures.length === 0 && updated > 0,
      updated,
      failures: failures.length ? failures : undefined,
      error:
        failures.length > 0
          ? 'Algunas recepciones no pudieron actualizarse'
          : updated === 0
            ? 'No se pudo actualizar el tipo de cambio de las recepciones seleccionadas'
            : undefined,
    };
  } catch (error) {
    console.error('[bulkUpdatePendingReceptionExchangeRate] Error:', error);
    return {
      success: false,
      updated: 0,
      error: error instanceof Error ? error.message : 'Error al actualizar el tipo de cambio',
    };
  }
}

const parseAdvanceRelationAmount = (context: string | null | undefined): number => {
  if (!context) {
    return 0;
  }

  try {
    const parsed = JSON.parse(context) as { amount?: unknown };
    const amount = parsed?.amount;
    return typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  } catch (error) {
    console.warn('[listPendingAdvances] Invalid relation context JSON', error);
    return 0;
  }
};

export async function listPendingAdvances(
  input: ListPendingAdvancesInput,
): Promise<PendingAdvancesResult> {
  const producerId = input.producerId?.trim();
  const page = Number.isFinite(input.page) ? Math.max(1, Math.floor(input.page as number)) : 1;
  const limitCandidate = Number.isFinite(input.limit) ? Math.max(1, Math.floor(input.limit as number)) : 25;
  const limit = Math.min(limitCandidate, MAX_LIMIT);

  if (!producerId) {
    return {
      rows: [],
      total: 0,
      page,
      limit,
      totals: {
        amount: 0,
        appliedAmount: 0,
        availableAmount: 0,
      },
    };
  }

  const db = await getDb();
  const advanceRepo = db.getRepository(Transaction);

  const advances = await advanceRepo
    .createQueryBuilder('advance')
    .leftJoinAndSelect('advance.season', 'season')
    .leftJoinAndSelect('advance.user', 'operator')
    .where('advance.type = :type', { type: TransactionType.ADVANCE })
    .andWhere('advance.direction = :direction', { direction: TransactionDirection.OUT })
    .andWhere('advance.deletedAt IS NULL')
    .andWhere('advance.producerId = :producerId', { producerId })
    .orderBy('advance.createdAt', 'DESC')
    .getMany();

  const advanceIds = advances.map((advance) => String(advance.id));
  const appliedAmounts = new Map<string, number>();

  if (advanceIds.length > 0) {
    const rawRelations = await db
      .getRepository(TransactionRelation)
      .createQueryBuilder('relation')
      .select('relation.childTransactionId', 'advanceId')
      .addSelect('relation.context', 'context')
      .where('relation.relationType = :relationType', { relationType: TransactionRelationType.ADVANCE_TO_SETTLEMENT })
      .andWhere('relation.childTransactionId IN (:...ids)', { ids: advanceIds });

    if (input.includeSettlementId) {
      rawRelations.andWhere('relation.parentTransactionId != :includeSettlementId', { includeSettlementId: BigInt(input.includeSettlementId) });
    }

    const relations = await rawRelations.getRawMany<{ advanceId: string; context: string | null }>();

    relations.forEach((row) => {
      const amount = parseAdvanceRelationAmount(row.context);
      if (amount > 0) {
        appliedAmounts.set(row.advanceId, (appliedAmounts.get(row.advanceId) ?? 0) + amount);
      } else {
        // If no amount specified in context, assume full amount was used
        const advance = advances.find((a) => String(a.id) === row.advanceId);
        if (advance) {
          appliedAmounts.set(row.advanceId, (appliedAmounts.get(row.advanceId) ?? 0) + Number(advance.amount));
        }
      }
    });
  }

  const advanceRows = advances.map<PendingAdvanceRow>((advance) => {
    try {
      const transactionId = String(advance.id);
      const metadata = parseMetadata(advance.metadata) as AdvanceMetadata | null;
      const paymentMethod = typeof metadata?.paymentMethod === 'string' ? metadata.paymentMethod : 'CASH';
      const paymentDetails = metadata?.paymentDetails ?? {};
      const paymentReference =
        typeof paymentDetails.transactionId === 'string'
          ? paymentDetails.transactionId
          : typeof paymentDetails.checkNumber === 'string'
            ? paymentDetails.checkNumber
            : null;
      const notes = typeof metadata?.notes === 'string' && metadata.notes.trim() ? metadata.notes.trim() : null;

      const amount = Number(advance.amount ?? 0);
      const appliedAmount = appliedAmounts.get(transactionId) ?? 0;
      const availableAmount = advance.deletedAt ? 0 : Math.max(amount - appliedAmount, 0);

      return {
        transactionId,
        createdAt: advance.createdAt?.toISOString?.() ?? new Date().toISOString(),
        seasonName: advance.season?.name ?? null,
        operatorName: advance.user?.userName ?? null,
        paymentMethod,
        paymentReference,
        notes,
        amount,
        appliedAmount,
        availableAmount,
      };
    } catch (error) {
      console.error('[listPendingAdvances] Error processing advance', advance.id, ':', error);
      // Return safe defaults
      return {
        transactionId: String(advance.id),
        createdAt: new Date().toISOString(),
        seasonName: null,
        operatorName: null,
        paymentMethod: 'CASH',
        paymentReference: null,
        notes: null,
        amount: 0,
        appliedAmount: 0,
        availableAmount: 0,
      };
    }
  });

  const pendingRows = advanceRows.filter((row) => row.availableAmount > 0);

  const totals = pendingRows.reduce(
    (acc, row) => {
      acc.amount += row.amount;
      acc.appliedAmount += row.appliedAmount;
      acc.availableAmount += row.availableAmount;
      return acc;
    },
    { amount: 0, appliedAmount: 0, availableAmount: 0 },
  );

  const total = pendingRows.length;
  const start = (page - 1) * limit;
  const pagedRows = pendingRows.slice(start, start + limit);

  return {
    rows: pagedRows,
    total,
    page,
    limit,
    totals,
  };
}

export interface CreateSettlementInput {
  producerId: string;
  seasonId: string;
  selectedReceptionIds: string[];
  selectedAdvanceIds: string[];
  paymentMethod: 'CASH' | 'TRANSFER' | 'CHECK';
  paymentDetails: {
    producerAccountId?: string;
    bankAccountId?: string;
    transactionId?: string;
    checkNumber?: string;
  };
  totals: {
    receptionsCount: number;
    receptionsTotal: number;
    advancesCount: number;
    advancesTotal: number;
    balance: number;
  };
  notes?: string;
  isDraft?: boolean;
  userId: string;
}

export async function createSettlement(input: CreateSettlementInput) {
  const db = await getDb();

  // Validar que las recepciones y anticipos existan y pertenezcan al productor
  const receptionIds = input.selectedReceptionIds;
  const advanceIds = input.selectedAdvanceIds;

  if (receptionIds.length === 0) {
    throw new Error('Debe seleccionar al menos una recepción');
  }

  if (input.totals.balance < 0) {
    throw new Error('El balance no puede ser negativo');
  }

  const transactionRepo = db.getRepository(Transaction);
  const relationRepo = db.getRepository(TransactionRelation);

  // Verificar recepciones
  const receptions = await transactionRepo.find({
    where: {
      id: In(receptionIds.map(id => parseInt(id))),
      type: TransactionType.RECEPTION,
      producerId: input.producerId,
    },
  });

  if (receptions.length !== receptionIds.length) {
    throw new Error('Algunas recepciones no existen o no pertenecen al productor');
  }

  // Verificar anticipos
  const advances = await transactionRepo.find({
    where: {
      id: In(advanceIds.map(id => parseInt(id))),
      type: TransactionType.ADVANCE,
      producerId: input.producerId,
    },
  });

  if (advances.length !== advanceIds.length) {
    throw new Error('Algunos anticipos no existen o no pertenecen al productor');
  }

  // Verificar que no estén ya liquidados
  const existingRelations = await relationRepo.find({
    where: [
      {
        childTransactionId: In([...receptionIds.map(id => parseInt(id)), ...advanceIds.map(id => parseInt(id))]),
        relationType: TransactionRelationType.RECEPTION_TO_SETTLEMENT,
      },
      {
        childTransactionId: In([...receptionIds.map(id => parseInt(id)), ...advanceIds.map(id => parseInt(id))]),
        relationType: TransactionRelationType.ADVANCE_TO_SETTLEMENT,
      },
    ],
  });

  if (existingRelations.length > 0) {
    throw new Error('Algunas recepciones o anticipos ya están liquidados');
  }

  // Crear la transacción de liquidación
  const settlementMetadata: SettlementMetadata = {
    selectedReceptionIds: input.selectedReceptionIds,
    selectedAdvanceIds: input.selectedAdvanceIds,
    paymentMethod: input.paymentMethod,
    paymentDetails: input.paymentDetails,
    totals: input.totals,
    notes: input.notes,
    isDraft: input.isDraft,
  };

  const settlement = await transactionRepo.save({
    type: TransactionType.SETTLEMENT,
    direction: TransactionDirection.OUT,
    amount: input.totals.balance,
    unit: TransactionUnit.CLP,
    producerId: input.producerId,
    seasonId: input.seasonId,
    userId: input.userId,
    metadata: settlementMetadata,
  });

  const settlementId = settlement.id.toString();

  // Crear relaciones para recepciones
  const receptionRelations = receptionIds.map(receptionId => ({
    parentTransactionId: settlementId,
    childTransactionId: receptionId,
    relationType: TransactionRelationType.RECEPTION_TO_SETTLEMENT,
  }));

  // Crear relaciones para anticipos
  const advanceRelations = advanceIds.map(advanceId => ({
    parentTransactionId: settlementId,
    childTransactionId: advanceId,
    relationType: TransactionRelationType.ADVANCE_TO_SETTLEMENT,
  }));

  await relationRepo.save([...receptionRelations, ...advanceRelations]);

  // Registrar auditoría de creación
  await logTransactionAudit(
    db.manager,
    settlementId,
    AuditActionType.CREATE,
    input.userId,
    undefined,
    {
      type: TransactionType.SETTLEMENT,
      producerId: input.producerId,
      seasonId: input.seasonId,
      amount: input.totals.balance,
      receptionsCount: input.totals.receptionsCount,
      advancesCount: input.totals.advancesCount,
      paymentMethod: input.paymentMethod,
      isDraft: input.isDraft,
    }
  );

  return { settlementId };
}

export async function listSettlements(input: ListSettlementsInput): Promise<SettlementsResult> {
  const producerId = input.producerId?.trim();
  const seasonId = input.seasonId?.trim();
  const page = Number.isFinite(input.page) ? Math.max(1, Math.floor(input.page as number)) : 1;
  const limitCandidate = Number.isFinite(input.limit) ? Math.max(1, Math.floor(input.limit as number)) : 25;
  const limit = Math.min(limitCandidate, 100);

  const db = await getDb();
  const transactionRepo = db.getRepository(Transaction);

  const qb = transactionRepo
    .createQueryBuilder('settlement')
    .leftJoinAndSelect('settlement.producer', 'producer')
    .leftJoinAndSelect('settlement.season', 'season')
    .where('settlement.type = :type', { type: TransactionType.SETTLEMENT })
    .andWhere('settlement.deletedAt IS NULL')
    .orderBy('settlement.createdAt', 'DESC');

  if (producerId) {
    qb.andWhere('settlement.producerId = :producerId', { producerId });
  }

  if (seasonId) {
    qb.andWhere('settlement.seasonId = :seasonId', { seasonId });
  }

  qb.skip((page - 1) * limit).take(limit);

  const [settlements, total] = await qb.getManyAndCount();

  const rows: SettlementRow[] = settlements.map((settlement) => {
    const metadata = settlement.metadata as SettlementMetadata | null;
    return {
      id: String(settlement.id),
      transactionId: String(settlement.id),
      createdAt: settlement.createdAt.toISOString(),
      producerName: settlement.producer?.name ?? null,
      seasonName: settlement.season?.name ?? null,
      amount: Number(settlement.amount),
      receptionsCount: metadata?.totals?.receptionsCount ?? 0,
      advancesCount: metadata?.totals?.advancesCount ?? 0,
      status: metadata?.isDraft ? 'DRAFT' : 'COMPLETED',
    };
  });

  return {
    rows,
    total,
    page,
    limit,
  };
}

export interface SettlementDetailReception {
  transactionId: string;
  createdAt: string;
  guideNumber: string | null;
  varieties: string[];
  formats: string[];
  netWeightKg: number;
  price: number;
  totalPrice: number;
}

export interface SettlementDetailAdvance {
  transactionId: string;
  createdAt: string;
  amount: number;
  paymentMethod: string;
  notes: string | null;
}

export interface SettlementDetail {
  transactionId: string;
  createdAt: string;
  producerName: string;
  producerDni: string;
  producerBankAccounts?: PersonBankAccount[] | null;
  seasonName: string;
  paymentMethod: string;
  paymentDetails: any;
  notes: string | null;
  receptions: SettlementDetailReception[];
  advances: SettlementDetailAdvance[];
  totals: {
    receptionsTotal: number;
    advancesTotal: number;
    balance: number;
  };
}

export async function getSettlementDetail(settlementId: string): Promise<SettlementDetail> {
  const db = await getDb();
  const transactionRepo = db.getRepository(Transaction);
  const relationRepo = db.getRepository(TransactionRelation);

  // Fix: Use BigInt for ID lookup
  const settlement = await transactionRepo.findOne({
    where: { id: BigInt(settlementId), type: TransactionType.SETTLEMENT },
    relations: ['producer', 'producer.person', 'season'],
  });

  if (!settlement) {
    throw new Error('Liquidación no encontrada');
  }

  const relations = await relationRepo.find({
    where: { parentTransactionId: settlementId },
  });

  // Fix: Filter nulls and map to string
  const receptionIds = relations
    .filter((r) => r.relationType === TransactionRelationType.RECEPTION_TO_SETTLEMENT && r.childTransactionId)
    .map((r) => r.childTransactionId as string);

  const advanceIds = relations
    .filter((r) => r.relationType === TransactionRelationType.ADVANCE_TO_SETTLEMENT && r.childTransactionId)
    .map((r) => r.childTransactionId as string);

  const receptions = receptionIds.length > 0
    ? await transactionRepo.find({
        where: { id: In(receptionIds.map(id => BigInt(id))) },
        relations: ['season'],
      })
    : [];

  // Fetch packs for varieties and weight
  const receptionDetails: SettlementDetailReception[] = [];
  for (const reception of receptions) {
    const metadata = reception.metadata as any;
    // Fix: Use correct column name receptionTransactionId and remove invalid relation
    const packs = await db.getRepository(ReceptionPack).find({
      where: { receptionTransactionId: String(reception.id) },
    });
    
    // Fix: Use varietyName directly from entity
    const varieties = Array.from(new Set(packs.map(p => p.varietyName).filter(Boolean) as string[]));
    const formats = Array.from(new Set(packs.map(p => p.formatName).filter(Boolean) as string[]));
    const netWeightKg = packs.reduce((sum, p) => sum + Number(p.netWeight), 0);
    const price = netWeightKg > 0 ? Number(reception.amount) / netWeightKg : 0;

    receptionDetails.push({
      transactionId: String(reception.id),
      createdAt: reception.createdAt.toISOString(),
      guideNumber: metadata?.guideNumber ?? null,
      varieties,
      formats,
      netWeightKg,
      price,
      totalPrice: Number(reception.amount),
    });
  }

  const advances = advanceIds.length > 0
    ? await transactionRepo.find({
        where: { id: In(advanceIds.map(id => BigInt(id))) },
      })
    : [];

  const advanceDetails: SettlementDetailAdvance[] = advances.map((advance) => {
    const metadata = advance.metadata as AdvanceMetadata;
    return {
      transactionId: String(advance.id),
      createdAt: advance.createdAt.toISOString(),
      amount: Number(advance.amount), // Assuming full amount for now as per createSettlement logic
      paymentMethod: typeof metadata?.paymentMethod === 'string' ? metadata.paymentMethod : 'CASH',
      notes: metadata?.notes ?? null,
    };
  });

  const metadata = settlement.metadata as SettlementMetadata;

  return {
    transactionId: String(settlement.id),
    createdAt: settlement.createdAt.toISOString(),
    producerName: settlement.producer?.name ?? '',
    producerDni: settlement.producer?.dni ?? '',
    producerBankAccounts: settlement.producer?.person?.bankAccounts ?? null,
    seasonName: settlement.season?.name ?? '',
    paymentMethod: metadata?.paymentMethod ?? 'CASH',
    paymentDetails: metadata?.paymentDetails ?? {},
    notes: metadata?.notes ?? null,
    receptions: receptionDetails,
    advances: advanceDetails,
    totals: {
      receptionsTotal: metadata?.totals?.receptionsTotal ?? 0,
      advancesTotal: metadata?.totals?.advancesTotal ?? 0,
      balance: Number(settlement.amount),
    },
  };
}

export async function deleteSettlement(settlementId: string) {
  const db = await getDb();
  const queryRunner = db.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const settlement = await queryRunner.manager.findOne(Transaction, {
      where: { id: BigInt(settlementId), type: TransactionType.SETTLEMENT }
    });

    if (!settlement) {
      throw new Error('Liquidación no encontrada');
    }

    // Delete relations where this settlement is the parent
    await queryRunner.manager.delete(TransactionRelation, {
      parentTransactionId: BigInt(settlementId)
    });

    // Registrar auditoría antes de eliminar
    const settlementMetadata = settlement.metadata as SettlementMetadata | null;
    await logTransactionAudit(
      queryRunner.manager,
      settlementId,
      AuditActionType.DELETE,
      settlement.userId || undefined,
      {
        type: TransactionType.SETTLEMENT,
        producerId: settlement.producerId,
        seasonId: settlement.seasonId,
        amount: Number(settlement.amount),
        receptionsCount: settlementMetadata?.totals?.receptionsCount || 0,
        advancesCount: settlementMetadata?.totals?.advancesCount || 0,
      },
      undefined
    );

    // Delete the settlement transaction
    await queryRunner.manager.remove(settlement);

    await queryRunner.commitTransaction();
    
    revalidatePath('/home/economicManagement/settlements');
    return { success: true };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('Error deleting settlement:', error);
    return { success: false, error: 'Error al eliminar la liquidación' };
  } finally {
    await queryRunner.release();
  }
}

export async function getSettlementForEdit(settlementId: string) {
  const db = await getDb();
  const transactionRepo = db.getRepository(Transaction);
  const relationRepo = db.getRepository(TransactionRelation);

  const settlement = await transactionRepo.findOne({
    where: { id: BigInt(settlementId), type: TransactionType.SETTLEMENT },
    relations: ['producer', 'season'],
  });

  if (!settlement) {
    return null; // Liquidación no encontrada
  }

  const metadata = settlement.metadata as SettlementMetadata | null;

  if (!metadata?.isDraft) {
    return null; // Solo se pueden editar liquidaciones en borrador
  }

  // Get linked receptions
  const receptionRelations = await relationRepo.find({
    where: {
      parentTransactionId: String(settlementId),
      relationType: TransactionRelationType.RECEPTION_TO_SETTLEMENT,
    },
  });
  const linkedReceptionIds = receptionRelations.map(r => String(r.childTransactionId));

  // Get linked advances
  const advanceRelations = await relationRepo.find({
    where: {
      parentTransactionId: String(settlementId),
      relationType: TransactionRelationType.ADVANCE_TO_SETTLEMENT,
    },
  });
  const linkedAdvanceIds = advanceRelations.map(r => String(r.childTransactionId));

  return {
    id: String(settlement.id),
    producerId: String(settlement.producerId),
    seasonId: String(settlement.seasonId),
    amount: Number(settlement.amount),
    metadata,
    linkedReceptionIds,
    linkedAdvanceIds,
  };
}

export async function updateSettlement(settlementId: string, input: CreateSettlementInput) {
  const db = await getDb();
  const queryRunner = db.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const transactionRepo = queryRunner.manager.getRepository(Transaction);
    const relationRepo = queryRunner.manager.getRepository(TransactionRelation);

    const settlement = await transactionRepo.findOne({
      where: { id: BigInt(settlementId), type: TransactionType.SETTLEMENT },
    });

    if (!settlement) {
      throw new Error('Liquidación no encontrada');
    }

    // Validar que las recepciones y anticipos existan y pertenezcan al productor
    const receptionIds = input.selectedReceptionIds;
    const advanceIds = input.selectedAdvanceIds;

    if (receptionIds.length === 0) {
      throw new Error('Debe seleccionar al menos una recepción');
    }

    if (input.totals.balance < 0) {
      throw new Error('El balance no puede ser negativo');
    }

    // Verificar recepciones
    const receptions = await transactionRepo.find({
      where: {
        id: In(receptionIds.map(id => BigInt(id))),
        type: TransactionType.RECEPTION,
        producerId: input.producerId,
      },
    });

    if (receptions.length !== receptionIds.length) {
      throw new Error('Algunas recepciones no existen o no pertenecen al productor');
    }

    // Verificar anticipos
    const advances = await transactionRepo.find({
      where: {
        id: In(advanceIds.map(id => BigInt(id))),
        type: TransactionType.ADVANCE,
        producerId: input.producerId,
      },
    });

    if (advances.length !== advanceIds.length) {
      throw new Error('Algunos anticipos no existen o no pertenecen al productor');
    }

    // Verificar que no estén ya liquidados por OTRA liquidación
    const existingRelations = await relationRepo
      .createQueryBuilder('relation')
      .where('relation.childTransactionId IN (:...ids)', { ids: [...receptionIds, ...advanceIds].map(id => String(id)) })
      .andWhere('relation.parentTransactionId != :settlementId', { settlementId: String(settlementId) })
      .andWhere('relation.relationType IN (:...types)', { types: [TransactionRelationType.RECEPTION_TO_SETTLEMENT, TransactionRelationType.ADVANCE_TO_SETTLEMENT] })
      .getMany();

    if (existingRelations.length > 0) {
      throw new Error('Algunas recepciones o anticipos ya están liquidados en otra liquidación');
    }

    // Actualizar metadata
    const settlementMetadata: SettlementMetadata = {
      selectedReceptionIds: input.selectedReceptionIds,
      selectedAdvanceIds: input.selectedAdvanceIds,
      paymentMethod: input.paymentMethod,
      paymentDetails: input.paymentDetails,
      totals: input.totals,
      notes: input.notes,
      isDraft: input.isDraft,
    };

    // Actualizar transacción
    settlement.amount = input.totals.balance;
    settlement.metadata = settlementMetadata;
    
    await transactionRepo.save(settlement);

    // Actualizar relaciones
    // Primero eliminamos todas las relaciones existentes de este settlement
    await relationRepo.delete({
      parentTransactionId: String(settlementId),
      relationType: In([TransactionRelationType.RECEPTION_TO_SETTLEMENT, TransactionRelationType.ADVANCE_TO_SETTLEMENT]),
    });

    // Crear nuevas relaciones para recepciones
    const receptionRelations = receptionIds.map(receptionId => ({
      parentTransactionId: String(settlementId),
      childTransactionId: String(receptionId),
      relationType: TransactionRelationType.RECEPTION_TO_SETTLEMENT,
    }));

    // Crear nuevas relaciones para anticipos
    const advanceRelations = advanceIds.map(advanceId => ({
      parentTransactionId: String(settlementId),
      childTransactionId: String(advanceId),
      relationType: TransactionRelationType.ADVANCE_TO_SETTLEMENT,
    }));

    if (receptionRelations.length > 0 || advanceRelations.length > 0) {
      await relationRepo.save([...receptionRelations, ...advanceRelations]);
    }

    // Registrar auditoría de actualización
    const oldMetadata = settlement.metadata as SettlementMetadata | null;
    await logTransactionAudit(
      queryRunner.manager,
      settlementId,
      AuditActionType.UPDATE,
      input.userId,
      {
        amount: Number(settlement.amount),
        receptionsCount: oldMetadata?.totals?.receptionsCount || 0,
        advancesCount: oldMetadata?.totals?.advancesCount || 0,
        paymentMethod: oldMetadata?.paymentMethod,
        isDraft: oldMetadata?.isDraft,
      },
      {
        amount: input.totals.balance,
        receptionsCount: input.totals.receptionsCount,
        advancesCount: input.totals.advancesCount,
        paymentMethod: input.paymentMethod,
        isDraft: input.isDraft,
      }
    );

    await queryRunner.commitTransaction();
    revalidatePath('/home/economicManagement/settlements');
    return { success: true };

  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('Error updating settlement:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

// ============================================================================
// UPDATE SETTLEMENT DATE
// ============================================================================

export interface UpdateSettlementDateInput {
  settlementId: string;
  newDate: string; // ISO date string
  userId: string;
}

export interface UpdateSettlementDateResult {
  success: boolean;
  error?: string;
}

/**
 * Updates the creation date of a settlement.
 * Can only update settlements that are in draft status.
 */
export async function updateSettlementDate(input: UpdateSettlementDateInput): Promise<UpdateSettlementDateResult> {
  const { settlementId, newDate, userId } = input;

  if (!settlementId?.trim()) {
    return { success: false, error: 'ID de la liquidación es requerido.' };
  }

  if (!newDate?.trim()) {
    return { success: false, error: 'La nueva fecha es requerida.' };
  }

  if (!userId?.trim()) {
    return { success: false, error: 'ID del usuario es requerido.' };
  }

  const parsedDate = new Date(newDate);
  if (isNaN(parsedDate.getTime())) {
    return { success: false, error: 'Formato de fecha inválido.' };
  }

  try {
    const db = await getDb();
    const transactionRepo = db.getRepository(Transaction);

    const settlement = await transactionRepo.findOne({
      where: {
        id: BigInt(settlementId),
        type: TransactionType.SETTLEMENT,
      },
      relations: ['producer'],
    });

    if (!settlement) {
      return { success: false, error: 'Liquidación no encontrada.' };
    }

    // Check if settlement is in draft status
    const metadata = settlement.metadata as SettlementMetadata | null;
    if (!metadata?.isDraft) {
      return { success: false, error: 'Solo se puede modificar la fecha de liquidaciones en borrador.' };
    }

    const oldDate = settlement.createdAt;

    // Update the date using transaction for audit
    await db.transaction(async (manager) => {
      settlement.createdAt = parsedDate;
      await manager.save(Transaction, settlement);

      // Log audit
      await logSettlementAudit(
        manager,
        settlementId,
        AuditActionType.UPDATE,
        userId,
        { createdAt: oldDate?.toISOString() },
        { createdAt: parsedDate.toISOString() }
      );
    });

    revalidatePath('/home/economicManagement/settlements');

    return { success: true };
  } catch (error) {
    console.error('[updateSettlementDate] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar la fecha de la liquidación.',
    };
  }
}