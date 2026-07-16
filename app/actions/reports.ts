'use server';

import { getDb } from '../../data/db';
import { Transaction, TransactionType } from '../../data/entities/Transaction';
import { Producer } from '../../data/entities/Producer';
import { Customer } from '../../data/entities/Customer';
import { Season } from '../../data/entities/Season';
import { ReceptionPack } from '../../data/entities/ReceptionPack';
import { Pallet } from '../../data/entities/Pallet';
import { Variety } from '../../data/entities/Variety';
import { IsNull, Between, MoreThan, LessThan } from 'typeorm';

// Types for report filters
export interface ReportFilters {
  periodType: 'custom' | 'season';
  startDate?: Date;
  endDate?: Date;
  seasonId?: string;
  productiveUnitId?: string;
}

// Helper function to get date range from filters
function getDateRange(filters: ReportFilters): { startDate: Date; endDate: Date } {
  if (filters.periodType === 'custom' && filters.startDate && filters.endDate) {
    return { startDate: filters.startDate, endDate: filters.endDate };
  } else if (filters.periodType === 'season' && filters.seasonId) {
    // This should be handled in the calling function since we need async access to DB
    throw new Error('Season-based filtering should be handled in the calling function');
  }
  // Default to current month
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { startDate, endDate };
}

// Helper function to build date filter for queries
async function buildDateFilter(filters: ReportFilters, db: any): Promise<any> {
  if (filters.periodType === 'custom' && filters.startDate && filters.endDate) {
    return { createdAt: Between(filters.startDate, filters.endDate) };
  } else if (filters.periodType === 'season' && filters.seasonId) {
    const season = await db.getRepository(Season).findOne({ where: { id: filters.seasonId } });
    if (season) {
      return { createdAt: Between(season.startDate, season.endDate) };
    }
  }
  // Default to current month
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { createdAt: Between(startDate, endDate) };
}

// Executive Dashboard Report - Simplified
export interface ExecutiveDashboardData {
  kpis: {
    totalProduction: number;
    totalRevenue: number;
    activeProducers: number;
    totalReceptions: number;
    totalDispatches: number;
  };
  charts: {
    productionByMonth: Array<{ name: string; value: number }>;
    revenueByClient: Array<{ name: string; value: number }>;
  };
}

// Producer Productivity Report
export interface ProducerProductivityData {
  summary: {
    totalProducers: number;
    avgWeightPerProducer: number;
    topProducer: string;
  };
  producers: Array<{
    id: string;
    name: string;
    productiveUnitName?: string;
    totalWeight: number;
    receptionCount: number;
    lastDelivery: Date;
  }>;
}

// Client Analysis Report
export interface ClientAnalysisData {
  summary: {
    totalClients: number;
    totalRevenue: number;
    avgOrderValue: number;
  };
  clientSegments: {
    premium: Array<{ id: string; name: string; revenue: number }>;
    regular: Array<{ id: string; name: string; revenue: number }>;
    occasional: Array<{ id: string; name: string; revenue: number }>;
  };
  topClients: Array<{
    id: string;
    name: string;
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    lastOrder: Date;
  }>;
}

// Operational Reports
export interface OperationalReportsData {
  summary: {
    totalReceptions: number;
    totalDispatches: number;
    efficiency: number;
  };
  dailyOperations: Array<{
    date: string;
    receptions: number;
    dispatches: number;
  }>;
  operations: Array<{
    id: string;
    date: string;
    type: string;
    quantity: number;
    status: string;
  }>;
}

// Financial Reports
export interface FinancialReportsData {
  summary: {
    totalRevenue: number;
    totalDispatches: number;
    avgOrderValue: number;
  };
  monthlyRevenue: Array<{ name: string; value: number }>;
  revenueByClient: Array<{ name: string; value: number }>;
  topClients: Array<{ id?: string; name: string; totalRevenue: number }>;
}

// Inventory Status Report
export interface InventoryStatusData {
  summary: {
    totalPallets: number;
    occupiedPallets: number;
    availablePallets: number;
    utilizationRate: number;
  };
  byStorage: Array<{
    storageId: string;
    storageName: string;
    capacity: number;
    occupied: number;
    available: number;
    utilizationRate: number;
  }>;
  byVariety: Array<{
    varietyName: string;
    totalWeight: number;
    palletCount: number;
  }>;
}

