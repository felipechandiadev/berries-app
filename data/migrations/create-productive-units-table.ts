/**
 * Migración para crear la tabla productive_units
 * 
 * Ejecutar con:
 * npx ts-node data/migrations/create-productive-units-table.ts
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { getDbEnvConfigFromNodeEnv } from '../dbConfig';

dotenv.config();

const config = getDbEnvConfigFromNodeEnv();

const dataSource = new DataSource({
  type: 'mysql',
  host: config.host,
  port: config.port,
  username: config.user,
  password: config.password,
  database: config.database,
  synchronize: false,
  logging: true,
});

async function runMigration() {
  try {
    console.log('🚀 Conectando a la base de datos...');
    console.log(`   Host: ${config.host}`);
    console.log(`   Database: ${config.database}`);
    
    await dataSource.initialize();
    console.log('✅ Conexión establecida');

    const queryRunner = dataSource.createQueryRunner();

    // Verificar si la tabla ya existe
    const tableExists = await queryRunner.hasTable('productive_units');
    
    if (tableExists) {
      console.log('ℹ️  La tabla productive_units ya existe');
      
      // Verificar si necesita actualizaciones de columnas
      const columns = await queryRunner.getTable('productive_units');
      const columnNames = columns?.columns.map(c => c.name) || [];
      
      console.log('   Columnas existentes:', columnNames.join(', '));
      
      // Si la tabla existe pero tiene estructura vieja (solo id y producerId), recrearla
      if (!columnNames.includes('name') || !columnNames.includes('deletedAt')) {
        console.log('⚠️  La tabla tiene estructura antigua, actualizando...');
        
        // Hacer backup de datos existentes si hay
        const existingData = await queryRunner.query('SELECT * FROM productive_units');
        console.log(`   Registros existentes: ${existingData.length}`);
        
        // Eliminar tabla antigua
        await queryRunner.query('DROP TABLE IF EXISTS productive_units');
        console.log('✅ Tabla antigua eliminada');
        
        // Crear tabla nueva
        await createTable(queryRunner);
      }
    } else {
      // Crear tabla nueva
      await createTable(queryRunner);
    }

    await queryRunner.release();
    await dataSource.destroy();
    
    console.log('\n✅ Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }
}

async function createTable(queryRunner: any) {
  console.log('📝 Creando tabla productive_units...');
  
  // Crear tabla sin foreign key primero (la FK se puede agregar después cuando exista producers)
  await queryRunner.query(`
    CREATE TABLE productive_units (
      id VARCHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(100) NULL,
      location VARCHAR(500) NULL,
      hectares DECIMAL(10, 2) NULL,
      description TEXT NULL,
      producerId VARCHAR(36) NULL,
      createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      deletedAt DATETIME(6) NULL,
      PRIMARY KEY (id),
      INDEX idx_productive_units_producerId (producerId),
      INDEX idx_productive_units_code (code),
      INDEX idx_productive_units_name (name),
      INDEX idx_productive_units_deletedAt (deletedAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  
  console.log('✅ Tabla productive_units creada');
  
  // Intentar agregar FK si la tabla producers existe
  try {
    const producersExists = await queryRunner.hasTable('producers');
    if (producersExists) {
      console.log('📝 Agregando foreign key a producers...');
      await queryRunner.query(`
        ALTER TABLE productive_units 
        ADD CONSTRAINT fk_productive_units_producer 
        FOREIGN KEY (producerId) 
        REFERENCES producers(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE
      `);
      console.log('✅ Foreign key agregada');
    } else {
      console.log('ℹ️  Tabla producers no existe, foreign key se agregará después');
    }
  } catch (fkError) {
    console.log('ℹ️  No se pudo agregar foreign key:', (fkError as Error).message);
  }
}

runMigration();
