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

    // Leer el archivo SQL
    const sqlFilePath = join(__dirname, 'add-mail-to-persons.sql');
    const sqlContent = readFileSync(sqlFilePath, 'utf8');

    // Ejecutar la sentencia SQL
    console.log(`Executing: ${sqlContent.trim()}`);
    await dataSource.query(sqlContent);

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

runMigration();