export async function getExecutiveDashboard(filters: ReportFilters): Promise<ExecutiveDashboardData> {
  const db = await getDb();

  // Build date filter
  let dateFilter: any = {};
  if (filters.periodType === 'custom' && filters.startDate && filters.endDate) {
    dateFilter = { createdAt: Between(filters.startDate, filters.endDate) };
  } else if (filters.periodType === 'season' && filters.seasonId) {
    const season = await db.getRepository(Season).findOne({ where: { id: filters.seasonId } });
    if (season) {
      dateFilter = { createdAt: Between(season.startDate, season.endDate) };
    }
  }

  // 1. Real KPIs - only measurable data
  const totalProductionResult = await db.getRepository(ReceptionPack)
    .createQueryBuilder('rp')
    .select('SUM(rp.netWeight)', 'total')
    .where('rp.deletedAt IS NULL')
    .andWhere(dateFilter)
    .getRawOne();

  const totalRevenueResult = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select("SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.sale.totalAmount')) AS DECIMAL(12,2)))", 'total')
    .where('t.type = :type', { type: TransactionType.DISPATCH })
    .andWhere('t.deletedAt IS NULL')
    .andWhere(dateFilter)
    .getRawOne();

  const activeProducersResult = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select('COUNT(DISTINCT t.producerId)', 'count')
    .where('t.producerId IS NOT NULL')
    .andWhere('t.deletedAt IS NULL')
    .andWhere(dateFilter)
    .getRawOne();

  const totalReceptionsResult = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select('COUNT(*)', 'total')
    .where('t.type = :type', { type: TransactionType.RECEPTION })
    .andWhere('t.deletedAt IS NULL')
    .andWhere(dateFilter)
    .getRawOne();

  const totalDispatchesResult = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select('COUNT(*)', 'total')
    .where('t.type = :type', { type: TransactionType.DISPATCH })
    .andWhere('t.deletedAt IS NULL')
    .andWhere(dateFilter)
    .getRawOne();

  // 2. Real Charts data
  const productionByMonth = await db.getRepository(ReceptionPack)
    .createQueryBuilder('rp')
    .select("DATE_FORMAT(rp.createdAt, '%Y-%m')", 'name')
    .addSelect('SUM(rp.netWeight)', 'value')
    .where('rp.deletedAt IS NULL')
    .andWhere(dateFilter)
    .groupBy("DATE_FORMAT(rp.createdAt, '%Y-%m')")
    .orderBy("DATE_FORMAT(rp.createdAt, '%Y-%m')", 'ASC')
    .getRawMany();

  const revenueByClient = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select("JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.client.name'))", 'name')
    .addSelect("SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.sale.totalAmount')) AS DECIMAL(12,2)))", 'value')
    .where('t.type = :type', { type: TransactionType.DISPATCH })
    .andWhere('t.deletedAt IS NULL')
    .andWhere(dateFilter)
    .groupBy("JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.client.name'))")
    .orderBy('value', 'DESC')
    .limit(10)
    .getRawMany();

  return {
    kpis: {
      totalProduction: Number(totalProductionResult?.total || 0),
      totalRevenue: Number(totalRevenueResult?.total || 0),
      activeProducers: Number(activeProducersResult?.count || 0),
      totalReceptions: Number(totalReceptionsResult?.total || 0),
      totalDispatches: Number(totalDispatchesResult?.total || 0),
    },
    charts: {
      productionByMonth: productionByMonth.map(item => ({
        name: item.name,
        value: Number(item.value)
      })),
      revenueByClient: revenueByClient.map(item => ({
        name: item.name || 'Sin nombre',
        value: Number(item.value)
      })),
    },
  };
}

