import { getDb } from '../db';
import { Pallet, PalletTrayAssignment } from '../entities/Pallet';
import { IsNull, In } from 'typeorm';
import { ReceptionPack } from '../entities/ReceptionPack';

/**
 * Migration: add packsNetWeight, drop chk_dispatch_vs_weight, backfill packsNetWeight.
 */
export async function addPacksNetWeightToPallets() {
  const db = await getDb();

  console.log('[addPacksNetWeightToPallets] Starting migration...');

  // Drop obsolete check: dispatchWeight (neto fruta) no longer must be <= weight (tara)
  const checks: Array<{ CONSTRAINT_NAME: string }> = await db.query(`
    SELECT CONSTRAINT_NAME
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pallets'
      AND CONSTRAINT_TYPE = 'CHECK'
      AND CONSTRAINT_NAME IN ('chk_dispatch_vs_weight', 'chk_pallets_dispatch_vs_weight')
  `);

  for (const row of checks) {
    console.log(`[addPacksNetWeightToPallets] Dropping check ${row.CONSTRAINT_NAME}`);
    await db.query(`ALTER TABLE pallets DROP CHECK ${row.CONSTRAINT_NAME}`);
  }

  const columns: Array<{ COLUMN_NAME: string }> = await db.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pallets'
      AND COLUMN_NAME = 'packsNetWeight'
  `);

  if (columns.length === 0) {
    console.log('[addPacksNetWeightToPallets] Adding packsNetWeight column');
    await db.query(`
      ALTER TABLE pallets
      ADD COLUMN packsNetWeight DECIMAL(10,3) NOT NULL DEFAULT 0 AFTER dispatchWeight
    `);
  } else {
    console.log('[addPacksNetWeightToPallets] packsNetWeight already exists');
  }

  // Optional non-negative check
  const packsCheck: Array<{ CONSTRAINT_NAME: string }> = await db.query(`
    SELECT CONSTRAINT_NAME
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pallets'
      AND CONSTRAINT_TYPE = 'CHECK'
      AND CONSTRAINT_NAME = 'chk_packs_net_weight'
  `);
  if (packsCheck.length === 0) {
    try {
      await db.query(`
        ALTER TABLE pallets
        ADD CONSTRAINT chk_packs_net_weight CHECK (packsNetWeight >= 0)
      `);
    } catch (error) {
      console.warn('[addPacksNetWeightToPallets] Could not add chk_packs_net_weight:', error);
    }
  }

  // Backfill packsNetWeight from metadata + reception_packs
  console.log('[addPacksNetWeightToPallets] Backfilling packsNetWeight...');
  const pallets = await db.getRepository(Pallet).find({
    where: { deletedAt: IsNull() },
  });

  for (const pallet of pallets) {
    const metadata = Array.isArray(pallet.metadata) ? pallet.metadata : [];
    const packsNetWeight = await computePacksNetWeightWithRepo(db, metadata);
    if (Number(pallet.packsNetWeight) !== packsNetWeight) {
      await db.getRepository(Pallet).update(pallet.id, { packsNetWeight });
    }
  }

  console.log(`[addPacksNetWeightToPallets] Backfilled ${pallets.length} pallets`);
  console.log('[addPacksNetWeightToPallets] Migration completed successfully');
}

async function computePacksNetWeightWithRepo(
  db: Awaited<ReturnType<typeof getDb>>,
  metadata: PalletTrayAssignment[]
): Promise<number> {
  if (!metadata.length) return 0;

  const packIds = [...new Set(metadata.map((m) => String(m.receptionPackId)).filter(Boolean))];
  if (packIds.length === 0) return 0;

  // reception_packs.id is int; cast ids for IN query
  const numericIds = packIds
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));

  if (numericIds.length === 0) return 0;

  const packs = await db.getRepository(ReceptionPack).find({
    where: { id: In(numericIds) },
  });

  const packMap = new Map(packs.map((p) => [String(p.id), p]));

  let total = 0;
  for (const assignment of metadata) {
    const pack = packMap.get(String(assignment.receptionPackId));
    if (!pack) continue;
    const packNet = Number(pack.netWeight) || 0;
    const packTrays = Number(pack.traysQuantity) || 0;
    const assigned = Number(assignment.quantity) || 0;
    if (packTrays > 0) {
      total += (packNet * assigned) / packTrays;
    }
  }

  return Number(total.toFixed(3));
}

if (require.main === module) {
  addPacksNetWeightToPallets()
    .then(() => {
      console.log('[addPacksNetWeightToPallets] Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[addPacksNetWeightToPallets] Migration script failed:', error);
      process.exit(1);
    });
}
