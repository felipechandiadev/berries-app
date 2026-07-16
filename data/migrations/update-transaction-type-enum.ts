import { getDb } from '../db';

export async function updateTransactionTypeEnum() {
  try {
    console.log('[updateTransactionTypeEnum] Starting migration...');

    const db = await getDb();

    // Update the enum to include new transaction types
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
        'PALLET_TRAY_TRANSFER',
        'ADVANCE',
        'SETTLEMENT',
        'DISPATCH'
      ) NOT NULL
    `);

    console.log('[updateTransactionTypeEnum] ✓ Updated transaction type enum');
  } catch (error) {
    console.error('[updateTransactionTypeEnum] Error:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  updateTransactionTypeEnum()
    .then(() => {
      console.log('[updateTransactionTypeEnum] Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[updateTransactionTypeEnum] Migration failed:', error);
      process.exit(1);
    });
}