// Producer Productivity Report
export async function getProducerProductivity(filters: ReportFilters): Promise<ProducerProductivityData> {
  const db = await getDb();

  let dateFilter: any = {};
  if (filters.periodType === 'custom' && filters.startDate && filters.endDate) {
    dateFilter = { createdAt: Between(filters.startDate, filters.endDate) };
  } else if (filters.periodType === 'season' && filters.seasonId) {
    const season = await db.getRepository(Season).findOne({ where: { id: filters.seasonId } });
    if (season) {
      dateFilter = { createdAt: Between(season.startDate, season.endDate) };
    }
  }

  const producers = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select('p.id', 'id')
    .addSelect('p.name', 'name')
    .addSelect('pu.name', 'productiveUnitName')
    .addSelect('SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, \'$.totalWeight\')) AS DECIMAL(12,2)))', 'totalWeight')
    .addSelect('COUNT(t.id)', 'receptionCount')
    .addSelect('MAX(t.createdAt)', 'lastDelivery')
    .leftJoin('t.producer', 'p')
    .leftJoin('p.productiveUnit', 'pu')
    .where('t.type = :type', { type: TransactionType.RECEPTION })
    .andWhere('t.deletedAt IS NULL')
    .andWhere('p.deletedAt IS NULL')
    .andWhere(filters.productiveUnitId ? 'pu.id = :unitId' : '1=1', { unitId: filters.productiveUnitId })
    .andWhere(dateFilter.createdAt ? 't.createdAt BETWEEN :start AND :end' : '1=1', {
      start: dateFilter.createdAt?.[1] || new Date(),
      end: dateFilter.createdAt?.[2] || new Date()
    })
    .groupBy('p.id')
    .addGroupBy('p.name')
    .addGroupBy('pu.name')
    .orderBy('totalWeight', 'DESC')
    .getRawMany();

  const totalProducers = producers.length;
  const avgWeightPerProducer = totalProducers > 0
    ? producers.reduce((sum, p) => sum + Number(p.totalWeight || 0), 0) / totalProducers
    : 0;
  const topProducer = producers[0]?.name || 'N/A';

  return {
    producers: producers.map(p => ({
      id: p.id,
      name: p.name,
      productiveUnitName: p.productiveUnitName,
      totalWeight: Number(p.totalWeight || 0),
      receptionCount: Number(p.receptionCount || 0),
      lastDelivery: new Date(p.lastDelivery),
    })),
    summary: {
      totalProducers,
      avgWeightPerProducer,
      topProducer,
    },
  };
}

// Productive Unit Performance Report
export interface ProductiveUnitPerformanceData {
  units: Array<{
    id: string;
    name: string;
    producerCount: number;
    totalProduction: number;
    avgProductionPerProducer: number;
  }>;
  comparison: {
    bestPerforming: string;
    totalUnits: number;
    avgProduction: number;
  };
}

export async function getProductiveUnitPerformance(filters: ReportFilters): Promise<ProductiveUnitPerformanceData> {
  const db = await getDb();

  let dateFilter: any = {};
  if (filters.periodType === 'custom' && filters.startDate && filters.endDate) {
    dateFilter = { createdAt: Between(filters.startDate, filters.endDate) };
  } else if (filters.periodType === 'season' && filters.seasonId) {
    const season = await db.getRepository(Season).findOne({ where: { id: filters.seasonId } });
    if (season) {
      dateFilter = { createdAt: Between(season.startDate, season.endDate) };
    }
  }

  const units = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select('pu.id', 'id')
    .addSelect('pu.name', 'name')
    .addSelect('COUNT(DISTINCT p.id)', 'producerCount')
    .addSelect('SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, \'$.totalWeight\')) AS DECIMAL(12,2)))', 'totalProduction')
    .leftJoin('t.producer', 'p')
    .leftJoin('p.productiveUnit', 'pu')
    .where('t.type = :type', { type: TransactionType.RECEPTION })
    .andWhere('t.deletedAt IS NULL')
    .andWhere('pu.deletedAt IS NULL')
    .andWhere(dateFilter.createdAt ? 't.createdAt BETWEEN :start AND :end' : '1=1', {
      start: dateFilter.createdAt?.[1] || new Date(),
      end: dateFilter.createdAt?.[2] || new Date()
    })
    .groupBy('pu.id')
    .addGroupBy('pu.name')
    .orderBy('totalProduction', 'DESC')
    .getRawMany();

  const processedUnits = units.map(unit => ({
    id: unit.id,
    name: unit.name,
    producerCount: Number(unit.producerCount || 0),
    totalProduction: Number(unit.totalProduction || 0),
    avgProductionPerProducer: Number(unit.producerCount || 0) > 0
      ? Number(unit.totalProduction || 0) / Number(unit.producerCount || 0)
      : 0,
  }));

  const totalUnits = processedUnits.length;
  const avgProduction = totalUnits > 0
    ? processedUnits.reduce((sum, u) => sum + u.totalProduction, 0) / totalUnits
    : 0;
  const bestPerforming = processedUnits[0]?.name || 'N/A';

  return {
    units: processedUnits,
    comparison: {
      bestPerforming,
      totalUnits,
      avgProduction,
    },
  };
}

