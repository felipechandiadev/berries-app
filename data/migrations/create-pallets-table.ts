import { getDb } from '../db';

export async function createPalletsTable() {
  try {
    console.log('[createPalletsTable] Starting migration...');

    const db = await getDb();
    const migrationSQL = `ALTER TABLE storages MODIFY COLUMN id VARCHAR(255) NOT NULL;
ALTER TABLE trays MODIFY COLUMN id VARCHAR(255) NOT NULL;

CREATE TABLE IF NOT EXISTS pallets (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    storageId VARCHAR(255) NOT NULL,
    trayId VARCHAR(255) NOT NULL,
    traysQuantity INT NOT NULL DEFAULT 0,
    capacity INT NOT NULL,
    weight DECIMAL(10,3) NOT NULL DEFAULT 0,
    dispatchWeight DECIMAL(10,3) NOT NULL DEFAULT 0,
    status ENUM('AVAILABLE','CLOSED','FULL','DISPATCHED') NOT NULL DEFAULT 'AVAILABLE',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deletedAt DATETIME NULL,
    PRIMARY KEY (id),

    -- Foreign key constraints
    CONSTRAINT fk_pallets_storage FOREIGN KEY (storageId) REFERENCES storages(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_pallets_tray FOREIGN KEY (trayId) REFERENCES trays(id) ON DELETE RESTRICT ON UPDATE CASCADE,

    -- Check constraint for weight validation
    CONSTRAINT chk_pallets_trays_quantity CHECK (traysQuantity >= 0),
    CONSTRAINT chk_pallets_capacity CHECK (capacity > 0),
    CONSTRAINT chk_pallets_trays_vs_capacity CHECK (traysQuantity <= capacity),
    CONSTRAINT chk_pallets_weight_initial CHECK (weight >= 0),
    CONSTRAINT chk_pallets_weight_dispatch CHECK (dispatchWeight >= 0),
    CONSTRAINT chk_pallets_dispatch_vs_weight CHECK (dispatchWeight <= weight)
);

-- Create indexes for performance
CREATE INDEX idx_pallets_storageId ON pallets(storageId);
CREATE INDEX idx_pallets_trayId ON pallets(trayId);
CREATE INDEX idx_pallets_status ON pallets(status);
CREATE INDEX idx_pallets_deletedAt ON pallets(deletedAt);

ALTER TABLE pallets AUTO_INCREMENT = 1001;`;

    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`[createPalletsTable] Executing ${statements.length} SQL statements...`);

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`[createPalletsTable] Executing: ${statement.substring(0, 50)}...`);
        await db.query(statement);
      }
    }

    console.log('[createPalletsTable] Migration completed successfully');
  } catch (error) {
    console.error('[createPalletsTable] Migration failed:', error);
    throw error;
  }
}

// Execute migration if this file is run directly
if (require.main === module) {
  createPalletsTable()
    .then(() => {
      console.log('[createPalletsTable] Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[createPalletsTable] Migration script failed:', error);
      process.exit(1);
    });
}