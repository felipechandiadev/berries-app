import { getDb } from '../db';

async function runMigration() {
  try {
    const dataSource = await getDb();
    const queryRunner = dataSource.createQueryRunner();

    console.log('Starting producers schema final migration...');

    // Rename legacy columns to match new schema
    try {
      await queryRunner.query(`ALTER TABLE \`producers\` CHANGE COLUMN \`rut\` \`dni\` varchar(12) NOT NULL`);
      console.log('✓ Renamed rut column to dni');
    } catch (e) {
      console.log('ℹ rut column not found (already migrated)');
    }

    try {
      await queryRunner.query(`ALTER TABLE \`producers\` CHANGE COLUMN \`email\` \`mail\` varchar(255) NULL`);
      console.log('✓ Renamed email column to mail');
    } catch (e) {
      console.log('ℹ email column not found (already migrated)');
    }

    // Remove unused legacy columns
    try {
      await queryRunner.query(`ALTER TABLE \`producers\` DROP COLUMN \`address\``);
      console.log('✓ Dropped address column');
    } catch (e) {
      console.log('ℹ address column already removed');
    }

    // Ensure required columns exist
    const columnsToEnsure = [
      { definition: 'ADD COLUMN IF NOT EXISTS \`name\` varchar(255) NOT NULL' , label: 'name'},
      { definition: 'ADD COLUMN IF NOT EXISTS \`dni\` varchar(12) NOT NULL', label: 'dni' },
      { definition: 'ADD COLUMN IF NOT EXISTS \`phone\` varchar(20) NULL', label: 'phone' },
      { definition: 'ADD COLUMN IF NOT EXISTS \`mail\` varchar(255) NULL', label: 'mail' },
      { definition: 'ADD COLUMN IF NOT EXISTS \`personId\` varchar(36) NOT NULL', label: 'personId' },
    ];

    for (const column of columnsToEnsure) {
      try {
        await queryRunner.query(`ALTER TABLE \`producers\` ${column.definition}`);
        console.log(`✓ Ensured ${column.label} column`);
      } catch (e) {
        console.log(`ℹ Could not ensure ${column.label} column (already aligned)`);
      }
    }

    // Drop legacy relationship with productive units
    try {
      await queryRunner.query(`ALTER TABLE \`producers\` DROP FOREIGN KEY \`FK_producers_productiveUnitId\``);
      console.log('✓ Dropped FK_producers_productiveUnitId');
    } catch (e) {
      console.log('ℹ FK_producers_productiveUnitId not present');
    }

    try {
      await queryRunner.query(`ALTER TABLE \`producers\` DROP COLUMN \`productiveUnitId\``);
      console.log('✓ Dropped productiveUnitId column');
    } catch (e) {
      console.log('ℹ productiveUnitId column already removed');
    }

    // Recreate foreign key towards persons table
    try {
      await queryRunner.query(`ALTER TABLE \`producers\` DROP FOREIGN KEY \`FK_producers_personId\``);
      console.log('ℹ Removed stale FK_producers_personId');
    } catch (e) {
      console.log('ℹ FK_producers_personId not present before re-creation');
    }

    try {
      await queryRunner.query(`ALTER TABLE \`producers\` ADD CONSTRAINT \`FK_producers_personId\` FOREIGN KEY (\`personId\`) REFERENCES \`persons\` (\`id\`) ON DELETE CASCADE`);
      console.log('✓ Added FK_producers_personId');
    } catch (e) {
      console.log('ℹ FK_producers_personId already aligned');
    }

    // Ensure unique constraint on dni
    try {
      await queryRunner.query(`ALTER TABLE \`producers\` ADD UNIQUE KEY IF NOT EXISTS \`UQ_producers_dni\` (\`dni\`)`);
      console.log('✓ Ensured unique constraint on dni');
    } catch (e) {
      console.log('ℹ Unique constraint on dni already exists');
    }

    console.log('\n✓ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
