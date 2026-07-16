import { getDb } from '../db';

export async function createReceptionPacksTable() {
  try {
    console.log('[createReceptionPacksTable] Starting migration...');

    const db = await getDb();

    const existingTableRows = await db.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reception_packs'`
    ) as Array<{ TABLE_NAME: string }>;

    if (existingTableRows.length === 0) {
      console.log('[createReceptionPacksTable] Creating reception_packs table');
      await db.query(`
        CREATE TABLE reception_packs (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          receptionTransactionId BIGINT NOT NULL,
          varietyId INT NOT NULL,
          varietyName VARCHAR(255) NOT NULL,
          formatId INT NOT NULL,
          formatName VARCHAR(255) NOT NULL,
          trayId VARCHAR(255) NULL,
          trayLabel VARCHAR(255) NULL,
          traysQuantity INT NOT NULL DEFAULT 0,
          unitTrayWeight DECIMAL(12,3) NOT NULL DEFAULT 0,
          traysTotalWeight DECIMAL(12,3) NOT NULL DEFAULT 0,
          grossWeight DECIMAL(12,3) NOT NULL DEFAULT 0,
          netWeightBeforeImpurities DECIMAL(12,3) NOT NULL DEFAULT 0,
          impurityPercent DECIMAL(5,2) NOT NULL DEFAULT 0,
          netWeight DECIMAL(12,3) NOT NULL DEFAULT 0,
          pricePerKg DECIMAL(12,3) NOT NULL DEFAULT 0,
          currency ENUM('CLP','USD') NOT NULL DEFAULT 'CLP',
          totalToPay DECIMAL(14,3) NOT NULL DEFAULT 0,
          palletAssignments JSON NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          INDEX idx_receptionTransaction (receptionTransactionId),
          INDEX idx_varietyId (varietyId),
          INDEX idx_formatId (formatId),
          INDEX idx_trayId (trayId),
          CONSTRAINT fk_reception_packs_reception FOREIGN KEY (receptionTransactionId)
            REFERENCES transactions(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_reception_packs_variety FOREIGN KEY (varietyId)
            REFERENCES varieties(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_reception_packs_format FOREIGN KEY (formatId)
            REFERENCES formats(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_reception_packs_tray FOREIGN KEY (trayId)
            REFERENCES trays(id) ON DELETE SET NULL ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } else {
      console.log('[createReceptionPacksTable] Table already exists. Skipping creation.');
    }

    console.log('[createReceptionPacksTable] Ensuring transaction_relations relationType enum includes TRAY_RECEPTION');
    await db.query(`
      ALTER TABLE transaction_relations
      MODIFY COLUMN relationType ENUM('RECEPTION_PACK','TRAY_RECEPTION','TRAY_DEVOLUTION','PALLET_ASSIGNMENT') NOT NULL
    `);

    console.log('[createReceptionPacksTable] Ensuring transaction_relations supports reception pack links');
    await db.query(`
      ALTER TABLE transaction_relations
      MODIFY COLUMN childTransactionId BIGINT NULL
    `);

    const receptionColumn = await db.query(
      `SHOW COLUMNS FROM transaction_relations LIKE 'childReceptionPackId'`
    ) as Array<Record<string, unknown>>;

    if (receptionColumn.length === 0) {
      console.log('[createReceptionPacksTable] Adding childReceptionPackId column and foreign key');
      await db.query(`
        ALTER TABLE transaction_relations
        ADD COLUMN childReceptionPackId INT UNSIGNED NULL AFTER childTransactionId,
        ADD INDEX idx_childReceptionPack (childReceptionPackId)
      `);
    }

    const foreignKeyRows = await db.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'transaction_relations'
         AND COLUMN_NAME = 'childReceptionPackId'
         AND REFERENCED_TABLE_NAME = 'reception_packs'`
    ) as Array<Record<string, unknown>>;

    if (foreignKeyRows.length === 0) {
      await db.query(`
        ALTER TABLE transaction_relations
        ADD CONSTRAINT fk_transaction_relations_reception_pack FOREIGN KEY (childReceptionPackId)
          REFERENCES reception_packs(id) ON DELETE CASCADE ON UPDATE CASCADE
      `);
    }

    console.log('[createReceptionPacksTable] Migration completed successfully');
  } catch (error) {
    console.error('[createReceptionPacksTable] Migration failed:', error);
    throw error;
  }
}

if (require.main === module) {
  createReceptionPacksTable()
    .then(() => {
      console.log('[createReceptionPacksTable] Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[createReceptionPacksTable] Migration script failed:', error);
      process.exit(1);
    });
}
