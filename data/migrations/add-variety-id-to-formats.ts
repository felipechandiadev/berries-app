import { getDb } from '../db';

async function addVarietyIdToFormats() {
  try {
    const dataSource = await getDb();
    const queryRunner = dataSource.createQueryRunner();

    console.log('Adding varietyId to formats table...');

    try {
      await queryRunner.query(`
        ALTER TABLE \`formats\`
        ADD COLUMN \`varietyId\` INT NULL
      `);
      console.log('✓ Added varietyId column');

      await queryRunner.query(`
        ALTER TABLE \`formats\`
        ADD CONSTRAINT \`FK_formats_variety\`
        FOREIGN KEY (\`varietyId\`) REFERENCES \`varieties\`(\`id\`)
        ON DELETE SET NULL
      `);
      console.log('✓ Added foreign key to varieties table');
    } catch (e) {
      console.log('ℹ varietyId column or foreign key already exists');
    }

    await queryRunner.release();
    console.log('✓ Migration completed');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

addVarietyIdToFormats();
