'use server';

import { getDb } from '../../data/db';
import { Transaction, TransactionType, TransactionDirection, TransactionUnit, AdvanceMetadata, SettlementMetadata } from '../../data/entities/Transaction';
import { TransactionRelation, TransactionRelationType } from '../../data/entities/TransactionRelation';
import { ReceptionPack } from '../../data/entities/ReceptionPack';
import { PersonBankAccount } from '../../data/entities/Person';
import { AdminBankAccount } from '../../data/entities/AdminBankAccount';
import { resolveSettlementStatus, type SettlementStatus } from '../../lib/receptionSettlement';
import { In, IsNull } from 'typeorm';
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
  /** Recepción sin precio cargado (total a pagar en 0). */
  isUnpriced: boolean;
}

export interface PendingReceptionsResult {
  rows: PendingReceptionRow[];
  total: number;
  page: number;
  limit: number;
  /** Recepciones sin precio entre las filas devueltas. */
  unpricedCount: number;
  unpricedKg: number;
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
// La pantalla de liquidación necesita ver todas las recepciones pendientes del productor, sin paginar.
const MAX_PENDING_RECEPTIONS_LIMIT = 500;

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
  const limit = Math.min(limitCandidate, MAX_PENDING_RECEPTIONS_LIMIT);

  if (!producerId) {
    return {
      rows: [],
      total: 0,
      page,
      limit,
      unpricedCount: 0,
      unpricedKg: 0,
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
      'settlementRelation.parentTransactionId = reception.id AND settlementRelation.relationType = :relationType AND settlementRelation.deletedAt IS NULL',
      { relationType: TransactionRelationType.RECEPTION_TO_SETTLEMENT },
    )
    .where('reception.type = :receptionType', { receptionType: TransactionType.RECEPTION })
    .andWhere('reception.deletedAt IS NULL')
    .andWhere('reception.producerId = :producerId', { producerId });

  if (input.includeSettlementId) {
    qb.andWhere('(settlementRelation.id IS NULL OR settlementRelation.childTransactionId = :includeSettlementId)', { includeSettlementId: String(input.includeSettlementId) });
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
        isUnpriced: !(Number(totalCLPToPay) > 0),
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
        isUnpriced: true,
      };
    }
  });

  // Con valor primero (conservando el orden por fecha dentro de cada grupo).
  const sortedRows = [...rows].sort((a, b) => Number(a.isUnpriced) - Number(b.isUnpriced));
  const unpricedRows = sortedRows.filter((row) => row.isUnpriced);

  return {
    rows: sortedRows,
    total,
    page,
    limit,
    unpricedCount: unpricedRows.length,
    unpricedKg: unpricedRows.reduce((sum, row) => sum + row.netWeightKg, 0),
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
      .select('relation.parentTransactionId', 'advanceId')
      .addSelect('relation.context', 'context')
      .where('relation.relationType = :relationType', { relationType: TransactionRelationType.ADVANCE_TO_SETTLEMENT })
      .andWhere('relation.parentTransactionId IN (:...ids)', { ids: advanceIds });

    if (input.includeSettlementId) {
      rawRelations.andWhere('relation.childTransactionId != :includeSettlementId', { includeSettlementId: String(input.includeSettlementId) });
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

const RECEPTION_TOTAL_CLP_KEYS = ['totalCLPToPay', 'totalToPayCLP', 'payableCLP'];
const RECEPTION_CLP_PORTION_KEYS = ['totalToPayCLP', 'payableCLP', 'clpAmount'];
const RECEPTION_USD_KEYS = ['totalToPayUSD', 'payableUSD', 'usdAmount', 'usdToPay', 'totalUSDToPay', 'totalUsdToPay'];

/**
 * Total a pagar de una recepción en CLP. Misma regla que usa `listPendingReceptions`,
 * de modo que el monto que se ve en pantalla es el que se guarda en la liquidación.
 */
const receptionClpAmount = (reception: Transaction): number => {
  const metadata = parseMetadata(reception.metadata);
  const totals = (metadata?.totals ?? {}) as Record<string, unknown>;
  const fallbackAmount = Math.max(0, toNumber(reception.amount, 0));

  const fromTotals = resolveNumberFromKeys(totals, RECEPTION_TOTAL_CLP_KEYS, Number.NaN);
  if (Number.isFinite(fromTotals)) {
    return Math.max(0, fromTotals);
  }

  const clpPortion = resolveNumberFromKeys(totals, RECEPTION_CLP_PORTION_KEYS, Number.NaN);
  if (Number.isFinite(clpPortion)) {
    const usdPortion = Math.max(0, resolveNumberFromKeys(totals, RECEPTION_USD_KEYS, 0));
    const rateCandidates = [
      resolveNumberFromKeys(totals, ['exchangeRate', 'rate', 'exchangeRateValue'], Number.NaN),
      toNumber(metadata?.exchangeRate, Number.NaN),
      toNumber(metadata?.summary?.exchangeRate, Number.NaN),
    ];
    const rate = Math.max(0, rateCandidates.find((candidate) => Number.isFinite(candidate)) ?? 0);
    return Math.max(0, clpPortion + usdPortion * rate);
  }

  return fallbackAmount;
};

export interface SettlementActionResult {
  success: boolean;
  settlementId?: string;
  error?: string;
}

/**
 * Crea o actualiza una liquidación en una sola transacción.
 *
 * Convención de relaciones (igual que reportes, dashboard y anticipos):
 *  - RECEPTION_TO_SETTLEMENT: parent = recepción, child = liquidación
 *  - ADVANCE_TO_SETTLEMENT:   parent = anticipo,  child = liquidación (context.amount = monto aplicado)
 *
 * Los totales se calculan aquí a partir de la base de datos; los que manda el
 * navegador (`input.totals`) se ignoran.
 */
async function saveSettlementCore(
  input: CreateSettlementInput,
  existingSettlementId?: string,
): Promise<SettlementActionResult> {
  const producerId = input.producerId?.trim();
  const userId = input.userId?.trim();
  const seasonId = input.seasonId?.trim();
  const status: SettlementStatus = input.isDraft ? 'BORRADOR' : 'COMPLETA';
  const receptionIds = [...new Set((input.selectedReceptionIds ?? []).map(String).filter(Boolean))];
  const advanceIds = [...new Set((input.selectedAdvanceIds ?? []).map(String).filter(Boolean))];

  if (!producerId) {
    return { success: false, error: 'Debe seleccionar un productor.' };
  }
  if (!userId) {
    return { success: false, error: 'Usuario no autenticado.' };
  }
  if (!seasonId) {
    return { success: false, error: 'No hay una temporada activa.' };
  }
  if (receptionIds.length === 0) {
    return { success: false, error: 'Debe seleccionar al menos una recepción.' };
  }

  try {
    const db = await getDb();

    const settlementId = await db.transaction(async (manager) => {
      const txRepo = manager.getRepository(Transaction);
      const relRepo = manager.getRepository(TransactionRelation);

      let settlement: Transaction | null = null;
      if (existingSettlementId) {
        settlement = await txRepo.findOne({
          where: { id: BigInt(existingSettlementId), type: TransactionType.SETTLEMENT },
        });
        if (!settlement) {
          throw new Error('Liquidación no encontrada.');
        }
        if (resolveSettlementStatus(parseMetadata(settlement.metadata)) === 'COMPLETA') {
          throw new Error('Una liquidación completa no se puede editar.');
        }
        if (settlement.producerId && settlement.producerId !== producerId) {
          throw new Error('El productor de la liquidación no coincide.');
        }
      }

      // Bloquea las filas de las recepciones para que dos liquidaciones simultáneas no las tomen a la vez.
      const receptions = await txRepo.find({
        where: {
          id: In(receptionIds.map((id) => BigInt(id))),
          type: TransactionType.RECEPTION,
          producerId,
          deletedAt: IsNull(),
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (receptions.length !== receptionIds.length) {
        throw new Error('Una o más recepciones no existen o no pertenecen al productor.');
      }

      const linksQb = relRepo
        .createQueryBuilder('relation')
        .where('relation.relationType = :type', { type: TransactionRelationType.RECEPTION_TO_SETTLEMENT })
        .andWhere('relation.parentTransactionId IN (:...ids)', { ids: receptionIds });
      if (existingSettlementId) {
        linksQb.andWhere('relation.childTransactionId <> :settlementId', { settlementId: existingSettlementId });
      }
      if ((await linksQb.getCount()) > 0) {
        throw new Error('Una o más recepciones ya están asociadas a otra liquidación.');
      }

      const advances = advanceIds.length > 0
        ? await txRepo.find({
            where: {
              id: In(advanceIds.map((id) => BigInt(id))),
              type: TransactionType.ADVANCE,
              producerId,
              deletedAt: IsNull(),
            },
            lock: { mode: 'pessimistic_write' },
          })
        : [];
      if (advances.length !== advanceIds.length) {
        throw new Error('Uno o más anticipos no existen o no pertenecen al productor.');
      }

      // Saldo disponible = monto - lo aplicado en OTRAS liquidaciones.
      const appliedByOthers = new Map<string, number>();
      if (advanceIds.length > 0) {
        const rawQb = relRepo
          .createQueryBuilder('relation')
          .select('relation.parentTransactionId', 'advanceId')
          .addSelect('relation.context', 'context')
          .where('relation.relationType = :type', { type: TransactionRelationType.ADVANCE_TO_SETTLEMENT })
          .andWhere('relation.parentTransactionId IN (:...ids)', { ids: advanceIds });
        if (existingSettlementId) {
          rawQb.andWhere('relation.childTransactionId <> :settlementId', { settlementId: existingSettlementId });
        }
        const rows = await rawQb.getRawMany<{ advanceId: string; context: string | null }>();
        rows.forEach((row) => {
          const amount = parseAdvanceRelationAmount(row.context);
          const advance = advances.find((a) => String(a.id) === String(row.advanceId));
          const applied = amount > 0 ? amount : Number(advance?.amount ?? 0);
          appliedByOthers.set(String(row.advanceId), (appliedByOthers.get(String(row.advanceId)) ?? 0) + applied);
        });
      }

      const advanceApplications: Array<{ transactionId: string; amount: number }> = [];
      for (const advance of advances) {
        const id = String(advance.id);
        const available = Math.max(Math.round(toNumber(advance.amount, 0)) - (appliedByOthers.get(id) ?? 0), 0);
        if (available <= 0) {
          throw new Error(`El anticipo ${id} no tiene saldo disponible.`);
        }
        advanceApplications.push({ transactionId: id, amount: available });
      }

      const unpricedReceptions = receptions.filter((r) => !(receptionClpAmount(r) > 0));
      if (status === 'COMPLETA' && unpricedReceptions.length > 0) {
        const folios = unpricedReceptions.map((r) => String(r.id)).join(', ');
        throw new Error(
          `Hay ${unpricedReceptions.length} recepción(es) sin precio (folios: ${folios}). Asigne el precio o guarde la liquidación como borrador.`,
        );
      }

      const receptionsTotalCLP = receptions.reduce((sum, r) => sum + receptionClpAmount(r), 0);
      const advancesAppliedCLP = advanceApplications.reduce((sum, a) => sum + a.amount, 0);
      if (advancesAppliedCLP > receptionsTotalCLP) {
        throw new Error('Los anticipos seleccionados superan el total de las recepciones.');
      }
      const netAmountCLP = receptionsTotalCLP - advancesAppliedCLP;

      const paymentMethod = input.paymentMethod;
      if (status === 'COMPLETA' && netAmountCLP > 0) {
        if (paymentMethod !== 'CASH' && paymentMethod !== 'TRANSFER' && paymentMethod !== 'CHECK') {
          throw new Error('Debe indicar la forma de pago de la liquidación.');
        }
      }
      const bankAccountId = input.paymentDetails?.bankAccountId;
      if (bankAccountId) {
        const bankAccount = await manager.getRepository(AdminBankAccount).findOne({ where: { id: bankAccountId } });
        if (!bankAccount || !bankAccount.isActive) {
          throw new Error('La cuenta bancaria de la administración seleccionada no está activa.');
        }
      }

      const metadata: SettlementMetadata = {
        selectedReceptionIds: receptionIds,
        selectedAdvanceIds: advanceIds,
        paymentMethod,
        paymentDetails: input.paymentDetails,
        totals: {
          receptionsCount: receptionIds.length,
          receptionsTotal: receptionsTotalCLP,
          advancesCount: advanceIds.length,
          advancesTotal: advancesAppliedCLP,
          balance: netAmountCLP,
        },
        notes: input.notes,
        isDraft: status === 'BORRADOR',
        status,
        advanceApplications,
        receptionsTotalCLP,
        advancesAppliedCLP,
        netAmountCLP,
      };

      const previousMetadata = settlement ? parseMetadata(settlement.metadata) : null;
      const previousAmount = settlement ? Number(settlement.amount) : undefined;

      if (!settlement) {
        settlement = txRepo.create({
          type: TransactionType.SETTLEMENT,
          direction: TransactionDirection.OUT,
          unit: TransactionUnit.CLP,
          amount: netAmountCLP,
          producerId,
          seasonId,
          userId,
          metadata,
        });
      } else {
        settlement.amount = netAmountCLP;
        settlement.seasonId = seasonId;
        settlement.metadata = metadata;
      }
      await txRepo.save(settlement);
      const settlementIdStr = String(settlement.id);

      await relRepo.delete({
        childTransactionId: settlementIdStr,
        relationType: In([TransactionRelationType.RECEPTION_TO_SETTLEMENT, TransactionRelationType.ADVANCE_TO_SETTLEMENT]),
      });

      await relRepo.save([
        ...receptionIds.map((receptionId) =>
          relRepo.create({
            parentTransactionId: receptionId,
            childTransactionId: settlementIdStr,
            relationType: TransactionRelationType.RECEPTION_TO_SETTLEMENT,
            context: JSON.stringify({ source: 'saveSettlement' }),
          }),
        ),
        ...advanceApplications.map((application) =>
          relRepo.create({
            parentTransactionId: application.transactionId,
            childTransactionId: settlementIdStr,
            relationType: TransactionRelationType.ADVANCE_TO_SETTLEMENT,
            context: JSON.stringify({ amount: application.amount, source: 'saveSettlement' }),
          }),
        ),
      ]);

      await logTransactionAudit(
        manager,
        settlementIdStr,
        existingSettlementId ? AuditActionType.UPDATE : AuditActionType.CREATE,
        userId,
        existingSettlementId
          ? {
              amount: previousAmount,
              receptionsCount: previousMetadata?.totals?.receptionsCount ?? 0,
              advancesCount: previousMetadata?.totals?.advancesCount ?? 0,
              paymentMethod: previousMetadata?.paymentMethod,
              status: resolveSettlementStatus(previousMetadata),
            }
          : undefined,
        {
          type: TransactionType.SETTLEMENT,
          producerId,
          seasonId,
          amount: netAmountCLP,
          receptionsCount: receptionIds.length,
          advancesCount: advanceIds.length,
          paymentMethod,
          status,
        },
      );

      return settlementIdStr;
    });

    revalidatePath('/home/economicManagement/settlements');
    return { success: true, settlementId };
  } catch (error: any) {
    console.error('[saveSettlement]', error);
    return { success: false, error: error?.message || 'Error al guardar la liquidación.' };
  }
}

export async function createSettlement(input: CreateSettlementInput): Promise<SettlementActionResult> {
  return saveSettlementCore(input);
}

export async function updateSettlement(
  settlementId: string,
  input: CreateSettlementInput,
): Promise<SettlementActionResult> {
  if (!settlementId?.trim()) {
    return { success: false, error: 'Liquidación no especificada.' };
  }
  return saveSettlementCore(input, settlementId.trim());
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
      status: resolveSettlementStatus(metadata) === 'BORRADOR' ? 'DRAFT' : 'COMPLETED',
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

  const settlement = await transactionRepo.findOne({
    where: { id: BigInt(settlementId), type: TransactionType.SETTLEMENT },
    relations: ['producer', 'producer.person', 'season'],
  });

  if (!settlement) {
    throw new Error('Liquidación no encontrada');
  }

  // La liquidación es el hijo de todas sus relaciones.
  const relations = await relationRepo.find({
    where: { childTransactionId: String(settlementId) },
  });

  const receptionIds = relations
    .filter((r) => r.relationType === TransactionRelationType.RECEPTION_TO_SETTLEMENT && r.parentTransactionId)
    .map((r) => r.parentTransactionId as string);

  const appliedByAdvance = new Map<string, number>();
  relations
    .filter((r) => r.relationType === TransactionRelationType.ADVANCE_TO_SETTLEMENT && r.parentTransactionId)
    .forEach((r) => {
      const amount = parseAdvanceRelationAmount(r.context);
      appliedByAdvance.set(String(r.parentTransactionId), amount);
    });
  const advanceIds = Array.from(appliedByAdvance.keys());

  const receptions = receptionIds.length > 0
    ? await transactionRepo.find({
        where: { id: In(receptionIds.map((id) => BigInt(id))) },
        relations: ['season'],
      })
    : [];

  const receptionDetails: SettlementDetailReception[] = [];
  for (const reception of receptions) {
    const metadata = reception.metadata as any;
    const packs = await db.getRepository(ReceptionPack).find({
      where: { receptionTransactionId: String(reception.id) },
    });

    const varieties = Array.from(new Set(packs.map(p => p.varietyName).filter(Boolean) as string[]));
    const formats = Array.from(new Set(packs.map(p => p.formatName).filter(Boolean) as string[]));
    const netWeightKg = packs.reduce((sum, p) => sum + Number(p.netWeight), 0);
    const totalPrice = receptionClpAmount(reception);
    const price = netWeightKg > 0 ? totalPrice / netWeightKg : 0;

    receptionDetails.push({
      transactionId: String(reception.id),
      createdAt: reception.createdAt.toISOString(),
      guideNumber: metadata?.guideNumber ?? null,
      varieties,
      formats,
      netWeightKg,
      price,
      totalPrice,
    });
  }

  const advances = advanceIds.length > 0
    ? await transactionRepo.find({
        where: { id: In(advanceIds.map(id => BigInt(id))) },
      })
    : [];

  const advanceDetails: SettlementDetailAdvance[] = advances.map((advance) => {
    const metadata = advance.metadata as AdvanceMetadata;
    const applied = appliedByAdvance.get(String(advance.id)) ?? 0;
    return {
      transactionId: String(advance.id),
      createdAt: advance.createdAt.toISOString(),
      // Monto efectivamente descontado en esta liquidación (no el monto total del anticipo).
      amount: applied > 0 ? applied : Number(advance.amount),
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

  try {
    await db.transaction(async (manager) => {
      const settlement = await manager.findOne(Transaction, {
        where: { id: BigInt(settlementId), type: TransactionType.SETTLEMENT },
      });

      if (!settlement) {
        throw new Error('Liquidación no encontrada');
      }

      // Libera recepciones y anticipos: la liquidación es el hijo de sus relaciones.
      await manager.delete(TransactionRelation, {
        childTransactionId: String(settlementId),
        relationType: In([TransactionRelationType.RECEPTION_TO_SETTLEMENT, TransactionRelationType.ADVANCE_TO_SETTLEMENT]),
      });

      const settlementMetadata = settlement.metadata as SettlementMetadata | null;
      await logTransactionAudit(
        manager,
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

      await manager.remove(settlement);
    });

    revalidatePath('/home/economicManagement/settlements');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting settlement:', error);
    return { success: false, error: error?.message || 'Error al eliminar la liquidación' };
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

  if (resolveSettlementStatus(metadata) !== 'BORRADOR') {
    return null; // Solo se pueden editar liquidaciones en borrador
  }

  const relations = await relationRepo.find({
    where: { childTransactionId: String(settlementId) },
  });
  const linkedReceptionIds = relations
    .filter((r) => r.relationType === TransactionRelationType.RECEPTION_TO_SETTLEMENT)
    .map((r) => String(r.parentTransactionId));
  const linkedAdvanceIds = relations
    .filter((r) => r.relationType === TransactionRelationType.ADVANCE_TO_SETTLEMENT)
    .map((r) => String(r.parentTransactionId));

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
    if (resolveSettlementStatus(metadata) !== 'BORRADOR') {
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