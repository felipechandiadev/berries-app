'use server';

import { getDb } from '../../data/db';
import { Transaction, TransactionType } from '../../data/entities/Transaction';
import { ReceptionPack } from '../../data/entities/ReceptionPack';
import { Producer } from '../../data/entities/Producer';
import { Pallet } from '../../data/entities/Pallet';
import { Tray } from '../../data/entities/Tray';
import { Season } from '../../data/entities/Season';
import { Storage } from '../../data/entities/Storage';
import { TransactionRelationType } from '../../data/entities/TransactionRelation';
import { IsNull } from 'typeorm';

export type DashboardRange = 'today' | '7d' | 'season';

export interface DashboardStats {
  season: {
    id: string | null;
    name: string;
    startDate: string | null;
    endDate: string | null;
  };
  range: DashboardRange;
  producersCount: number;
  receptions: {
    totalWeight: number;
    previousWeight: number;
    deltaPercent: number | null;
    byVariety: { name: string; value: number }[];
    byMonth: { name: string; receptions: number; dispatches: number }[];
  };
  dispatches: {
    totalWeight: number;
    previousWeight: number;
    deltaPercent: number | null;
  };
  warehouse: {
    totalTraysOnPallets: number;
    totalCapacity: number;
    pallets: {
      id: number;
      storageName: string;
      traysQuantity: number;
      capacity: number;
      fillPercent: number;
      status: string;
    }[];
    trays: {
      id: string;
      name: string;
      stock: number;
    }[];
  };
  pendingSettlementClp: number;
  recentReceptions: {
    id: string;
    producerName: string;
    netWeightKg: number;
    totalClp: number;
    createdAt: string;
  }[];
  nearFullPallets: {
    id: number;
    storageName: string;
    traysQuantity: number;
    capacity: number;
    fillPercent: number;
  }[];
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function computeDeltaPercent(current: number, previous: number): number | null {
  if (previous <= 0) {
    return current > 0 ? 100 : null;
  }
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function resolveRangeBounds(range: DashboardRange, seasonStart: Date | null): {
  currentStart: Date | null;
  currentEnd: Date;
  previousStart: Date | null;
  previousEnd: Date | null;
} {
  const now = new Date();
  const end = now;

  if (range === 'today') {
    const currentStart = startOfDay(now);
    const previousStart = addDays(currentStart, -1);
    const previousEnd = currentStart;
    return { currentStart, currentEnd: end, previousStart, previousEnd };
  }

  if (range === '7d') {
    const currentStart = addDays(startOfDay(now), -6);
    const previousEnd = currentStart;
    const previousStart = addDays(previousEnd, -7);
    return { currentStart, currentEnd: end, previousStart, previousEnd };
  }

  const currentStart = seasonStart ? startOfDay(seasonStart) : null;
  return { currentStart, currentEnd: end, previousStart: null, previousEnd: null };
}

export async function getDashboardStats(range: DashboardRange = 'season'): Promise<DashboardStats> {
  const db = await getDb();

  const seasons = await db.getRepository(Season).find({
    where: { active: true, deletedAt: IsNull() },
    order: { startDate: 'DESC' },
    take: 1,
  });
  const season = seasons[0] ?? null;

  const seasonStart = season?.startDate ? new Date(season.startDate) : null;
  const bounds = resolveRangeBounds(range, seasonStart);

  const producersCount = await db.getRepository(Producer).count({
    where: { deletedAt: IsNull() },
  });

  const receptionRepo = db.getRepository(ReceptionPack);

  const buildReceptionWeightQuery = (from: Date | null, to: Date | null) => {
    const qb = receptionRepo
      .createQueryBuilder('rp')
      .select('COALESCE(SUM(rp.netWeight), 0)', 'total')
      .where('rp.deletedAt IS NULL');
    if (from) {
      qb.andWhere('rp.createdAt >= :from', { from });
    }
    if (to) {
      qb.andWhere('rp.createdAt < :to', { to });
    }
    return qb.getRawOne<{ total: string }>();
  };

  const receptionTotal = await buildReceptionWeightQuery(bounds.currentStart, null);
  const receptionPrevious = bounds.previousStart && bounds.previousEnd
    ? await buildReceptionWeightQuery(bounds.previousStart, bounds.previousEnd)
    : { total: '0' };

  const receptionTotalWeight = Number(receptionTotal?.total || 0);
  const receptionPreviousWeight = Number(receptionPrevious?.total || 0);

  const varietyQb = receptionRepo
    .createQueryBuilder('rp')
    .select('rp.varietyName', 'name')
    .addSelect('SUM(rp.netWeight)', 'value')
    .where('rp.deletedAt IS NULL')
    .groupBy('rp.varietyName')
    .orderBy('value', 'DESC')
    .limit(5);

  if (bounds.currentStart) {
    varietyQb.andWhere('rp.createdAt >= :from', { from: bounds.currentStart });
  }

  const receptionByVariety = await varietyQb.getRawMany<{ name: string; value: string }>();

  const receptionByMonth = await receptionRepo
    .createQueryBuilder('rp')
    .select("DATE_FORMAT(rp.createdAt, '%Y-%m')", 'name')
    .addSelect('COALESCE(SUM(rp.netWeight), 0)', 'value')
    .where('rp.deletedAt IS NULL')
    .groupBy('name')
    .orderBy('name', 'ASC')
    .limit(12)
    .getRawMany<{ name: string; value: string }>();

  const transactionRepo = db.getRepository(Transaction);

  const buildDispatchWeightQuery = (from: Date | null, to: Date | null) => {
    const qb = transactionRepo
      .createQueryBuilder('t')
      .select(
        "COALESCE(SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.sale.totalNetWeight')) AS DECIMAL(12,2))), 0)",
        'total'
      )
      .where('t.type = :type', { type: TransactionType.DISPATCH })
      .andWhere('t.deletedAt IS NULL');
    if (from) {
      qb.andWhere('t.createdAt >= :from', { from });
    }
    if (to) {
      qb.andWhere('t.createdAt < :to', { to });
    }
    return qb.getRawOne<{ total: string }>();
  };

  const dispatchTotal = await buildDispatchWeightQuery(bounds.currentStart, null);
  const dispatchPrevious = bounds.previousStart && bounds.previousEnd
    ? await buildDispatchWeightQuery(bounds.previousStart, bounds.previousEnd)
    : { total: '0' };

  const dispatchTotalWeight = Number(dispatchTotal?.total || 0);
  const dispatchPreviousWeight = Number(dispatchPrevious?.total || 0);

  const dispatchByMonth = await transactionRepo
    .createQueryBuilder('t')
    .select("DATE_FORMAT(t.createdAt, '%Y-%m')", 'name')
    .addSelect(
      "COALESCE(SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.sale.totalNetWeight')) AS DECIMAL(12,2))), 0)",
      'value'
    )
    .where('t.type = :type', { type: TransactionType.DISPATCH })
    .andWhere('t.deletedAt IS NULL')
    .groupBy('name')
    .orderBy('name', 'ASC')
    .limit(12)
    .getRawMany<{ name: string; value: string }>();

  const monthMap = new Map<string, { name: string; receptions: number; dispatches: number }>();
  for (const row of receptionByMonth) {
    monthMap.set(row.name, {
      name: row.name,
      receptions: Number(row.value || 0),
      dispatches: 0,
    });
  }
  for (const row of dispatchByMonth) {
    const existing = monthMap.get(row.name) || { name: row.name, receptions: 0, dispatches: 0 };
    existing.dispatches = Number(row.value || 0);
    monthMap.set(row.name, existing);
  }
  const byMonth = Array.from(monthMap.values()).sort((a, b) => a.name.localeCompare(b.name)).slice(-6);

  const pendingSettlement = await transactionRepo
    .createQueryBuilder('t')
    .select('COALESCE(SUM(t.amount), 0)', 'total')
    .where('t.type = :type', { type: TransactionType.RECEPTION })
    .andWhere('t.deletedAt IS NULL')
    .andWhere(
      `NOT EXISTS (
        SELECT 1 FROM transaction_relations tr
        WHERE tr.parentTransactionId = t.id
          AND tr.relationType = :settlementType
          AND tr.deletedAt IS NULL
      )`,
      { settlementType: TransactionRelationType.RECEPTION_TO_SETTLEMENT }
    )
    .getRawOne<{ total: string }>();

  const recentReceptionRows = await transactionRepo
    .createQueryBuilder('t')
    .leftJoin(Producer, 'p', 'p.id = t.producerId')
    .select([
      't.id AS id',
      't.amount AS amount',
      't.createdAt AS createdAt',
      't.metadata AS metadata',
      'p.name AS producerName',
    ])
    .where('t.type = :type', { type: TransactionType.RECEPTION })
    .andWhere('t.deletedAt IS NULL')
    .orderBy('t.createdAt', 'DESC')
    .limit(5)
    .getRawMany<{
      id: string;
      amount: string;
      createdAt: Date;
      metadata: string | Record<string, unknown> | null;
      producerName: string | null;
    }>();

  const recentReceptions = recentReceptionRows.map((row) => {
    let metadata: any = row.metadata;
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch {
        metadata = {};
      }
    }
    const netWeightKg = Number(metadata?.totals?.netWeightKg ?? 0);
    return {
      id: String(row.id),
      producerName: row.producerName || metadata?.producerName || 'Sin productor',
      netWeightKg,
      totalClp: Number(row.amount || 0),
      createdAt: new Date(row.createdAt).toISOString(),
    };
  });

  const palletRepo = db.getRepository(Pallet);
  const palletRows = await palletRepo
    .createQueryBuilder('p')
    .leftJoin(Storage, 's', 's.id = p.storageId')
    .select([
      'p.id AS id',
      'p.traysQuantity AS traysQuantity',
      'p.capacity AS capacity',
      'p.status AS status',
      's.name AS storageName',
    ])
    .where('p.deletedAt IS NULL')
    .orderBy('p.id', 'ASC')
    .getRawMany<{
      id: number;
      traysQuantity: number;
      capacity: number;
      status: string;
      storageName: string | null;
    }>();

  const pallets = palletRows.map((row) => {
    const traysQuantity = Number(row.traysQuantity || 0);
    const capacity = Number(row.capacity || 0);
    const fillPercent = capacity > 0 ? Number(((traysQuantity / capacity) * 100).toFixed(1)) : 0;
    return {
      id: Number(row.id),
      storageName: row.storageName || 'Sin almacén',
      traysQuantity,
      capacity,
      fillPercent,
      status: String(row.status || 'AVAILABLE'),
    };
  });

  const totalTraysOnPallets = pallets.reduce((sum, p) => sum + p.traysQuantity, 0);
  const totalCapacity = pallets.reduce((sum, p) => sum + p.capacity, 0);

  const nearFullPallets = pallets
    .filter((p) => p.fillPercent >= 70)
    .sort((a, b) => b.fillPercent - a.fillPercent)
    .slice(0, 5)
    .map(({ id, storageName, traysQuantity, capacity, fillPercent }) => ({
      id,
      storageName,
      traysQuantity,
      capacity,
      fillPercent,
    }));

  const trays = await db.getRepository(Tray).find({
    where: { deletedAt: IsNull(), active: true },
    order: { name: 'ASC' },
    take: 6,
  });

  return {
    season: {
      id: season?.id ?? null,
      name: season?.name ?? 'Sin temporada activa',
      startDate: season?.startDate ? new Date(season.startDate).toISOString() : null,
      endDate: season?.endDate ? new Date(season.endDate).toISOString() : null,
    },
    range,
    producersCount,
    receptions: {
      totalWeight: receptionTotalWeight,
      previousWeight: receptionPreviousWeight,
      deltaPercent: range === 'season' ? null : computeDeltaPercent(receptionTotalWeight, receptionPreviousWeight),
      byVariety: receptionByVariety.map((item) => ({
        name: item.name || 'Sin variedad',
        value: Number(item.value || 0),
      })),
      byMonth,
    },
    dispatches: {
      totalWeight: dispatchTotalWeight,
      previousWeight: dispatchPreviousWeight,
      deltaPercent: range === 'season' ? null : computeDeltaPercent(dispatchTotalWeight, dispatchPreviousWeight),
    },
    warehouse: {
      totalTraysOnPallets,
      totalCapacity,
      pallets,
      trays: trays.map((tray) => ({
        id: tray.id,
        name: tray.name,
        stock: Number(tray.stock || 0),
      })),
    },
    pendingSettlementClp: Number(pendingSettlement?.total || 0),
    recentReceptions,
    nearFullPallets,
  };
}
