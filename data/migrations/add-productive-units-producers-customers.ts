import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { getDbEnvConfigFromNodeEnv } from '../dbConfig';

dotenv.config();

const config = getDbEnvConfigFromNodeEnv();

async function runMigration() {
  if (!config) {
    console.error('Could not resolve database configuration from environment variables');
    process.exit(1);
  }

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

  try {
    await dataSource.initialize();
    console.log('Database connection established');

    // SQL content inline
    const sqlContent = `-- Crear tabla producers (sin FK primero)
CREATE TABLE IF NOT EXISTS \`producers\` (
  \`id\` varchar(36) NOT NULL,
  \`personId\` varchar(36) NOT NULL,
  \`name\` varchar(255) NOT NULL,
  \`dni\` varchar(12) NOT NULL,
  \`phone\` varchar(20) DEFAULT NULL,
  \`mail\` varchar(255) DEFAULT NULL,
  \`deletedAt\` datetime(6) DEFAULT NULL,
  \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`UQ_producers_dni\` (\`dni\`),
  KEY \`IDX_producers_deletedAt\` (\`deletedAt\`),
  KEY \`IDX_producers_personId\` (\`personId\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear tabla customers (sin FK primero)
CREATE TABLE IF NOT EXISTS \`customers\` (
  \`id\` varchar(36) NOT NULL,
  \`personId\` varchar(36) NOT NULL,
  \`deletedAt\` datetime(6) DEFAULT NULL,
  \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (\`id\`),
  KEY \`IDX_customers_deletedAt\` (\`deletedAt\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Agregar foreign keys después de crear las tablas
ALTER TABLE \`producers\` ADD CONSTRAINT \`FK_producers_personId\` FOREIGN KEY (\`personId\`) REFERENCES \`persons\` (\`id\`) ON DELETE CASCADE;
ALTER TABLE \`customers\` ADD CONSTRAINT \`FK_customers_personId\` FOREIGN KEY (\`personId\`) REFERENCES \`persons\` (\`id\`) ON DELETE CASCADE;`;

    // Ejecutar las sentencias SQL
    const statements = sqlContent.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.trim().substring(0, 50)}...`);
        await dataSource.query(statement);
      }
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

runMigration();