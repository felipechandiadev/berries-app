import { getDb } from '../db';

export async function createAdminBankAccountsTable() {
  try {
    console.log('[createAdminBankAccountsTable] Starting migration...');

    const db = await getDb();
    const migrationSQL = `CREATE TABLE IF NOT EXISTS admin_bank_accounts (
    id VARCHAR(36) PRIMARY KEY,
    accountType ENUM('Cuenta Corriente', 'Cuenta de Ahorro', 'Cuenta Vista', 'Cuenta RUT', 'Cuenta Chequera Electrónica', 'Otro') NOT NULL,
    bank ENUM('Banco de Chile', 'Banco del Estado de Chile', 'Banco Santander Chile', 'Banco de Crédito e Inversiones', 'Banco Falabella', 'Banco Security', 'Banco CrediChile', 'Banco Itaú Corpbanca', 'Scotiabank Chile', 'Banco Consorcio', 'Banco Ripley', 'Banco Internacional', 'Banco BICE', 'Banco Paris', 'Banco Mercado Pago', 'Otro') NOT NULL,
    accountNumber VARCHAR(255) NOT NULL,
    alias VARCHAR(255) NULL,
    isActive BOOLEAN NOT NULL DEFAULT TRUE,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deletedAt DATETIME NULL
);

-- Create indexes for performance
CREATE INDEX idx_admin_bank_accounts_accountType ON admin_bank_accounts(accountType);
CREATE INDEX idx_admin_bank_accounts_bank ON admin_bank_accounts(bank);
CREATE INDEX idx_admin_bank_accounts_isActive ON admin_bank_accounts(isActive);
CREATE INDEX idx_admin_bank_accounts_deletedAt ON admin_bank_accounts(deletedAt);`;

    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`[createAdminBankAccountsTable] Executing ${statements.length} SQL statements...`);

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`[createAdminBankAccountsTable] Executing: ${statement.substring(0, 50)}...`);
        await db.query(statement);
      }
    }

    console.log('[createAdminBankAccountsTable] Migration completed successfully');
  } catch (error) {
    console.error('[createAdminBankAccountsTable] Migration failed:', error);
    throw error;
  }
}

// Execute migration if this file is run directly
if (require.main === module) {
  createAdminBankAccountsTable()
    .then(() => {
      console.log('[createAdminBankAccountsTable] Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[createAdminBankAccountsTable] Migration script failed:', error);
      process.exit(1);
    });
}