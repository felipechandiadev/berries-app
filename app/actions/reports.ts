'use server';

import { getDb } from '../../data/db';
import { Transaction, TransactionType } from '../../data/entities/Transaction';
import { Producer } from '../../data/entities/Producer';
import { Season } from '../../data/entities/Season';
import { ReceptionPack } from '../../data/entities/ReceptionPack';
import { Pallet } from '../../data/entities/Pallet';
import { Tray } from '../../data/entities/Tray';
import { Storage } from '../../data/entities/Storage';
import { TransactionRelationType } from '../../data/entities/TransactionRelation';
import { IsNull } from 'typeorm';
import type { DataSource } from 'typeorm';

export interface ReportFilters {
  periodType: 'custom' | 'season';
  startDate?: Date;
  endDate?: Date;
  seasonId?: string;
  productiveUnitId?: string;
}

export interface DateRange {
  start: Date;
  end: Date;
  seasonId?: string | null;
  seasonName?: string | null;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function resolveDateRange(filters: ReportFilters, db?: DataSource): Promise<DateRange> {
  const connection = db ?? (await getDb());

  if (filters.periodType === 'custom' && filters.startDate && filters.endDate) {
    return {
      start: startOfDay(new Date(filters.startDate)),
      end: endOfDay(new Date(filters.endDate)),
      seasonId: filters.seasonId ?? null,
      seasonName: null,
    };
  }

  if (filters.periodType === 'season' && filters.seasonId) {
    const season = await connection.getRepository(Season).findOne({
      where: { id: filters.seasonId, deletedAt: IsNull() },
    });
    if (season) {
      return {
        start: startOfDay(new Date(season.startDate)),
        end: endOfDay(new Date(season.endDate)),
        seasonId: season.id,
        seasonName: season.name,
      };
    }
  }

  const activeSeasons = await connection.getRepository(Season).find({
    where: { active: true, deletedAt: IsNull() },
    order: { startDate: 'DESC' },
    take: 1,
  });
  const season = activeSeasons[0];
  if (season) {
    return {
      start: startOfDay(new Date(season.startDate)),
      end: endOfDay(new Date(season.endDate)),
      seasonId: season.id,
      seasonName: season.name,
    };
  }

  const now = new Date();
  return {
    start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    seasonId: null,
    seasonName: null,
  };
}

// ---------- Season Operations ----------

export interface SeasonOperationsData {
  range: DateRange;
  kpis: {
    receptionKg: number;
    warehouseTrays: number;
    warehouseCapacity: number;
    dispatchKg: number;
    pendingSettlementClp: number;
  };
  byMonth: Array<{ name: string; receptions: number; dispatches: number }>;
  byVariety: Array<{ name: string; value: number }>;
}

export async function getSeasonOperations(filters: ReportFilters): Promise<SeasonOperationsData> {
  const db = await getDb();
  const range = await resolveDateRange(filters, db);

  const receptionKgRow = await db.getRepository(ReceptionPack)
    .createQueryBuilder('rp')
    .innerJoin(Transaction, 't', 't.id = rp.receptionTransactionId')
    .select('COALESCE(SUM(rp.netWeight), 0)', 'total')
    .where('rp.deletedAt IS NULL')
    .andWhere('t.deletedAt IS NULL')
    .andWhere('t.type = :type', { type: TransactionType.RECEPTION })
    .andWhere('rp.createdAt BETWEEN :start AND :end', { start: range.start, end: range.end })
    .getRawOne<{ total: string }>();

  const dispatchKgRow = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select(
      "COALESCE(SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.sale.totalNetWeight')) AS DECIMAL(12,2))), 0)",
      'total'
    )
    .where('t.type = :type', { type: TransactionType.DISPATCH })
    .andWhere('t.deletedAt IS NULL')
    .andWhere('t.createdAt BETWEEN :start AND :end', { start: range.start, end: range.end })
    .getRawOne<{ total: string }>();

  const pendingRow = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select('COALESCE(SUM(t.amount), 0)', 'total')
    .where('t.type = :type', { type: TransactionType.RECEPTION })
    .andWhere('t.deletedAt IS NULL')
    .andWhere('t.createdAt BETWEEN :start AND :end', { start: range.start, end: range.end })
    .andWhere(
      `NOT EXISTS (
        SELECT 1 FROM transaction_relations tr
        WHERE tr.parentTransactionId = t.id
          AND tr.relationType = :rel
          AND tr.deletedAt IS NULL
      )`,
      { rel: TransactionRelationType.RECEPTION_TO_SETTLEMENT }
    )
    .getRawOne<{ total: string }>();

  const pallets = await db.getRepository(Pallet).find({ where: { deletedAt: IsNull() } });
  const warehouseTrays = pallets.reduce((sum, p) => sum + Number(p.traysQuantity || 0), 0);
  const warehouseCapacity = pallets.reduce((sum, p) => sum + Number(p.capacity || 0), 0);

  const receptionByMonth = await db.getRepository(ReceptionPack)
    .createQueryBuilder('rp')
    .select("DATE_FORMAT(rp.createdAt, '%Y-%m')", 'name')
    .addSelect('COALESCE(SUM(rp.netWeight), 0)', 'value')
    .where('rp.deletedAt IS NULL')
    .andWhere('rp.createdAt BETWEEN :start AND :end', { start: range.start, end: range.end })
    .groupBy('name')
    .orderBy('name', 'ASC')
    .getRawMany<{ name: string; value: string }>();

  const dispatchByMonth = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select("DATE_FORMAT(t.createdAt, '%Y-%m')", 'name')
    .addSelect(
      "COALESCE(SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.sale.totalNetWeight')) AS DECIMAL(12,2))), 0)",
      'value'
    )
    .where('t.type = :type', { type: TransactionType.DISPATCH })
    .andWhere('t.deletedAt IS NULL')
    .andWhere('t.createdAt BETWEEN :start AND :end', { start: range.start, end: range.end })
    .groupBy('name')
    .orderBy('name', 'ASC')
    .getRawMany<{ name: string; value: string }>();

  const monthMap = new Map<string, { name: string; receptions: number; dispatches: number }>();
  for (const row of receptionByMonth) {
    monthMap.set(row.name, { name: row.name, receptions: Number(row.value || 0), dispatches: 0 });
  }
  for (const row of dispatchByMonth) {
    const existing = monthMap.get(row.name) || { name: row.name, receptions: 0, dispatches: 0 };
    existing.dispatches = Number(row.value || 0);
    monthMap.set(row.name, existing);
  }

  const byVariety = await db.getRepository(ReceptionPack)
    .createQueryBuilder('rp')
    .select('rp.varietyName', 'name')
    .addSelect('COALESCE(SUM(rp.netWeight), 0)', 'value')
    .where('rp.deletedAt IS NULL')
    .andWhere('rp.createdAt BETWEEN :start AND :end', { start: range.start, end: range.end })
    .groupBy('rp.varietyName')
    .orderBy('value', 'DESC')
    .limit(8)
    .getRawMany<{ name: string; value: string }>();

  return {
    range,
    kpis: {
      receptionKg: Number(receptionKgRow?.total || 0),
      warehouseTrays,
      warehouseCapacity,
      dispatchKg: Number(dispatchKgRow?.total || 0),
      pendingSettlementClp: Number(pendingRow?.total || 0),
    },
    byMonth: Array.from(monthMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    byVariety: byVariety.map((v) => ({ name: v.name || 'Sin variedad', value: Number(v.value || 0) })),
  };
}

// ---------- Producer Ledger ----------

export interface ProducerLedgerData {
  range: DateRange;
  summary: {
    totalProducers: number;
    totalKg: number;
    totalClp: number;
    topProducer: string;
  };
  producers: Array<{
    id: string;
    name: string;
    productiveUnitName: string | null;
    receptionCount: number;
    totalKg: number;
    receptionClp: number;
    advancesClp: number;
    pendingReceptionClp: number;
    balance: number;
  }>;
}

export async function getProducerLedger(filters: ReportFilters): Promise<ProducerLedgerData> {
  const db = await getDb();
  const range = await resolveDateRange(filters, db);

  const kgRows = await db.getRepository(ReceptionPack)
    .createQueryBuilder('rp')
    .innerJoin(Transaction, 't', 't.id = rp.receptionTransactionId')
    .leftJoin(Producer, 'p', 'p.id = t.producerId')
    .leftJoin('p.productiveUnit', 'pu')
    .select('p.id', 'id')
    .addSelect('p.name', 'name')
    .addSelect('pu.name', 'productiveUnitName')
    .addSelect('COALESCE(SUM(rp.netWeight), 0)', 'totalKg')
    .addSelect('COUNT(DISTINCT t.id)', 'receptionCount')
    .where('rp.deletedAt IS NULL')
    .andWhere('t.deletedAt IS NULL')
    .andWhere('t.type = :type', { type: TransactionType.RECEPTION })
    .andWhere('p.deletedAt IS NULL')
    .andWhere('rp.createdAt BETWEEN :start AND :end', { start: range.start, end: range.end })
    .andWhere(filters.productiveUnitId ? 'pu.id = :unitId' : '1=1', { unitId: filters.productiveUnitId })
    .groupBy('p.id')
    .addGroupBy('p.name')
    .addGroupBy('pu.name')
    .getRawMany<{
      id: string;
      name: string;
      productiveUnitName: string | null;
      totalKg: string;
      receptionCount: string;
    }>();

  const clpRows = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select('t.producerId', 'producerId')
    .addSelect('COALESCE(SUM(t.amount), 0)', 'receptionClp')
    .where('t.type = :type', { type: TransactionType.RECEPTION })
    .andWhere('t.deletedAt IS NULL')
    .andWhere('t.createdAt BETWEEN :start AND :end', { start: range.start, end: range.end })
    .groupBy('t.producerId')
    .getRawMany<{ producerId: string; receptionClp: string }>();

  const advanceRows = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select('t.producerId', 'producerId')
    .addSelect('COALESCE(SUM(t.amount), 0)', 'advancesClp')
    .where('t.type = :type', { type: TransactionType.ADVANCE })
    .andWhere('t.deletedAt IS NULL')
    .andWhere('t.createdAt BETWEEN :start AND :end', { start: range.start, end: range.end })
    .andWhere(
      `NOT EXISTS (
        SELECT 1 FROM transaction_relations tr
        WHERE tr.parentTransactionId = t.id
          AND tr.relationType = :rel
          AND tr.deletedAt IS NULL
      )`,
      { rel: TransactionRelationType.ADVANCE_TO_SETTLEMENT }
    )
    .groupBy('t.producerId')
    .getRawMany<{ producerId: string; advancesClp: string }>();

  const pendingRows = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select('t.producerId', 'producerId')
    .addSelect('COALESCE(SUM(t.amount), 0)', 'pendingClp')
    .where('t.type = :type', { type: TransactionType.RECEPTION })
    .andWhere('t.deletedAt IS NULL')
    .andWhere('t.createdAt BETWEEN :start AND :end', { start: range.start, end: range.end })
    .andWhere(
      `NOT EXISTS (
        SELECT 1 FROM transaction_relations tr
        WHERE tr.parentTransactionId = t.id
          AND tr.relationType = :rel
          AND tr.deletedAt IS NULL
      )`,
      { rel: TransactionRelationType.RECEPTION_TO_SETTLEMENT }
    )
    .groupBy('t.producerId')
    .getRawMany<{ producerId: string; pendingClp: string }>();

  const clpMap = new Map(clpRows.map((r) => [r.producerId, Number(r.receptionClp || 0)]));
  const advanceMap = new Map(advanceRows.map((r) => [r.producerId, Number(r.advancesClp || 0)]));
  const pendingMap = new Map(pendingRows.map((r) => [r.producerId, Number(r.pendingClp || 0)]));

  const producers = kgRows
    .map((row) => {
      const receptionClp = clpMap.get(row.id) || 0;
      const advancesClp = advanceMap.get(row.id) || 0;
      const pendingReceptionClp = pendingMap.get(row.id) || 0;
      return {
        id: row.id,
        name: row.name,
        productiveUnitName: row.productiveUnitName || null,
        receptionCount: Number(row.receptionCount || 0),
        totalKg: Number(row.totalKg || 0),
        receptionClp,
        advancesClp,
        pendingReceptionClp,
        balance: pendingReceptionClp - advancesClp,
      };
    })
    .sort((a, b) => b.totalKg - a.totalKg);

  const totalKg = producers.reduce((sum, p) => sum + p.totalKg, 0);
  const totalClp = producers.reduce((sum, p) => sum + p.receptionClp, 0);

  return {
    range,
    summary: {
      totalProducers: producers.length,
      totalKg,
      totalClp,
      topProducer: producers[0]?.name || 'N/A',
    },
    producers,
  };
}

// ---------- Warehouse ----------

export interface WarehouseStatusData {
  summary: {
    totalPallets: number;
    occupiedPallets: number;
    totalTrays: number;
    totalCapacity: number;
    utilizationRate: number;
  };
  byStorage: Array<{
    storageId: string;
    storageName: string;
    palletCount: number;
    traysQuantity: number;
    capacity: number;
    fillPercent: number;
  }>;
  pallets: Array<{
    id: number;
    storageName: string;
    traysQuantity: number;
    capacity: number;
    fillPercent: number;
    status: string;
    varietyName: string | null;
  }>;
  trays: Array<{ id: string; name: string; stock: number }>;
  nearFull: Array<{ id: number; storageName: string; fillPercent: number }>;
}

export async function getWarehouseStatus(_filters: ReportFilters): Promise<WarehouseStatusData> {
  const db = await getDb();

  const palletRows = await db.getRepository(Pallet)
    .createQueryBuilder('p')
    .leftJoin(Storage, 's', 's.id = p.storageId')
    .leftJoin('p.variety', 'v')
    .select([
      'p.id AS id',
      'p.traysQuantity AS traysQuantity',
      'p.capacity AS capacity',
      'p.status AS status',
      'p.storageId AS storageId',
      's.name AS storageName',
      'v.name AS varietyName',
    ])
    .where('p.deletedAt IS NULL')
    .orderBy('p.id', 'ASC')
    .getRawMany<{
      id: number;
      traysQuantity: number;
      capacity: number;
      status: string;
      storageId: string | null;
      storageName: string | null;
      varietyName: string | null;
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
      varietyName: row.varietyName || null,
      storageId: row.storageId || 'none',
    };
  });