// Financial Reports implementation using existing transaction metadata
export async function getFinancialReports(filters: ReportFilters): Promise<FinancialReportsData> {
  const db = await getDb();

  // Build date filter
  let dateFilter: any = {};
  if (filters.periodType === 'custom' && filters.startDate && filters.endDate) {
    dateFilter = { createdAt: Between(filters.startDate, filters.endDate) };
  } else if (filters.periodType === 'season' && filters.seasonId) {
    const season = await db.getRepository(Season).findOne({ where: { id: filters.seasonId } });
    if (season) {
      dateFilter = { createdAt: Between(season.startDate, season.endDate) };
    }
  }

  const totalRevenueResult = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select("SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.sale.totalAmount')) AS DECIMAL(12,2)))", 'total')
    .where('t.type = :type', { type: TransactionType.DISPATCH })
    .andWhere('t.deletedAt IS NULL')
    .andWhere(dateFilter)
    .getRawOne();

  const totalDispatchesResult = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select('COUNT(*)', 'total')
    .where('t.type = :type', { type: TransactionType.DISPATCH })
    .andWhere('t.deletedAt IS NULL')
    .andWhere(dateFilter)
    .getRawOne();

  const monthlyRevenue = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select("DATE_FORMAT(t.createdAt, '%Y-%m')", 'name')
    .addSelect("SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.sale.totalAmount')) AS DECIMAL(12,2)))", 'value')
    .where('t.type = :type', { type: TransactionType.DISPATCH })
    .andWhere('t.deletedAt IS NULL')
    .andWhere(dateFilter)
    .groupBy("DATE_FORMAT(t.createdAt, '%Y-%m')")
    .orderBy("DATE_FORMAT(t.createdAt, '%Y-%m')", 'ASC')
    .getRawMany();

  const revenueByClient = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select("JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.client.name'))", 'name')
    .addSelect("SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.sale.totalAmount')) AS DECIMAL(12,2)))", 'value')
    .where('t.type = :type', { type: TransactionType.DISPATCH })
    .andWhere('t.deletedAt IS NULL')
    .andWhere(dateFilter)
    .groupBy("JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.client.name'))")
    .orderBy('value', 'DESC')
    .getRawMany();

  const topClients = revenueByClient.slice(0, 10).map(c => ({ id: undefined, name: c.name || 'Sin nombre', totalRevenue: Number(c.value) }));

  const totalRevenue = Number(totalRevenueResult?.total || 0);
  const totalDispatches = Number(totalDispatchesResult?.total || 0);
  const avgOrderValue = totalDispatches > 0 ? totalRevenue / totalDispatches : 0;

  return {
    summary: {
      totalRevenue,
      totalDispatches,
      avgOrderValue,
    },
    monthlyRevenue: monthlyRevenue.map(m => ({ name: m.name, value: Number(m.value) })),
    revenueByClient: revenueByClient.map(r => ({ name: r.name || 'Sin nombre', value: Number(r.value) })),
    topClients,
  };
}

// Season Comparison Report
export interface SeasonComparisonData {
  seasons: Array<{
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    totalProduction: number;
    producerCount: number;
  }>;
  trends: {
    overallGrowth: number;
  };
}

