import { getDb } from '../db';

async function updateTransactionsTable() {
  try {
    const dataSource = await getDb();
    const queryRunner = dataSource.createQueryRunner();

    console.log('Updating transactions table...');

    // Agregar columnas faltantes
    try {
      // Agregar seasonId
      await queryRunner.query(`
        ALTER TABLE \`transactions\`
        ADD COLUMN \`seasonId\` VARCHAR(36) NULL
      `);
      console.log('✓ Added seasonId column');
    } catch (e) {
      console.log('ℹ seasonId column already exists');
    }

    try {
      // Agregar producerId
      await queryRunner.query(`
        ALTER TABLE \`transactions\`
        ADD COLUMN \`producerId\` VARCHAR(36) NULL
      `);
      console.log('✓ Added producerId column');
    } catch (e) {
      console.log('ℹ producerId column already exists');
    }

    try {
      // Agregar clientId
      await queryRunner.query(`
        ALTER TABLE \`transactions\`
        ADD COLUMN \`clientId\` VARCHAR(36) NULL
      `);
      console.log('✓ Added clientId column');
    } catch (e) {
      console.log('ℹ clientId column already exists');
    }

    try {
      // Agregar direction (enum)
      await queryRunner.query(`
        ALTER TABLE \`transactions\`
        ADD COLUMN \`direction\` ENUM('IN', 'OUT') NOT NULL DEFAULT 'IN'
      `);
      console.log('✓ Added direction column');
    } catch (e) {
      console.log('ℹ direction column already exists');
    }

    try {
      // Agregar amount (decimal)
      await queryRunner.query(`
        ALTER TABLE \`transactions\`
        ADD COLUMN \`amount\` DECIMAL(12,2) NOT NULL DEFAULT 0
      `);
      console.log('✓ Added amount column');
    } catch (e) {
      console.log('ℹ amount column already exists');
    }

    try {
      // Agregar unit (enum)
      await queryRunner.query(`
        ALTER TABLE \`transactions\`
        ADD COLUMN \`unit\` ENUM('TRAY', 'PALLET', 'KG', 'CLP', 'USD') NOT NULL DEFAULT 'TRAY'
      `);
      console.log('✓ Added unit column');
    } catch (e) {
      console.log('ℹ unit column already exists');
    }

    try {
      // Agregar metadata (json)
      await queryRunner.query(`
        ALTER TABLE \`transactions\`
        ADD COLUMN \`metadata\` JSON NULL
      `);
      console.log('✓ Added metadata column');
    } catch (e) {
      console.log('ℹ metadata column already exists');
    }

    try {
      // Agregar createdAt
      await queryRunner.query(`
        ALTER TABLE \`transactions\`
        ADD COLUMN \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
      `);
      console.log('✓ Added createdAt column');
    } catch (e) {
      console.log('ℹ createdAt column already exists');
    }

    try {
      // Agregar updatedAt
      await queryRunner.query(`
        ALTER TABLE \`transactions\`
        ADD COLUMN \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
      `);
      console.log('✓ Added updatedAt column');
    } catch (e) {
      console.log('ℹ updatedAt column already exists');
    }

    try {
      // Agregar deletedAt
      await queryRunner.query(`
        ALTER TABLE \`transactions\`
        ADD COLUMN \`deletedAt\` DATETIME(6) NULL
      `);
      console.log('✓ Added deletedAt column');
    } catch (e) {
      console.log('ℹ deletedAt column already exists');
    }

    // Cambiar nombre de columna createdById a userId (si existe)
    try {
      await queryRunner.renameColumn('transactions', 'createdById', 'userId');
      console.log('✓ Renamed createdById to userId');
    } catch (e) {
      console.log('ℹ Column already renamed or doesnt exist');
    }

    // Asegurar que userId sea NOT NULL
    try {
      await queryRunner.query(`
        ALTER TABLE \`transactions\`
        MODIFY COLUMN \`userId\` VARCHAR(36) NOT NULL
      `);
      console.log('✓ Made userId NOT NULL');
    } catch (e) {
      console.log('ℹ userId already NOT NULL');
    }

    // Actualizar el tipo de transacción si es necesario
    try {
      await queryRunner.query(`
        UPDATE transactions
        SET type = CASE
          WHEN type = 'TRAY_RETURN_TO_PRODUCER' THEN 'TRAY_OUT_TO_PRODUCER'
          WHEN type = 'TRAY_RECEIVE_FROM_PRODUCER' THEN 'TRAY_IN_FROM_PRODUCER'
          WHEN type = 'TRAY_DELIVER_TO_CLIENT' THEN 'TRAY_OUT_TO_CLIENT'
          WHEN type = 'TRAY_RECEIVE_FROM_CLIENT' THEN 'TRAY_IN_FROM_CLIENT'
          ELSE type
        END
        WHERE type IN ('TRAY_RETURN_TO_PRODUCER', 'TRAY_RECEIVE_FROM_PRODUCER', 'TRAY_DELIVER_TO_CLIENT', 'TRAY_RECEIVE_FROM_CLIENT')
      `);
      console.log('✓ Updated transaction types');
    } catch (e) {
      console.log('ℹ Transaction types already updated');
    }

    console.log('✓ Transactions table update completed!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Update failed:', error);
    process.exit(1);
  }
}

updateTransactionsTable();