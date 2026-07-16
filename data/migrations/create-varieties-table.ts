/**
 * Script de migración para crear la tabla varieties
 *
 * Uso: npx ts-node data/migrations/create-varieties-table.ts
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
    console.log('🚀 Iniciando migración para crear tabla varieties...');

    const connection = await createConnection();

    console.log('📖 Leyendo archivo de migración...');
    const migrationSQL = `CREATE TABLE IF NOT EXISTS \`varieties\` (
  \`id\` int NOT NULL AUTO_INCREMENT,
  \`name\` varchar(255) NOT NULL,
  \`priceCLP\` int NOT NULL,
  \`priceUSD\` float NOT NULL,
  \`currency\` enum('CLP','USD') NOT NULL DEFAULT 'CLP',
  \`deletedAt\` datetime(6) NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`IDX_varieties_name\` (\`name\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar datos de ejemplo
INSERT INTO \`varieties\` (\`id\`, \`name\`, \`priceCLP\`, \`priceUSD\`, \`currency\`) VALUES
(1001, 'ESPARRAGOS ORGANICOS', 15000, 18.50, 'CLP'),
(1002, 'FRAMBUESA ORGANICA', 12000, 14.75, 'CLP'),
(1003, 'ARANDANO ORGANICO', 10000, 12.30, 'CLP');`;

    console.log('⚡ Ejecutando migración...');
    
    // Procesar el SQL línea por línea para construir statements válidos
    const lines = migrationSQL.split('\n').map(line => line.trim());
    const statements: string[] = [];
    let currentStatement = '';
    
    for (const line of lines) {
      // Ignorar líneas vacías y comentarios
      if (!line || line.startsWith('--')) {
        continue;
      }
      
      currentStatement += line + ' ';
      
      // Si la línea termina con ';', es el fin del statement
      if (line.endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }
    
    console.log(`Encontrados ${statements.length} statements:`);
    statements.forEach((stmt, i) => {
      console.log(`${i + 1}: ${stmt.substring(0, 100)}...`);
    });
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Ejecutando: ${statement.substring(0, 50)}...`);
        await connection.execute(statement);
      }
    }

    console.log('✅ Migración completada exitosamente');

    // Verificar que la tabla se creó correctamente
    console.log('🔍 Verificando tabla creada...');
    const [rows] = await connection.execute('SHOW TABLES LIKE \'varieties\'');
    if (Array.isArray(rows) && rows.length > 0) {
      console.log('✅ Tabla varieties creada correctamente');

      // Verificar datos insertados
      const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM varieties');
      const count = (countResult as any[])[0]?.count || 0;
      console.log(`📊 Registros insertados: ${count}`);
    } else {
      console.log('❌ Error: Tabla varieties no encontrada');
    }

    await connection.end();
    console.log('🎉 Migración finalizada');

  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  }
}

runMigration();