export async function getSeasonComparison(): Promise<SeasonComparisonData> {
  const db = await getDb();

  const seasons = await db.getRepository(Season)
    .find({
      where: { active: true, deletedAt: IsNull() },
      order: { startDate: 'DESC' },
      take: 5
    });

  const seasonData = await Promise.all(
    seasons.map(async (season) => {
      const production = await db.getRepository(Transaction)
        .createQueryBuilder('t')
        .select('SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, \'$.totalWeight\')) AS DECIMAL(12,2)))', 'total')
        .where('t.type = :type', { type: TransactionType.RECEPTION })
        .andWhere('t.deletedAt IS NULL')
        .andWhere('t.createdAt BETWEEN :start AND :end', {
          start: season.startDate,
          end: season.endDate
        })
        .getRawOne();

      const producerCount = await db.getRepository(Transaction)
        .createQueryBuilder('t')
        .select('COUNT(DISTINCT t.producerId)', 'count')
        .where('t.type = :type', { type: TransactionType.RECEPTION })
        .andWhere('t.producerId IS NOT NULL')
        .andWhere('t.deletedAt IS NULL')
        .andWhere('t.createdAt BETWEEN :start AND :end', {
          start: season.startDate,
          end: season.endDate
        })
        .getRawOne();

      return {
        id: season.id,
        name: season.name,
        startDate: season.startDate,
        endDate: season.endDate,
        totalProduction: Number(production?.total || 0),
        producerCount: Number(producerCount?.count || 0),
      };
    })
  );

  // Calculate growth rates
  for (let i = 1; i < seasonData.length; i++) {
    const current = seasonData[i].totalProduction;
    const previous = seasonData[i - 1].totalProduction;
    // Note: growthRate removed as it's not directly available from entities
  }

  const overallGrowth = seasonData.length > 1
    ? ((seasonData[0].totalProduction - seasonData[seasonData.length - 1].totalProduction) /
       seasonData[seasonData.length - 1].totalProduction) * 100
    : 0;

  return {
    seasons: seasonData,
    trends: {
      overallGrowth,
    },
  };
}

// Sales Analysis Report
export interface SalesAnalysisData {
  summary: {
    totalDispatched: number;
    totalRevenue: number;
    totalTransactions: number;
    avgOrderValue: number;
  };
  byClient: Array<{
    clientId: string;
    clientName: string;
    totalDispatched: number;
    totalRevenue: number;
    transactionCount: number;
    lastOrder: Date;
  }>;
  byVariety: Array<{
    varietyName: string;
    totalDispatched: number;
    totalRevenue: number;
    avgPrice: number;
  }>;
}

