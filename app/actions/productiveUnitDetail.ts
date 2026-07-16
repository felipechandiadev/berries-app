'use server';

import { getDb } from '@/data/db';
import { ProductiveUnit } from '@/data/entities/ProductiveUnit';
import { Producer } from '@/data/entities/Producer';
import { Transaction, TransactionType } from '@/data/entities/Transaction';
import { In, IsNull } from 'typeorm';
import type { ProductiveUnitDetailData } from '@/app/home/productiveManagement/productiveUnits/ui/ProductiveUnitDetail/types';

function enrichReception(reception: Transaction, settledReceptionIds: Set<string>, producerName: string) {
  const metadata = reception.metadata as any;

  let variety = 'N/A';
  let formatName = 'N/A';
  let price = 0;
  let netWeight = 0;

  if (metadata?.packs && Array.isArray(metadata.packs) && metadata.packs.length > 0) {
    const firstPack = metadata.packs[0];
    variety = firstPack.varietyName || 'N/A';
    formatName = firstPack.formatName || 'N/A';
    price = firstPack.pricePerKg || 0;
    netWeight = metadata.packs.reduce(
      (sum: number, p: any) => sum + (Number(p.netWeightKg ?? p.netWeight) || 0),
      0
    );

    if (metadata.packs.length > 1) {
      const varieties = [...new Set(metadata.packs.map((p: any) => p.varietyName).filter(Boolean))];
      const formats = [...new Set(metadata.packs.map((p: any) => p.formatName).filter(Boolean))];

      if (varieties.length > 1) variety = `${varieties.length} variedades`;
      if (formats.length > 1) formatName = `${formats.length} formatos`;

      const prices = metadata.packs.map((p: any) => p.pricePerKg).filter((p: number) => p > 0);
      if (prices.length > 0) {
        price = prices.reduce((sum: number, p: number) => sum + p, 0) / prices.length;
      }
    }
  } else if (metadata?.totals?.netWeightKg != null) {
    netWeight = Number(metadata.totals.netWeightKg) || 0;
  }

  return {
    ...reception,
    variety,
    formatName,
    price,
    netWeight,
    producerId: reception.producerId || undefined,
    producerName,
    status: settledReceptionIds.has(String(reception.id)) ? 'Liquidada' : 'Pendiente',
  };
}

export async function getProductiveUnitDetailData(
  unitId: string
): Promise<{ success: boolean; data?: ProductiveUnitDetailData; error?: string }> {
  try {
    const db = await getDb();

    const unit = await db.getRepository(ProductiveUnit).findOne({
      where: { id: unitId, deletedAt: IsNull() },
    });

    if (!unit) {
      return { success: false, error: 'Unidad productiva no encontrada' };
    }

    const producers = await db.getRepository(Producer).find({
      where: { productiveUnitId: unitId, deletedAt: IsNull() },
      order: { name: 'ASC' },
    });

    const producerIds = producers.map((p) => p.id);
    const producerNameById = new Map(producers.map((p) => [p.id, p.name]));

    if (producerIds.length === 0) {
      const emptyData = JSON.parse(
        JSON.stringify({
          unit: {
            id: unit.id,
            name: unit.name,
            location: unit.location || undefined,
          },
          producers: [],
          receptions: [],
          advances: [],
          settlements: [],
        })
      ) as ProductiveUnitDetailData;

      return { success: true, data: emptyData };
    }

    const [receptions, advances, settlements] = await Promise.all([
      db.getRepository(Transaction).find({
        where: {
          producerId: In(producerIds),
          type: TransactionType.RECEPTION,
        },
        relations: ['format'],
        order: { createdAt: 'DESC' },
      }),
      db.getRepository(Transaction).find({
        where: {
          producerId: In(producerIds),
          type: TransactionType.ADVANCE,
        },
        order: { createdAt: 'DESC' },
      }),
      db.getRepository(Transaction).find({
        where: {
          producerId: In(producerIds),
          type: TransactionType.SETTLEMENT,
        },
        order: { createdAt: 'DESC' },
      }),
    ]);

    const settledReceptionIds = new Set<string>();
    const settledAdvanceIds = new Set<string>();
    settlements.forEach((settlement) => {
      const metadata = settlement.metadata as any;
      if (Array.isArray(metadata?.selectedReceptionIds)) {
        metadata.selectedReceptionIds.forEach((id: string) => settledReceptionIds.add(String(id)));
      }
      if (Array.isArray(metadata?.selectedAdvanceIds)) {
        metadata.selectedAdvanceIds.forEach((id: string) => settledAdvanceIds.add(String(id)));
      }
    });

    const processedReceptions = receptions.map((reception) =>
      enrichReception(
        reception,
        settledReceptionIds,
        producerNameById.get(String(reception.producerId)) || 'Sin productor'
      )
    );

    const processedAdvances = advances.map((advance) => ({
      ...advance,
      producerId: advance.producerId || undefined,
      producerName: producerNameById.get(String(advance.producerId)) || 'Sin productor',
      status: settledAdvanceIds.has(String(advance.id)) ? 'Liquidado' : 'Pendiente',
    }));

    const processedSettlements = settlements.map((settlement) => ({
      ...settlement,
      producerId: settlement.producerId || undefined,
      producerName: producerNameById.get(String(settlement.producerId)) || 'Sin productor',
    }));

    const serializedData = JSON.parse(
      JSON.stringify({
        unit: {
          id: unit.id,
          name: unit.name,
          location: unit.location || undefined,
        },
        producers: producers.map((p) => ({
          id: p.id,
          name: p.name,
          dni: p.dni,
          mail: typeof p.mail === 'string' ? p.mail : undefined,
          phone: typeof p.phone === 'string' ? p.phone : undefined,
        })),
        receptions: processedReceptions,
        advances: processedAdvances,
        settlements: processedSettlements,
      })
    ) as ProductiveUnitDetailData;

    return { success: true, data: serializedData };
  } catch (error: any) {
    console.error('Error fetching productive unit detail:', error);
    return {
      success: false,
      error: error?.message || 'Error al obtener detalles de la unidad productiva',
    };
  }
}
