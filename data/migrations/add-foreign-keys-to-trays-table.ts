import { getDb } from '../db';

export async function addForeignKeysToTraysTable() {
  try {
    console.log('[addForeignKeysToTraysTable] Starting migration...');

    const db = await getDb();

    // Check existing columns
    const rows = await db.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'trays'
    `) as any[];
    const existingColumns = rows.map((row: any) => row.COLUMN_NAME);

    console.log('[addForeignKeysToTraysTable] Existing columns:', existingColumns);

    const columnsToAdd = [
      'receptionId',
      'storageId',
      'varietyId',
      'formatId'
    ];

    // Add missing columns
    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column)) {
        console.log(`[addForeignKeysToTraysTable] Adding column: ${column}`);
        await db.query(`ALTER TABLE trays ADD COLUMN ${column} VARCHAR(36) NULL`);
      } else {
        console.log(`[addForeignKeysToTraysTable] Column ${column} already exists`);
      }
    }

    // Add indexes
    const indexesToAdd = [
      { name: 'idx_trays_receptionId', column: 'receptionId' },
      { name: 'idx_trays_storageId', column: 'storageId' },
      { name: 'idx_trays_varietyId', column: 'varietyId' },
      { name: 'idx_trays_formatId', column: 'formatId' }
    ];

    for (const { name, column } of indexesToAdd) {
      try {
        await db.query(`CREATE INDEX ${name} ON trays(${column})`);
        console.log(`[addForeignKeysToTraysTable] Created index: ${name}`);
      } catch (error: any) {
        if (error.code === 'ER_DUP_KEYNAME') {
          console.log(`[addForeignKeysToTraysTable] Index ${name} already exists`);
        } else {
          throw error;
        }
      }
    }

    console.log('[addForeignKeysToTraysTable] Migration completed successfully');
  } catch (error) {
    console.error('[addForeignKeysToTraysTable] Migration failed:', error);
    throw error;
  }
}

// Execute migration if this file is run directly
if (require.main === module) {
  addForeignKeysToTraysTable()
    .then(() => {
      console.log('[addForeignKeysToTraysTable] Migration executed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[addForeignKeysToTraysTable] Migration failed:', error);
      process.exit(1);
    });
}