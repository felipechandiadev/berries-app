'use server';

import { getDb } from '@/data/db';
import { Producer } from '@/data/entities/Producer';
import { Transaction, TransactionType, TransactionDirection } from '@/data/entities/Transaction';
import { Tray } from '@/data/entities/Tray';
import { In } from 'typeorm';
import { ProducerDetailData } from '@/app/home/productiveManagement/producers/ui/ProducerDetail/types';

export async function getProducerDetailData(producerId: string): Promise<{ success: boolean; data?: ProducerDetailData; error?: string }> {
  try {
    const db = await getDb();
    
    // 1. Fetch Producer
    const producer = await db.getRepository(Producer).findOne({
      where: { id: producerId },
      relations: ['person']
    });

    if (!producer) {
      return { success: false, error: 'Productor no encontrado' };
    }

    // 2. Fetch Receptions with relations
    const receptions = await db.getRepository(Transaction).find({
      where: {
        producer: { id: producerId },
        type: TransactionType.RECEPTION
      },
      relations: ['format'],
      order: { createdAt: 'DESC' }
    });

    // 3. Fetch Advances
    const advances = await db.getRepository(Transaction).find({
      where: {
        producer: { id: producerId },
        type: TransactionType.ADVANCE
      },
      order: { createdAt: 'DESC' }
    });

    // 4. Fetch Settlements
    const settlements = await db.getRepository(Transaction).find({
      where: {
        producer: { id: producerId },
        type: TransactionType.SETTLEMENT
      },
      order: { createdAt: 'DESC' }
    });

    // Collect all settled reception IDs and advance IDs
    const settledReceptionIds = new Set<string>();
    const settledAdvanceIds = new Set<string>();
    settlements.forEach(settlement => {
      const metadata = settlement.metadata as any;
      if (metadata?.selectedReceptionIds && Array.isArray(metadata.selectedReceptionIds)) {
        metadata.selectedReceptionIds.forEach((id: string) => settledReceptionIds.add(id));
      }
      if (metadata?.selectedAdvanceIds && Array.isArray(metadata.selectedAdvanceIds)) {
        metadata.selectedAdvanceIds.forEach((id: string) => settledAdvanceIds.add(id));
      }
    });

    // 5. Fetch Tray Movements
    const trayMovements = await db.getRepository(Transaction).createQueryBuilder('transaction')
      .where('transaction.producerId = :producerId', { producerId })
      .andWhere('transaction.type LIKE :type', { type: 'TRAY_%' })
      .orderBy('transaction.createdAt', 'DESC')
      .getMany();

    // Preload tray names referenced in metadata to avoid showing "Desconocido"
    const trayIds = Array.from(new Set(
      trayMovements
        .map((transaction) => {
          const metadata = transaction.metadata as any;
          return metadata && typeof metadata === 'object' && typeof metadata.trayId === 'string'
            ? metadata.trayId
            : undefined;
        })
        .filter((value): value is string => Boolean(value))
    ));

    let trayNameLookup = new Map<string, string>();
    if (trayIds.length > 0) {
      const trayRepository = db.getRepository(Tray);
      const trays = await trayRepository.find({
        where: { id: In(trayIds) },
        withDeleted: true,
      });
      trayNameLookup = new Map(trays.map((tray) => [tray.id, tray.name]));
    }

    // 6. Calculate Tray Balance and Enrich Movements
    const balanceByKey = new Map<string, { name: string; total: number }>();

    for (const transaction of trayMovements) {
      if (!transaction.metadata || typeof transaction.metadata !== 'object') {
        continue;
      }

      const metadata = transaction.metadata as any;
      const rawQuantity = metadata.quantity
        ?? metadata.quantityReturned
        ?? metadata.quantityDelivered
        ?? metadata.amount
        ?? transaction.amount;
      const quantity = Number(rawQuantity) || 0;
      
      const trayId = typeof metadata.trayId === 'string' ? metadata.trayId : undefined;
      const metadataLabel = typeof metadata.trayLabel === 'string' ? metadata.trayLabel.trim() : undefined;
      const resolvedName = metadataLabel
        || (trayId ? trayNameLookup.get(trayId) : undefined)
        || 'Desconocido';

      // Enrich movement metadata with resolved tray label for the UI
      if (!metadata.trayLabel || metadata.trayLabel === '—') {
        metadata.trayLabel = resolvedName;
      }

      if (quantity === 0) {
        continue;
      }

      const balanceKey = trayId || metadataLabel || resolvedName;

      if (!balanceByKey.has(balanceKey)) {
        balanceByKey.set(balanceKey, { name: resolvedName, total: 0 });
      }

      const entry = balanceByKey.get(balanceKey)!;
      if (entry.name === 'Desconocido' && resolvedName !== 'Desconocido') {
        entry.name = resolvedName;
      }

      switch (transaction.type) {
        case TransactionType.TRAY_OUT_TO_PRODUCER:
        case TransactionType.TRAY_DELIVERY_TO_PRODUCER:
          entry.total += quantity;
          break;
        case TransactionType.TRAY_IN_FROM_PRODUCER:
        case TransactionType.TRAY_RECEPTION_FROM_PRODUCER:
          entry.total -= quantity;
          break;
        default:
          if (transaction.direction === TransactionDirection.OUT) {
            entry.total += quantity;
          } else if (transaction.direction === TransactionDirection.IN) {
            entry.total -= quantity;
          }
          break;
      }
    }

    const balance: Record<string, number> = {};
    balanceByKey.forEach(({ name, total }) => {
      const label = name || 'Desconocido';
      balance[label] = (balance[label] || 0) + total;
    });
    
    // Process receptions to include variety, format name, and price from metadata
    const processedReceptions = receptions.map(reception => {
      const metadata = reception.metadata as any;

      // Extract variety and format from packs (take first pack or most common)
      let variety = 'N/A';
      let formatName = 'N/A';
      let price = 0;
      let netWeight = 0;

      if (metadata?.packs && Array.isArray(metadata.packs) && metadata.packs.length > 0) {
        const firstPack = metadata.packs[0];
        variety = firstPack.varietyName || 'N/A';
        formatName = firstPack.formatName || 'N/A';
        price = firstPack.pricePerKg || 0;

        // Calculate total net weight
        netWeight = metadata.packs.reduce((sum: number, p: any) => sum + (Number(p.netWeight) || 0), 0);

        // If there are multiple packs with different varieties/formats, show aggregated info
        if (metadata.packs.length > 1) {
          const varieties = [...new Set(metadata.packs.map((p: any) => p.varietyName).filter(Boolean))];
          const formats = [...new Set(metadata.packs.map((p: any) => p.formatName).filter(Boolean))];

          if (varieties.length > 1) variety = `${varieties.length} variedades`;
          if (formats.length > 1) formatName = `${formats.length} formatos`;

          // Calculate average price
          const prices = metadata.packs.map((p: any) => p.pricePerKg).filter((p: number) => p > 0);
          if (prices.length > 0) {
            price = prices.reduce((sum: number, p: number) => sum + p, 0) / prices.length;
          }
        }
      }

      return {
        ...reception,
        variety,
        formatName,
        price,
        netWeight,
        status: settledReceptionIds.has(reception.id.toString()) ? 'Liquidada' : 'Pendiente'
      };
    });
    
    // Serialize data to plain objects to avoid "Classes not supported" error in Client Components
        const processedAdvances = advances.map(advance => ({
      ...advance,
      status: settledAdvanceIds.has(advance.id.toString()) ? 'Liquidado' : 'Pendiente'
    }));

    const serializedData = JSON.parse(JSON.stringify({
      producer: {
        ...producer,
        phone: typeof producer.phone === 'string' ? producer.phone : undefined,
        mail: typeof producer.mail === 'string' ? producer.mail : undefined,
        address: typeof producer.address === 'string' ? producer.address : undefined,
        person: producer.person ? {
          ...producer.person,
          phone: typeof producer.person.phone === 'string' ? producer.person.phone : undefined,
          mail: typeof producer.person.mail === 'string' ? producer.person.mail : undefined,
          address: typeof producer.person.address === 'string' ? producer.person.address : undefined,
        } : undefined,
      },
      receptions: processedReceptions,
      advances: processedAdvances,
      settlements,
      trays: {
        balance,
        movements: trayMovements
      }
    }));

    return {
      success: true,
      data: serializedData
    };

  } catch (error: any) {
    console.error('Error fetching producer detail:', error);
    return { success: false, error: error.message || 'Error al obtener detalles del productor' };
  }
}