export async function getSalesAnalysis(filters: ReportFilters): Promise<SalesAnalysisData> {
  const db = await getDb();

  let dateFilter: any = {};
  if (filters.periodType === 'custom' && filters.startDate && filters.endDate) {
    dateFilter = { createdAt: Between(filters.startDate, filters.endDate) };
  } else if (filters.periodType === 'season' && filters.seasonId) {
    const season = await db.getRepository(Season).findOne({ where: { id: filters.seasonId } });
    if (season) {
      dateFilter = { createdAt: Between(season.startDate, season.endDate) };
    }
  }

  // Summary metrics
  const summary = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select(
      "SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.sale.totalNetWeight')) AS DECIMAL(12,2)))", 'totalDispatched'
    )
    .addSelect(
      "SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.sale.totalAmount')) AS DECIMAL(12,2)))", 'totalRevenue'
    )
    .addSelect('COUNT(t.id)', 'totalTransactions')
    .where('t.type = :type', { type: TransactionType.DISPATCH })
    .andWhere('t.deletedAt IS NULL')
    .andWhere(dateFilter.createdAt ? 't.createdAt BETWEEN :start AND :end' : '1=1', {
      start: dateFilter.createdAt?.[1] || new Date(),
      end: dateFilter.createdAt?.[2] || new Date()
    })
    .getRawOne();

  const totalDispatched = Number(summary?.totalDispatched || 0);
  const totalRevenue = Number(summary?.totalRevenue || 0);
  const totalTransactions = Number(summary?.totalTransactions || 0);
  const avgOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // By Client
  const byClient = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select("JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.client.id'))", 'clientId')
    .addSelect("JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.client.name'))", 'clientName')
    .addSelect(
      "SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.sale.totalNetWeight')) AS DECIMAL(12,2)))", 'totalDispatched'
    )
    .addSelect(
      "SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.sale.totalAmount')) AS DECIMAL(12,2)))", 'totalRevenue'
    )
    .addSelect('COUNT(t.id)', 'transactionCount')
    .addSelect('MAX(t.createdAt)', 'lastOrder')
    .where('t.type = :type', { type: TransactionType.DISPATCH })
    .andWhere('t.deletedAt IS NULL')
    .andWhere(dateFilter.createdAt ? 't.createdAt BETWEEN :start AND :end' : '1=1', {
      start: dateFilter.createdAt?.[1] || new Date(),
      end: dateFilter.createdAt?.[2] || new Date()
    })
    .groupBy('clientId')
    .addGroupBy('clientName')
    .orderBy('totalRevenue', 'DESC')
    .getRawMany();

  // By Variety
  const byVariety = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select("JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.variety.name'))", 'varietyName')
    .addSelect(
      "SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.sale.totalNetWeight')) AS DECIMAL(12,2)))", 'totalDispatched'
    )
    .addSelect(
      "SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.sale.totalAmount')) AS DECIMAL(12,2)))", 'totalRevenue'
    )
    .where('t.type = :type', { type: TransactionType.DISPATCH })
    .andWhere('t.deletedAt IS NULL')
    .andWhere("JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.variety.name')) IS NOT NULL")
    .andWhere(dateFilter.createdAt ? 't.createdAt BETWEEN :start AND :end' : '1=1', {
      start: dateFilter.createdAt?.[1] || new Date(),
      end: dateFilter.createdAt?.[2] || new Date()
    })
    .groupBy("JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.variety.name'))")
    .orderBy('totalDispatched', 'DESC')
    .getRawMany();

  return {
    summary: {
      totalDispatched,
      totalRevenue,
      totalTransactions,
      avgOrderValue,
    },
    byClient: byClient.map(client => ({
      clientId: client.clientId || '',
      clientName: client.clientName || 'Sin nombre',
      totalDispatched: Number(client.totalDispatched || 0),
      totalRevenue: Number(client.totalRevenue || 0),
      transactionCount: Number(client.transactionCount || 0),
      lastOrder: new Date(client.lastOrder),
    })),
    byVariety: byVariety.map(variety => ({
      varietyName: variety.varietyName || 'Sin nombre',
      totalDispatched: Number(variety.totalDispatched || 0),
      totalRevenue: Number(variety.totalRevenue || 0),
      avgPrice: Number(variety.totalDispatched || 0) > 0
        ? Number(variety.totalRevenue || 0) / Number(variety.totalDispatched || 0)
        : 0,
    })),
  };
}

