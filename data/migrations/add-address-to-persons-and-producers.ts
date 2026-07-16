import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { getDbEnvConfigFromNodeEnv } from '../dbConfig';
import { join } from 'path';
import { readFileSync } from 'fs';

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

    // Leer el archivo SQL
    const sqlFilePath = join(__dirname, 'add-address-to-persons-and-producers.sql');
    const sqlContent = readFileSync(sqlFilePath, 'utf8');

    // Ejecutar las sentencias SQL por separado
    const statements = sqlContent.split(';').map((stmt: string) => stmt.trim()).filter((stmt: string) => stmt.length > 0);
    
    for (const statement of statements) {
      console.log(`Executing: ${statement}`);
      await dataSource.query(statement);
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