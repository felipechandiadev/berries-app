'use server';

import { getDb } from '../../data/db';
import { Transaction, TransactionType } from '../../data/entities/Transaction';
import { ReceptionPack } from '../../data/entities/ReceptionPack';
import { Producer } from '../../data/entities/Producer';
import { Pallet } from '../../data/entities/Pallet';
import { IsNull, Not } from 'typeorm';

export interface DashboardStats {
  producersCount: number;
  receptions: {
    totalWeight: number;
    byVariety: { name: string; value: number }[];
    byMonth: { name: string; value: number }[];
  };
  dispatches: {
    totalWeight: number;
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = await getDb();
  
  // 1. Producers Count
  const producersCount = await db.getRepository(Producer).count({
    where: { deletedAt: IsNull() }
  });

  // 2. Receptions Stats (using ReceptionPack)
  const receptionRepo = db.getRepository(ReceptionPack);
  
  // Total Weight
  const receptionTotal = await receptionRepo
    .createQueryBuilder('rp')
    .select('SUM(rp.netWeight)', 'total')
    .where('rp.deletedAt IS NULL')
    .getRawOne();

  // By Variety
  const receptionByVariety = await receptionRepo
    .createQueryBuilder('rp')
    .select('rp.varietyName', 'name')
    .addSelect('SUM(rp.netWeight)', 'value')
    .where('rp.deletedAt IS NULL')
    .groupBy('rp.varietyName')
    .orderBy('value', 'DESC')
    .limit(5)
    .getRawMany();

  // By Month (Last 6 months)
  // Note: Syntax might vary between MySQL and SQLite. Assuming MySQL based on package.json
  const receptionByMonth = await receptionRepo
    .createQueryBuilder('rp')
    .select("DATE_FORMAT(rp.createdAt, '%Y-%m')", 'name')
    .addSelect('SUM(rp.netWeight)', 'value')
    .where('rp.deletedAt IS NULL')
    .groupBy('name')
    .orderBy('name', 'ASC')
    .limit(6)
    .getRawMany();

  // 3. Dispatches Stats (using Transaction)
  const transactionRepo = db.getRepository(Transaction);
  
  // Total Weight
  const dispatchTotal = await transactionRepo
    .createQueryBuilder('t')
    .select("SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.sale.totalNetWeight')) AS DECIMAL(12,2)))", 'total')
    .where('t.type = :type', { type: TransactionType.DISPATCH })
    .andWhere('t.deletedAt IS NULL')
    .getRawOne();

  return {
    producersCount,
    receptions: {
      totalWeight: Number(receptionTotal?.total || 0),
      byVariety: receptionByVariety.map(item => ({ name: item.name, value: Number(item.value) })),
      byMonth: receptionByMonth.map(item => ({ name: item.name, value: Number(item.value) })),
    },
    dispatches: {
      totalWeight: Number(dispatchTotal?.total || 0),
    },
  };
}
