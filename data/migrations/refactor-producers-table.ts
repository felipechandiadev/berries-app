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

    console.log('\n🚀 Migration: Refactor producers table to inherit from Person');
    console.log('═══════════════════════════════════════════════════════════');

    // 1. Obtener IDs existentes de productores
    const [existingProducers]: any = await connection.execute(
      `SELECT id, name, rut, dni, email, mail, phone FROM producers WHERE deletedAt IS NULL`
    );

    console.log(`ℹ️  Found ${existingProducers.length} existing producers`);

    // 2. Crear registros en persons tabla para cada productor existente
    if (existingProducers.length > 0) {
      console.log('📝 Creating Person records for existing producers...');

      for (const producer of existingProducers) {
        // Verificar si ya existe un person con este ID
        const [existing]: any = await connection.execute(
          `SELECT id FROM persons WHERE id = ?`,
          [producer.id]
        );

        if (existing.length === 0) {
          const dniValue = producer.dni || producer.rut || '';
          const mailValue = producer.mail || producer.email || null;
          await connection.execute(
            `INSERT INTO persons (id, name, dni, phone, mail) 
             VALUES (?, ?, ?, ?, ?)`
            , [producer.id, producer.name, dniValue, producer.phone, mailValue]
          );
          console.log(`  ✓ Created Person for producer: ${producer.name}`);
        } else {
          console.log(`  ⚠️  Person already exists for ID: ${producer.id}`);
        }
      }
    }

    // 3. Obtener estructura actual de tabla producers
    const [tableColumns]: any = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'producers'`
    );

    const columnNames = tableColumns.map((col: any) => col.COLUMN_NAME);
    const hasTypeColumn = columnNames.includes('type');

    if (!hasTypeColumn) {
      // 4. Renombrar tabla antigua si existe (backup)
      try {
        await connection.execute(`RENAME TABLE producers TO producers_old`);
        console.log('✓ Backed up old producers table as producers_old');
      } catch (e) {
        console.log('✓ No backup needed (fresh table)');
      }

      // 5. Crear nueva tabla producers (child entity)
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS producers (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          dni VARCHAR(12) NOT NULL,
          phone VARCHAR(20) NULL,
          mail VARCHAR(255) NULL,
          personId VARCHAR(36) NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          deletedAt DATETIME NULL,
          CONSTRAINT UQ_producers_dni UNIQUE (dni),
          FOREIGN KEY (personId) REFERENCES persons(id) ON DELETE CASCADE
        )
      `);
      console.log('✓ Created new producers table (person-linked structure)');

      // 6. Migrar datos si es necesario
      if (existingProducers.length > 0) {
        console.log('📝 Migrating producer data to new table...');
        for (const producer of existingProducers) {
          const dniValue = producer.dni || producer.rut || '';
          const mailValue = producer.mail || producer.email || null;
          await connection.execute(
            `INSERT INTO producers (id, name, dni, phone, mail, personId) 
             VALUES (?, ?, ?, ?, ?, ?)` ,
            [producer.id, producer.name, dniValue, producer.phone, mailValue, producer.id]
          );
        }
        console.log(`✓ Migrated ${existingProducers.length} producers to new schema`);
      }
    } else {
      console.log('✓ Table structure already updated');
    }

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