  const storageMap = new Map<
    string,
    { storageId: string; storageName: string; palletCount: number; traysQuantity: number; capacity: number }
  >();

  for (const pallet of pallets) {
    const key = pallet.storageId;
    if (!storageMap.has(key)) {
      storageMap.set(key, {
        storageId: key,
        storageName: pallet.storageName,
        palletCount: 0,
        traysQuantity: 0,
        capacity: 0,
      });
    }
    const entry = storageMap.get(key)!;
    entry.palletCount += 1;
    entry.traysQuantity += pallet.traysQuantity;
    entry.capacity += pallet.capacity;
  }

  const byStorage = Array.from(storageMap.values()).map((s) => ({
    storageId: s.storageId,
    storageName: s.storageName,
    palletCount: s.palletCount,
    traysQuantity: s.traysQuantity,
    capacity: s.capacity,
    fillPercent: s.capacity > 0 ? Number(((s.traysQuantity / s.capacity) * 100).toFixed(1)) : 0,
  }));

  const trays = await db.getRepository(Tray).find({
    where: { deletedAt: IsNull(), active: true },
    order: { name: 'ASC' },
  });

  const totalTrays = pallets.reduce((sum, p) => sum + p.traysQuantity, 0);
  const totalCapacity = pallets.reduce((sum, p) => sum + p.capacity, 0);
  const occupiedPallets = pallets.filter((p) => p.traysQuantity > 0).length;

