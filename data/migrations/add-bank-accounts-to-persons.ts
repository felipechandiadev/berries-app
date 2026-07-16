import { getDb } from '../db';

export async function addBankAccountsToPersons() {
  try {
    console.log('[addBankAccountsToPersons] Starting migration...');

    const db = await getDb();

    const existingColumnRows = await db.query(
      "SHOW COLUMNS FROM persons LIKE 'bankAccounts'"
    ) as Array<Record<string, unknown>>;

    if (existingColumnRows.length === 0) {
      console.log('[addBankAccountsToPersons] Adding bankAccounts column to persons table');
      await db.query(
        'ALTER TABLE persons ADD COLUMN bankAccounts JSON NULL AFTER mail'
      );
    } else {
      console.log('[addBankAccountsToPersons] Column bankAccounts already exists. Skipping.');
    }

    console.log('[addBankAccountsToPersons] Migration completed successfully');
  } catch (error) {
    console.error('[addBankAccountsToPersons] Migration failed:', error);
    throw error;
  }
}

if (require.main === module) {
  addBankAccountsToPersons()
    .then(() => {
      console.log('[addBankAccountsToPersons] Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[addBankAccountsToPersons] Migration script failed:', error);
      process.exit(1);
    });
}
