/**
 * Script de migración para actualizar la tabla varieties: eliminar precios y agregar descripción
 *
 * Uso: npx ts-node data/migrations/update-varieties-table-remove-prices-add-description.ts
 */

import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { getDbEnvConfigFromNodeEnv } from '../dbConfig';

dotenv.config();

const dbConfig = getDbEnvConfigFromNodeEnv();

async function createConnection() {
  return await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    multipleStatements: true,
  });
}

async function runMigration() {
  try {
    console.log('🚀 Iniciando migración para actualizar tabla varieties...');

    const connection = await createConnection();

    console.log('📖 Ejecutando migración...');

    const migrationSQL = `
      ALTER TABLE varieties
      DROP COLUMN priceCLP,
      DROP COLUMN priceUSD,
      DROP COLUMN currency,
      ADD COLUMN description TEXT NULL AFTER name;
    `;

    await connection.execute(migrationSQL);

    console.log('✅ Migración completada exitosamente');
    console.log('📋 Cambios realizados:');
    console.log('   - Eliminado priceCLP');
    console.log('   - Eliminado priceUSD');
    console.log('   - Eliminado currency');
    console.log('   - Agregado description (TEXT NULL)');

    await connection.end();
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
}

runMigration();