import { getDb } from '../db';

export async function createTraysTable() {
  try {
    console.log('[createTraysTable] Starting migration...');

    const db = await getDb();
    const migrationSQL = `CREATE TABLE IF NOT EXISTS trays (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    weight DECIMAL(10,3) NOT NULL CHECK (weight >= 0),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deletedAt DATETIME NULL
);

-- Create index for soft delete queries
CREATE INDEX idx_trays_deletedAt ON trays(deletedAt);

-- Create index for active trays
CREATE INDEX idx_trays_active ON trays(active);

-- Create index for name searches (case insensitive)
CREATE INDEX idx_trays_name ON trays(name);`;

    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`[createTraysTable] Executing ${statements.length} SQL statements...`);

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`[createTraysTable] Executing: ${statement.substring(0, 50)}...`);
        await db.query(statement);
      }
    }

    console.log('[createTraysTable] Migration completed successfully');
  } catch (error) {
    console.error('[createTraysTable] Migration failed:', error);
    throw error;
  }
}

// Execute migration if this file is run directly
if (require.main === module) {
  createTraysTable()
    .then(() => {
      console.log('[createTraysTable] Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[createTraysTable] Migration script failed:', error);
      process.exit(1);
    });
}