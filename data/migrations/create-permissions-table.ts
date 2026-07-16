import { getDb } from '../db';

export async function createPermissionsTable() {
  try {
    console.log('[createPermissionsTable] Starting migration...');

    const db = await getDb();

    const migrationSQL = `
      CREATE TABLE IF NOT EXISTS \`permissions\` (
        \`id\` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`userId\` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`ability\` ENUM('USERS_VIEW', 'USERS_CREATE', 'USERS_UPDATE', 'USERS_DELETE') NOT NULL,
        \`description\` VARCHAR(255) NULL,
        \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deletedAt\` DATETIME NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_permissions_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`uq_permissions_user_ability\` UNIQUE (\`userId\`, \`ability\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE INDEX \`idx_permissions_userId\` ON \`permissions\`(\`userId\`);
      CREATE INDEX \`idx_permissions_ability\` ON \`permissions\`(\`ability\`);
      CREATE INDEX \`idx_permissions_deletedAt\` ON \`permissions\`(\`deletedAt\`);
    `;

    const statements = migrationSQL
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    console.log(`[createPermissionsTable] Executing ${statements.length} SQL statements...`);

    for (const statement of statements) {
      console.log(`[createPermissionsTable] Executing: ${statement.substring(0, 60)}...`);
      await db.query(statement);
    }

    console.log('[createPermissionsTable] Migration completed successfully');
  } catch (error) {
    console.error('[createPermissionsTable] Migration failed:', error);
    throw error;
  }
}

if (require.main === module) {
  createPermissionsTable()
    .then(() => {
      console.log('[createPermissionsTable] Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[createPermissionsTable] Migration script failed:', error);
      process.exit(1);
    });
}
