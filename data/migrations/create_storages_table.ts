/**
 * Script de migración para crear la tabla storages
 *
 * Uso: npx ts-node data/migrations/create_storages_table.ts
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
    console.log('🚀 Iniciando migración de tabla storages...');

    const connection = await createConnection();

    console.log(`📍 Conectado a: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

    // SQL content inline
    const sqlContent = `CREATE TABLE IF NOT EXISTS \`storages\` (
  \`id\` char(36) NOT NULL,
  \`name\` varchar(255) NOT NULL,
  \`capacityPallets\` int NULL,
  \`location\` varchar(255) NULL,
  \`active\` boolean DEFAULT TRUE,
  \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  \`deletedAt\` datetime(6) NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`IDX_storages_name\` (\`name\`),
  INDEX \`IDX_storages_active\` (\`active\`),
  INDEX \`IDX_storages_deleted_at\` (\`deletedAt\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;

    console.log('🔄 Ejecutando migración...');

    // Ejecutar la migración
    await connection.execute(sqlContent);

    console.log('✅ Migración ejecutada exitosamente');

    // Verificar que la tabla se creó correctamente
    const [tables] = await connection.execute('SHOW TABLES LIKE "storages"');
    if ((tables as any[]).length > 0) {
      console.log('✅ Tabla storages creada correctamente');

      // Mostrar información de la tabla
      const [columns] = await connection.execute('DESCRIBE storages');
      console.log('📋 Columnas de la tabla storages:');
      (columns as any[]).forEach((col: any) => {
        console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
      });
    } else {
      console.error('❌ Error: La tabla storages no se creó');
    }

    await connection.end();

    console.log('🎉 Migración completada exitosamente!');

  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }
}

runMigration();