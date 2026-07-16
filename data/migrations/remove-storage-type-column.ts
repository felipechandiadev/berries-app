import { getDb } from '../db';

export async function removeStorageTypeColumn() {
  try {
    console.log('[removeStorageTypeColumn] Starting migration...');

    const db = await getDb();

    const migrationSQL = `-- Drop index on storages.type if it exists
SET @drop_index_sql = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'storages'
        AND INDEX_NAME = 'IDX_storages_type'
    ),
    'ALTER TABLE storages DROP INDEX IDX_storages_type',
    'SELECT "Index IDX_storages_type already removed"'
  )
);
PREPARE drop_index_stmt FROM @drop_index_sql;
EXECUTE drop_index_stmt;
DEALLOCATE PREPARE drop_index_stmt;

-- Drop storages.type column if it exists
SET @drop_column_sql = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'storages'
        AND COLUMN_NAME = 'type'
    ),
    'ALTER TABLE storages DROP COLUMN type',
    'SELECT "Column type already removed"'
  )
);
PREPARE drop_column_stmt FROM @drop_column_sql;
EXECUTE drop_column_stmt;
DEALLOCATE PREPARE drop_column_stmt;`;

    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`[removeStorageTypeColumn] Executing ${statements.length} SQL statements...`);

    for (const statement of statements) {
      console.log(`[removeStorageTypeColumn] Executing: ${statement.substring(0, 60)}...`);
      await db.query(statement);
    }

    console.log('[removeStorageTypeColumn] Migration completed successfully');
  } catch (error) {
    console.error('[removeStorageTypeColumn] Migration failed:', error);
    throw error;
  }
}

if (require.main === module) {
  removeStorageTypeColumn()
    .then(() => {
      console.log('[removeStorageTypeColumn] Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[removeStorageTypeColumn] Migration script failed:', error);
      process.exit(1);
    });
}
