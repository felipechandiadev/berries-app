import { getDb } from '../db';

export async function addDispatchTransactionType() {
  try {
    console.log('[addDispatchTransactionType] Starting migration...');

    const db = await getDb();

    await db.query(`
      ALTER TABLE \`transactions\`
      MODIFY COLUMN \`type\` ENUM(
        'TRAY_ADJUSTMENT',
        'TRAY_IN_FROM_PRODUCER',
        'TRAY_OUT_TO_PRODUCER',
        'TRAY_OUT_TO_CLIENT',
        'TRAY_IN_FROM_CLIENT',
        'TRAY_RECEPTION_FROM_PRODUCER',
        'TRAY_RECEPTION_FROM_CLIENT',
        'TRAY_DELIVERY_TO_PRODUCER',
        'TRAY_DELIVERY_TO_CLIENT',
        'RECEPTION',
        'PALLET_TRAY_ASSIGNMENT',
        'PALLET_TRAY_RELEASE',
        'ADVANCE',
        'SETTLEMENT',
        'DISPATCH'
      ) NOT NULL
    `);

    console.log('[addDispatchTransactionType] ✓ Transaction type enum updated with DISPATCH');
  } catch (error) {
    console.error('[addDispatchTransactionType] Error:', error);
    throw error;
  }
}

if (require.main === module) {
  addDispatchTransactionType()
    .then(() => {
      console.log('[addDispatchTransactionType] Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[addDispatchTransactionType] Migration failed:', error);
      process.exit(1);
    });
}
