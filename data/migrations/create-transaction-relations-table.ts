import { getDb } from '../db';

export async function createTransactionRelationsTable() {
  try {
    console.log('[createTransactionRelationsTable] Starting migration...');

    const db = await getDb();

    const existingTableRows = await db.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transaction_relations'`
    ) as Array<{ TABLE_NAME: string }>;

    const receptionPacksTableRows = await db.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reception_packs'`
    ) as Array<{ TABLE_NAME: string }>;

    const hasReceptionPacksTable = receptionPacksTableRows.length > 0;

    if (existingTableRows.length > 0) {
      console.log('[createTransactionRelationsTable] Table already exists. Ensuring new structure...');

      await db.query(`
        ALTER TABLE transaction_relations
        MODIFY COLUMN childTransactionId BIGINT NULL
      `);

      const receptionPackColumn = await db.query(
        `SHOW COLUMNS FROM transaction_relations LIKE 'childReceptionPackId'`
      ) as Array<Record<string, unknown>>;

      if (receptionPackColumn.length === 0) {
        console.log('[createTransactionRelationsTable] Adding childReceptionPackId column');
        await db.query(`
          ALTER TABLE transaction_relations
          ADD COLUMN childReceptionPackId INT UNSIGNED NULL AFTER childTransactionId,
          ADD INDEX idx_childReceptionPack (childReceptionPackId)
        `);

        if (hasReceptionPacksTable) {
          await db.query(`
            ALTER TABLE transaction_relations
            ADD CONSTRAINT fk_transaction_relations_reception_pack FOREIGN KEY (childReceptionPackId)
              REFERENCES reception_packs(id) ON DELETE CASCADE ON UPDATE CASCADE
          `);
        } else {
          console.log('[createTransactionRelationsTable] reception_packs table not found, deferring foreign key creation');
        }
      }

      return;
    }

    console.log('[createTransactionRelationsTable] Creating transaction_relations table');
    await db.query(`
      CREATE TABLE transaction_relations (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        parentTransactionId BIGINT NOT NULL,
        childTransactionId BIGINT NULL,
        childReceptionPackId INT UNSIGNED NULL,
        relationType ENUM('RECEPTION_PACK', 'TRAY_RECEPTION', 'TRAY_DEVOLUTION', 'PALLET_ASSIGNMENT') NOT NULL,
        context VARCHAR(255) NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_parentTransaction (parentTransactionId),
        INDEX idx_childTransaction (childTransactionId),
        INDEX idx_childReceptionPack (childReceptionPackId),
        INDEX idx_relationType (relationType),
        CONSTRAINT fk_transaction_relations_parent FOREIGN KEY (parentTransactionId)
          REFERENCES transactions(id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_transaction_relations_child FOREIGN KEY (childTransactionId)
          REFERENCES transactions(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    if (hasReceptionPacksTable) {
      console.log('[createTransactionRelationsTable] Adding foreign key to reception_packs');
      await db.query(`
        ALTER TABLE transaction_relations
        ADD CONSTRAINT fk_transaction_relations_reception_pack FOREIGN KEY (childReceptionPackId)
          REFERENCES reception_packs(id) ON DELETE CASCADE ON UPDATE CASCADE
      `);
    } else {
      console.log('[createTransactionRelationsTable] reception_packs table not found during creation, skipping foreign key');
    }

    console.log('[createTransactionRelationsTable] Migration completed successfully');
  } catch (error) {
    console.error('[createTransactionRelationsTable] Migration failed:', error);
    throw error;
  }
}

if (require.main === module) {
  createTransactionRelationsTable()
    .then(() => {
      console.log('[createTransactionRelationsTable] Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[createTransactionRelationsTable] Migration script failed:', error);
      process.exit(1);
    });
}
