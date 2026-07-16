import mysql from 'mysql2/promise';

async function migration() {
  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection({
      host: '72.61.6.232',
      user: 'next-elect',
      password: 'redbull90',
      database: 'next-start',
    });

    console.log('\n🚀 Migration: Add type discriminator to persons table');
    console.log('═══════════════════════════════════════════════════════════');

    // Verificar si la columna ya existe
    const [columns]: any = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'persons' AND COLUMN_NAME = 'type'`
    );

    if (columns.length > 0) {
      console.log('✓ Column "type" already exists in persons table');
    } else {
      // Agregar columna type con valor por defecto 'person'
      await connection.execute(
        `ALTER TABLE persons ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'person' AFTER id`
      );
      console.log('✓ Added "type" column to persons table');
    }

    // Actualizar registros existentes
    // - Workers existentes (si hay)
    // - Nuevos productores serán marcados como 'producer'

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ Migration completed successfully!');

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error);
    process.exit(1);
  }
}

migration();