// Client Analysis Report
export async function getClientAnalysis(filters: ReportFilters): Promise<ClientAnalysisData> {
  const db = await getDb();

  let dateFilter: any = {};
  if (filters.periodType === 'custom' && filters.startDate && filters.endDate) {
    dateFilter = { createdAt: Between(filters.startDate, filters.endDate) };
  } else if (filters.periodType === 'season' && filters.seasonId) {
    const season = await db.getRepository(Season).findOne({ where: { id: filters.seasonId } });
    if (season) {
      dateFilter = { createdAt: Between(season.startDate, season.endDate) };
    }
  }

  // Get all client transactions
  const clientTransactions = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select("JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.client.id'))", 'clientId')
    .addSelect("JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.client.name'))", 'clientName')
    .addSelect(
      "SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.sale.totalAmount')) AS DECIMAL(12,2)))", 'totalRevenue'
    )
    .addSelect('COUNT(t.id)', 'totalOrders')
    .addSelect('MAX(t.createdAt)', 'lastOrder')
    .where('t.type = :type', { type: TransactionType.DISPATCH })
    .andWhere('t.deletedAt IS NULL')
    .andWhere(dateFilter.createdAt ? 't.createdAt BETWEEN :start AND :end' : '1=1', {
      start: dateFilter.createdAt?.[1] || new Date(),
      end: dateFilter.createdAt?.[2] || new Date()
    })
    .groupBy("JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.client.id'))")
    .addGroupBy("JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.client.name'))")
    .orderBy('totalRevenue', 'DESC')
    .getRawMany();

  const totalClients = clientTransactions.length;
  const totalRevenue = clientTransactions.reduce((sum, client) => sum + Number(client.totalRevenue || 0), 0);
  const totalOrders = clientTransactions.reduce((sum, client) => sum + Number(client.totalOrders || 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Segment clients by revenue
  const sortedClients = clientTransactions.sort((a, b) => Number(b.totalRevenue || 0) - Number(a.totalRevenue || 0));

  const premiumThreshold = totalRevenue * 0.7; // Top 30% of revenue
  const regularThreshold = totalRevenue * 0.9; // Next 20% of revenue

  let premiumRevenue = 0;
  let regularRevenue = 0;
  let occasionalRevenue = 0;

  const premium: Array<{ id: string; name: string; revenue: number }> = [];
  const regular: Array<{ id: string; name: string; revenue: number }> = [];
  const occasional: Array<{ id: string; name: string; revenue: number }> = [];

  for (const client of sortedClients) {
    const revenue = Number(client.totalRevenue || 0);
    if (premiumRevenue < premiumThreshold) {
      premium.push({
        id: client.clientId || '',
        name: client.clientName || 'Sin nombre',
        revenue
      });
      premiumRevenue += revenue;
    } else if (regularRevenue < (regularThreshold - premiumThreshold)) {
      regular.push({
        id: client.clientId || '',
        name: client.clientName || 'Sin nombre',
        revenue
      });
      regularRevenue += revenue;
    } else {
      occasional.push({
        id: client.clientId || '',
        name: client.clientName || 'Sin nombre',
        revenue
      });
      occasionalRevenue += revenue;
    }
  }

  // Get top 10 clients with detailed info
  const topClients = sortedClients.slice(0, 10).map(client => ({
    id: client.clientId || '',
    name: client.clientName || 'Sin nombre',
    totalRevenue: Number(client.totalRevenue || 0),
    totalOrders: Number(client.totalOrders || 0),
    avgOrderValue: Number(client.totalOrders || 0) > 0
      ? Number(client.totalRevenue || 0) / Number(client.totalOrders || 0)
      : 0,
    lastOrder: new Date(client.lastOrder),
  }));

  return {
    summary: {
      totalClients,
      totalRevenue,
      avgOrderValue,
    },
    clientSegments: {
      premium,
      regular,
      occasional,
    },
    topClients,
  };
}

// Inventory Status Report
export async function getInventoryStatus(filters: ReportFilters): Promise<InventoryStatusData> {
  const db = await getDb();
  const dateFilter = await buildDateFilter(filters, db);

  // Get pallet summary
  const pallets = await db.getRepository(Pallet)
    .find({
      where: { deletedAt: IsNull() },
      relations: ['storage']
    });

  const totalPallets = pallets.length;
  const occupiedPallets = pallets.filter(p => p.traysQuantity > 0).length;
  const availablePallets = totalPallets - occupiedPallets;
  const utilizationRate = totalPallets > 0 ? (occupiedPallets / totalPallets) * 100 : 0;

  // Group by storage
  const storageMap = new Map();
  pallets.forEach(pallet => {
    const storageId = pallet.storageId;
    if (!storageMap.has(storageId)) {
      storageMap.set(storageId, {
        storageId,
        storageName: pallet.storage?.name || 'Sin nombre',
        capacity: pallet.storage?.capacityPallets || 0,
        occupied: 0,
        available: 0,
      });
    }

    const storage = storageMap.get(storageId);
    if (pallet.traysQuantity > 0) {
      storage.occupied++;
    } else {
      storage.available++;
    }
  });

  const byStorage = Array.from(storageMap.values()).map(storage => ({
    ...storage,
    utilizationRate: storage.capacity > 0 ? (storage.occupied / storage.capacity) * 100 : 0,
  }));

  // Group by variety from reception packs
  const varietyData = await db.getRepository(ReceptionPack)
    .createQueryBuilder('rp')
    .select('rp.varietyName', 'varietyName')
    .addSelect('SUM(rp.netWeight)', 'totalWeight')
    .addSelect('COUNT(DISTINCT rp.trayId)', 'palletCount')
    .where('rp.deletedAt IS NULL')
    .groupBy('rp.varietyName')
    .orderBy('totalWeight', 'DESC')
    .getRawMany();

  const byVariety = varietyData.map(variety => ({
    varietyName: variety.varietyName || 'Sin nombre',
    totalWeight: Number(variety.totalWeight || 0),
    palletCount: Number(variety.palletCount || 0),
  }));

  return {
    summary: {
      totalPallets,
      occupiedPallets,
      availablePallets,
      utilizationRate,
    },
    byStorage,
    byVariety,
  };
}

// Operational Reports
export async function getOperationalReports(filters: ReportFilters): Promise<OperationalReportsData> {
  const db = await getDb();
  const dateFilter = await buildDateFilter(filters, db);

  // Get reception and dispatch counts
  const receptionStats = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select('COUNT(*)', 'totalReceptions')
    .addSelect('AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, \'$.totalWeight\')) AS DECIMAL(12,2)))', 'avgReceptionWeight')
    .where('t.type = :receptionType', { receptionType: TransactionType.RECEPTION })
    .andWhere('t.deletedAt IS NULL')
    .andWhere(dateFilter)
    .getRawOne();

  const dispatchStats = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select('COUNT(*)', 'totalDispatches')
    .addSelect('AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, \'$.totalWeight\')) AS DECIMAL(12,2)))', 'avgDispatchWeight')
    .where('t.type = :dispatchType', { dispatchType: TransactionType.DISPATCH })
    .andWhere('t.deletedAt IS NULL')
    .andWhere(dateFilter)
    .getRawOne();

  // Get daily operations
  const dailyOperations = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select('DATE(t.createdAt)', 'date')
    .addSelect('COUNT(CASE WHEN t.type = :receptionType THEN 1 END)', 'receptions')
    .addSelect('COUNT(CASE WHEN t.type = :dispatchType THEN 1 END)', 'dispatches')
    .where('t.deletedAt IS NULL')
    .andWhere(dateFilter)
    .setParameters({ receptionType: TransactionType.RECEPTION, dispatchType: TransactionType.DISPATCH })
    .groupBy('DATE(t.createdAt)')
    .orderBy('DATE(t.createdAt)', 'DESC')
    .getRawMany();

  // Get recent operations
  const operations = await db.getRepository(Transaction)
    .createQueryBuilder('t')
    .select([
      't.id',
      't.createdAt as date',
      't.type',
      'CAST(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, \'$.totalWeight\')) AS DECIMAL(12,2)) as quantity',
      "'completed' as status",
    ])
    .where('t.deletedAt IS NULL')
    .andWhere(dateFilter)
    .orderBy('t.createdAt', 'DESC')
    .limit(50)
    .getRawMany();

  const totalReceptions = Number(receptionStats?.totalReceptions || 0);
  const totalDispatches = Number(dispatchStats?.totalDispatches || 0);
  const efficiency = totalReceptions > 0 ? (totalDispatches / totalReceptions) * 100 : 0;

  return {
    summary: {
      totalReceptions,
      totalDispatches,
      efficiency,
    },
    dailyOperations: dailyOperations.map(day => ({
      date: day.date,
      receptions: Number(day.receptions),
      dispatches: Number(day.dispatches),
    })),
    operations: operations.map(op => ({
      id: op.id,
      date: op.date,
      type: op.type === TransactionType.RECEPTION ? 'Recepción' : 'Despacho',
      quantity: Number(op.quantity || 0),
      status: op.status || 'completed',
    })),
  };
}

// Quality Control Reports
// REMOVED FUNCTIONS - Only data available from entities can be used for reports
//
// The following report functions were removed because they contained extensive placeholder/invented data:
// - getQualityControl: No quality scores available in entities
// - getTrendsAnalysis: No growth rates or trend analysis available in entities
// - getFinancialReports: No detailed financial transaction data available in entities
// - getCustomReports: No custom metrics or advanced analytics available in entities
//
// Only reports that can show real data from the database entities are kept:
// - getExecutiveDashboard: Shows real production, revenue, and producer counts
// - getProducerProductivity: Shows real weights and reception counts by producer
// - getProductiveUnitPerformance: Shows real production by productive units
// - getSeasonComparison: Shows real production comparison between seasons
// - getSalesAnalysis: Shows real sales data by client and variety
// - getClientAnalysis: Shows real client transaction data
// - getInventoryStatus: Shows real pallet and storage utilization
// - getOperationalReports: Shows real reception/dispatch operations