  return {
    summary: {
      totalPallets: pallets.length,
      occupiedPallets,
      totalTrays,
      totalCapacity,
      utilizationRate: totalCapacity > 0 ? Number(((totalTrays / totalCapacity) * 100).toFixed(1)) : 0,
    },
    byStorage,
    pallets: pallets.map(({ storageId: _s, ...rest }) => rest),
    trays: trays.map((t) => ({ id: t.id, name: t.name, stock: Number(t.stock || 0) })),
    nearFull: pallets
      .filter((p) => p.fillPercent >= 70)
      .sort((a, b) => b.fillPercent - a.fillPercent)
      .slice(0, 8)
      .map((p) => ({ id: p.id, storageName: p.storageName, fillPercent: p.fillPercent })),
  };
}

// ---------- Settlements & Advances ----------

export interface SettlementsAdvancesData {
  range: DateRange;
  summary: {
    totalAdvancesClp: number;
    appliedAdvancesClp: number;
    pendingAdvancesClp: number;
    pendingReceptionsClp: number;
    settledReceptionsClp: number;
  };
  byProducer: Array<{
    producerId: string;
    producerName: string;
    advancesClp: number;
    pendingReceptionsClp: number;
    balance: number;
  }>;
}

export async function getSettlementsAdvances(filters: ReportFilters): Promise<SettlementsAdvancesData> {
  const db = await getDb();
  const range = await resolveDateRange(filters, db);

  const totalAdvancesRow = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select('COALESCE(SUM(t.amount), 0)', 'total')
    .where('t.type = :type', { type: TransactionType.ADVANCE })
    .andWhere('t.deletedAt IS NULL')
    .andWhere('t.createdAt BETWEEN :start AND :end', { start: range.start, end: range.end })
    .getRawOne<{ total: string }>();

  const pendingAdvancesRow = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select('COALESCE(SUM(t.amount), 0)', 'total')
    .where('t.type = :type', { type: TransactionType.ADVANCE })
    .andWhere('t.deletedAt IS NULL')
    .andWhere('t.createdAt BETWEEN :start AND :end', { start: range.start, end: range.end })
    .andWhere(
      `NOT EXISTS (
        SELECT 1 FROM transaction_relations tr
        WHERE tr.parentTransactionId = t.id
          AND tr.relationType = :rel
          AND tr.deletedAt IS NULL
      )`,
      { rel: TransactionRelationType.ADVANCE_TO_SETTLEMENT }
    )
    .getRawOne<{ total: string }>();

  const pendingReceptionsRow = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select('COALESCE(SUM(t.amount), 0)', 'total')
    .where('t.type = :type', { type: TransactionType.RECEPTION })
    .andWhere('t.deletedAt IS NULL')
    .andWhere('t.createdAt BETWEEN :start AND :end', { start: range.start, end: range.end })
    .andWhere(
      `NOT EXISTS (
        SELECT 1 FROM transaction_relations tr
        WHERE tr.parentTransactionId = t.id
          AND tr.relationType = :rel
          AND tr.deletedAt IS NULL
      )`,
      { rel: TransactionRelationType.RECEPTION_TO_SETTLEMENT }
    )
    .getRawOne<{ total: string }>();

  const settledReceptionsRow = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select('COALESCE(SUM(t.amount), 0)', 'total')
    .where('t.type = :type', { type: TransactionType.RECEPTION })
    .andWhere('t.deletedAt IS NULL')
    .andWhere('t.createdAt BETWEEN :start AND :end', { start: range.start, end: range.end })
    .andWhere(
      `EXISTS (
        SELECT 1 FROM transaction_relations tr
        WHERE tr.parentTransactionId = t.id
          AND tr.relationType = :rel
          AND tr.deletedAt IS NULL
      )`,
      { rel: TransactionRelationType.RECEPTION_TO_SETTLEMENT }
    )
    .getRawOne<{ total: string }>();

  const byProducerRows = await db.getRepository(Producer)
    .createQueryBuilder('p')
    .select('p.id', 'producerId')
    .addSelect('p.name', 'producerName')
    .addSelect(
      `(SELECT COALESCE(SUM(a.amount), 0) FROM transactions a
        WHERE a.producerId = p.id AND a.type = 'ADVANCE' AND a.deletedAt IS NULL
          AND a.createdAt BETWEEN :start AND :end
          AND NOT EXISTS (
            SELECT 1 FROM transaction_relations tr
            WHERE tr.parentTransactionId = a.id
              AND tr.relationType = 'ADVANCE_TO_SETTLEMENT'
              AND tr.deletedAt IS NULL
          ))`,
      'advancesClp'
    )
    .addSelect(
      `(SELECT COALESCE(SUM(r.amount), 0) FROM transactions r
        WHERE r.producerId = p.id AND r.type = 'RECEPTION' AND r.deletedAt IS NULL
          AND r.createdAt BETWEEN :start AND :end
          AND NOT EXISTS (
            SELECT 1 FROM transaction_relations tr
            WHERE tr.parentTransactionId = r.id
              AND tr.relationType = 'RECEPTION_TO_SETTLEMENT'
              AND tr.deletedAt IS NULL
          ))`,
      'pendingReceptionsClp'
    )
    .where('p.deletedAt IS NULL')
    .setParameters({ start: range.start, end: range.end })
    .getRawMany<{
      producerId: string;
      producerName: string;
      advancesClp: string;
      pendingReceptionsClp: string;
    }>();

  const byProducer = byProducerRows
    .map((row) => {
      const advancesClp = Number(row.advancesClp || 0);
      const pendingReceptionsClp = Number(row.pendingReceptionsClp || 0);
      return {
        producerId: row.producerId,
        producerName: row.producerName,
        advancesClp,
        pendingReceptionsClp,
        balance: pendingReceptionsClp - advancesClp,
      };
    })
    .filter((row) => row.advancesClp > 0 || row.pendingReceptionsClp > 0)
    .sort((a, b) => b.balance - a.balance);

  const totalAdvancesClp = Number(totalAdvancesRow?.total || 0);
  const pendingAdvancesClp = Number(pendingAdvancesRow?.total || 0);

  return {
    range,
    summary: {
      totalAdvancesClp,
      appliedAdvancesClp: totalAdvancesClp - pendingAdvancesClp,
      pendingAdvancesClp,
      pendingReceptionsClp: Number(pendingReceptionsRow?.total || 0),
      settledReceptionsClp: Number(settledReceptionsRow?.total || 0),
    },
    byProducer,
  };
}

