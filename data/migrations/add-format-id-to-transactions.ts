import { getDb } from '../db';

async function addFormatIdToTransactions() {
  try {
    const dataSource = await getDb();
    const queryRunner = dataSource.createQueryRunner();

    console.log('Adding formatId to transactions table...');

    try {
      // Agregar formatId
      await queryRunner.query(`
        ALTER TABLE \`transactions\`
        ADD COLUMN \`formatId\` INT NULL
      `);
      console.log('✓ Added formatId column');

      // Agregar llave foránea
      await queryRunner.query(`
        ALTER TABLE \`transactions\`
        ADD CONSTRAINT \`FK_transactions_format\`
        FOREIGN KEY (\`formatId\`) REFERENCES \`formats\`(\`id\`)
        ON DELETE SET NULL
      `);
      console.log('✓ Added foreign key to formats table');
    } catch (e) {
      console.log('ℹ formatId column or foreign key already exists');
    }

    await queryRunner.release();
    console.log('✓ Migration completed');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

addFormatIdToTransactions();
