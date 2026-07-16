/**
 * Script de migración para crear la tabla formats
 *
 * Uso: npx ts-node data/migrations/create_formats_table.ts
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
    console.log('🚀 Iniciando migración de tabla formats...');

    const connection = await createConnection();

    console.log(`📍 Conectado a: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

    // SQL content inline
    const sqlContent = `CREATE TABLE IF NOT EXISTS \`formats\` (
  \`id\` int NOT NULL AUTO_INCREMENT,
  \`name\` varchar(100) NOT NULL,
  \`description\` varchar(255) NULL,
  \`active\` boolean DEFAULT TRUE,
  \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  \`deletedAt\` datetime(6) NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`IDX_formats_name\` (\`name\`),
  INDEX \`IDX_formats_active\` (\`active\`),
  INDEX \`IDX_formats_deleted_at\` (\`deletedAt\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;

    console.log('🔄 Ejecutando migración...');

    // Ejecutar la migración
    await connection.execute(sqlContent);

    console.log('✅ Migración ejecutada exitosamente');

    // Verificar que la tabla se creó correctamente
    const [tables] = await connection.execute('SHOW TABLES LIKE "formats"');
    if ((tables as any[]).length > 0) {
      console.log('✅ Tabla formats creada correctamente');

      // Mostrar algunos registros de ejemplo
      const [rows] = await connection.execute('SELECT COUNT(*) as count FROM formats');
      const count = (rows as any[])[0].count;
      console.log(`📊 Registros insertados: ${count}`);
    } else {
      console.error('❌ Error: La tabla formats no se creó');
    }

    await connection.end();

    console.log('🎉 Migración completada exitosamente!');

  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }
}

runMigration();