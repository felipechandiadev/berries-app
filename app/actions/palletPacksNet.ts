import { EntityManager, In } from 'typeorm';
import { Pallet, PalletMetadata, PalletTrayAssignment } from '@/data/entities/Pallet';
import { ReceptionPack } from '@/data/entities/ReceptionPack';

/**
 * Suma de netos de packs en un pallet.
 * Preferencia: netWeightKg de la línea → grossWeightKg * (packNet/packGross) → prorrateo por bandejas.
 */
export function computePacksNetWeightFromPacks(
  metadata: PalletTrayAssignment[],
  packById: Map<
    string,
    { netWeight: number; traysQuantity: number; grossWeight: number }
  >
): number {
  if (!metadata.length) return 0;

  let total = 0;
  for (const assignment of metadata) {
    const pack = packById.get(String(assignment.receptionPackId));
    if (!pack) continue;

    const assigned = Number(assignment.quantity) || 0;
    const lineNet = Number(assignment.netWeightKg);
    if (Number.isFinite(lineNet) && lineNet > 0) {
      total += lineNet;
      continue;
    }

    const lineGross = Number(assignment.grossWeightKg);
    if (Number.isFinite(lineGross) && lineGross > 0) {
      const packGross = Number(pack.grossWeight) || 0;
      const packNet = Number(pack.netWeight) || 0;
      if (packGross > 0) {
        total += (lineGross * packNet) / packGross;
      } else {
        // Sin bruto de pack: aproximar restando solo con prorrateo de neto por bandejas
        const packTrays = Number(pack.traysQuantity) || 0;
        if (packTrays > 0) {
          total += (packNet * assigned) / packTrays;
        }
      }
      continue;
    }

    const packNet = Number(pack.netWeight) || 0;
    const packTrays = Number(pack.traysQuantity) || 0;
    if (packTrays > 0) {
      total += (packNet * assigned) / packTrays;
    }
  }

  return Number(total.toFixed(3));
}

export async function computePacksNetWeight(
  manager: EntityManager,
  metadata: PalletMetadata | PalletTrayAssignment[] | null | undefined
): Promise<number> {
  const assignments = Array.isArray(metadata) ? metadata : [];
  if (assignments.length === 0) return 0;

  const packIds = [
    ...new Set(
      assignments
        .map((m) => Number(m.receptionPackId))
        .filter((id) => Number.isFinite(id) && id > 0)
    ),
  ];

  if (packIds.length === 0) return 0;

  const packs = await manager.getRepository(ReceptionPack).find({
    where: { id: In(packIds) },
  });

  const packById = new Map(
    packs.map((p) => [
      String(p.id),
      {
        netWeight: Number(p.netWeight) || 0,
        traysQuantity: Number(p.traysQuantity) || 0,
        grossWeight: Number(p.grossWeight) || 0,
      },
    ])
  );

  return computePacksNetWeightFromPacks(assignments, packById);
}

export async function syncPalletPacksNetWeight(
  manager: EntityManager,
  palletId: number
): Promise<number> {
  const pallet = await manager.getRepository(Pallet).findOne({
    where: { id: palletId },
  });

  if (!pallet) return 0;

  const packsNetWeight = await computePacksNetWeight(manager, pallet.metadata);
  await manager.getRepository(Pallet).update(palletId, { packsNetWeight });
  return packsNetWeight;
}

export async function syncPalletsPacksNetWeight(
  manager: EntityManager,
  palletIds: number[]
): Promise<void> {
  const uniqueIds = [...new Set(palletIds.filter((id) => Number.isFinite(id) && id > 0))];
  for (const id of uniqueIds) {
    await syncPalletPacksNetWeight(manager, id);
  }
}
