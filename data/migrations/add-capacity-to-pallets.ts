import { getDb } from '../db';

export async function addCapacityToPallets() {
  try {
    console.log('[addCapacityToPallets] Starting migration...');

    const db = await getDb();
    const migrationSQL = `-- Check if capacity column exists, if not add it
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pallets' AND COLUMN_NAME = 'capacity') = 0,
    'ALTER TABLE pallets ADD COLUMN capacity INT NOT NULL DEFAULT 100 AFTER traysQuantity',
    'SELECT "Capacity column already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing pallets to have appropriate capacity based on their current traysQuantity
-- Set capacity to be at least 10 more than current traysQuantity, or minimum 50
UPDATE pallets SET capacity = GREATEST(traysQuantity + 10, 50);

-- Add check constraint to ensure traysQuantity doesn't exceed capacity (only if it doesn't exist)
SET @constraint_sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pallets' AND CONSTRAINT_NAME = 'chk_pallets_capacity') = 0,
    'ALTER TABLE pallets ADD CONSTRAINT chk_pallets_capacity CHECK (traysQuantity <= capacity)',
    'SELECT "Capacity constraint already exists"'
));
PREPARE constraint_stmt FROM @constraint_sql;
EXECUTE constraint_stmt;
DEALLOCATE PREPARE constraint_stmt;

-- Add index for capacity queries (only if it doesn't exist)
SET @index_sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pallets' AND INDEX_NAME = 'idx_pallets_capacity') = 0,
    'CREATE INDEX idx_pallets_capacity ON pallets(capacity)',
    'SELECT "Capacity index already exists"'
));
PREPARE index_stmt FROM @index_sql;
EXECUTE index_stmt;
DEALLOCATE PREPARE index_stmt;`;

    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`[addCapacityToPallets] Executing ${statements.length} SQL statements...`);

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`[addCapacityToPallets] Executing: ${statement.substring(0, 50)}...`);
        await db.query(statement);
      }
    }

    console.log('[addCapacityToPallets] Migration completed successfully');
  } catch (error) {
    console.error('[addCapacityToPallets] Migration failed:', error);
    throw error;
  }
}

// Execute migration if this file is run directly
if (require.main === module) {
  addCapacityToPallets()
    .then(() => {
      console.log('[addCapacityToPallets] Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[addCapacityToPallets] Migration script failed:', error);
      process.exit(1);
    });
}