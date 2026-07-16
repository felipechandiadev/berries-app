import { getDb } from '../db';

export async function updateTransactionRelationsRelationType() {
  console.log('[updateTransactionRelationsRelationType] Starting migration...');

  try {
    const db = await getDb();

    const columns = await db.query(
      `SHOW COLUMNS FROM transaction_relations LIKE 'relationType'`
    ) as Array<{ Field: string; Type: string }>;

    if (columns.length === 0) {
      console.log('[updateTransactionRelationsRelationType] relationType column not found. Skipping.');
      return;
    }

    const currentEnum = columns[0]?.Type ?? '';
    const hasTrayAdjustment = currentEnum.includes('TRAY_ADJUSTMENT');
    const hasPalletRelease = currentEnum.includes('PALLET_RELEASE');

    if (hasTrayAdjustment && hasPalletRelease) {
      console.log('[updateTransactionRelationsRelationType] Enum already up to date. Nothing to do.');
      return;
    }

    console.log('[updateTransactionRelationsRelationType] Updating relationType enum definition');
    await db.query(`
      ALTER TABLE transaction_relations
      MODIFY COLUMN relationType ENUM(
        'RECEPTION_PACK',
        'TRAY_RECEPTION',
        'TRAY_DEVOLUTION',
        'PALLET_ASSIGNMENT',
        'TRAY_ADJUSTMENT',
        'PALLET_RELEASE'
      ) NOT NULL
    `);

    console.log('[updateTransactionRelationsRelationType] Migration completed successfully.');
  } catch (error) {
    console.error('[updateTransactionRelationsRelationType] Migration failed:', error);
    throw error;
  }
}

if (require.main === module) {
  updateTransactionRelationsRelationType()
    .then(() => {
      console.log('[updateTransactionRelationsRelationType] Script finished successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[updateTransactionRelationsRelationType] Script failed:', error);
      process.exit(1);
    });
}