// ---------- Sales & Clients ----------

export interface SalesClientsData {
  range: DateRange;
  summary: {
    totalRevenue: number;
    totalDispatches: number;
    totalKg: number;
    avgOrderValue: number;
  };
  byClient: Array<{
    clientId: string;
    clientName: string;
    totalRevenue: number;
    totalOrders: number;
    totalKg: number;
    lastOrder: string | null;
  }>;
  monthlyRevenue: Array<{ name: string; value: number }>;
}

export async function getSalesClients(filters: ReportFilters): Promise<SalesClientsData> {
  const db = await getDb();
  const range = await resolveDateRange(filters, db);

  const summaryRow = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select(
      "COALESCE(SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.sale.totalAmount')) AS DECIMAL(12,2))), 0)",
      'totalRevenue'
    )
    .addSelect('COUNT(*)', 'totalDispatches')
    .addSelect(
      "COALESCE(SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.sale.totalNetWeight')) AS DECIMAL(12,2))), 0)",
      'totalKg'
    )
    .where('t.type = :type', { type: TransactionType.DISPATCH })
    .andWhere('t.deletedAt IS NULL')
    .andWhere('t.createdAt BETWEEN :start AND :end', { start: range.start, end: range.end })
    .getRawOne<{ totalRevenue: string; totalDispatches: string; totalKg: string }>();

  const byClient = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select("COALESCE(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.client.id')), t.clientId, '')", 'clientId')
    .addSelect("COALESCE(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.client.name')), 'Sin nombre')", 'clientName')
    .addSelect(
      "COALESCE(SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.sale.totalAmount')) AS DECIMAL(12,2))), 0)",
      'totalRevenue'
    )
    .addSelect('COUNT(*)', 'totalOrders')
    .addSelect(
      "COALESCE(SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.sale.totalNetWeight')) AS DECIMAL(12,2))), 0)",
      'totalKg'
    )
    .addSelect('MAX(t.createdAt)', 'lastOrder')
    .where('t.type = :type', { type: TransactionType.DISPATCH })
    .andWhere('t.deletedAt IS NULL')
    .andWhere('t.createdAt BETWEEN :start AND :end', { start: range.start, end: range.end })
    .groupBy("COALESCE(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.client.id')), t.clientId, '')")
    .addGroupBy("COALESCE(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.client.name')), 'Sin nombre')")
    .orderBy('totalRevenue', 'DESC')
    .getRawMany<{
      clientId: string;
      clientName: string;
      totalRevenue: string;
      totalOrders: string;
      totalKg: string;
      lastOrder: Date | null;
    }>();

  const monthlyRevenue = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select("DATE_FORMAT(t.createdAt, '%Y-%m')", 'name')
    .addSelect(
      "COALESCE(SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.sale.totalAmount')) AS DECIMAL(12,2))), 0)",
      'value'
    )
    .where('t.type = :type', { type: TransactionType.DISPATCH })
    .andWhere('t.deletedAt IS NULL')
    .andWhere('t.createdAt BETWEEN :start AND :end', { start: range.start, end: range.end })
    .groupBy('name')
    .orderBy('name', 'ASC')
    .getRawMany<{ name: string; value: string }>();

  const totalRevenue = Number(summaryRow?.totalRevenue || 0);
  const totalDispatches = Number(summaryRow?.totalDispatches || 0);

  return {
    range,
    summary: {
      totalRevenue,
      totalDispatches,
      totalKg: Number(summaryRow?.totalKg || 0),
      avgOrderValue: totalDispatches > 0 ? totalRevenue / totalDispatches : 0,
    },
    byClient: byClient.map((c) => ({
      clientId: c.clientId || '',
      clientName: c.clientName || 'Sin nombre',
      totalRevenue: Number(c.totalRevenue || 0),
      totalOrders: Number(c.totalOrders || 0),
      totalKg: Number(c.totalKg || 0),
      lastOrder: c.lastOrder ? new Date(c.lastOrder).toISOString() : null,
    })),
    monthlyRevenue: monthlyRevenue.map((m) => ({ name: m.name, value: Number(m.value || 0) })),
  };
}
