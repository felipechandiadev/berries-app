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
    const sqlContent = `-- Drop legacy foreign keys if they exist
ALTER TABLE \`producers\` DROP FOREIGN KEY IF EXISTS \`FK_producers_personId\`;
ALTER TABLE \`producers\` DROP FOREIGN KEY IF EXISTS \`FK_producers_productiveUnitId\`;

-- Ensure core columns are present
ALTER TABLE \`producers\`
  ADD COLUMN IF NOT EXISTS \`name\` varchar(255) NOT NULL AFTER \`id\`,
  ADD COLUMN IF NOT EXISTS \`dni\` varchar(12) NOT NULL AFTER \`name\`,
  ADD COLUMN IF NOT EXISTS \`phone\` varchar(20) NULL AFTER \`dni\`,
  ADD COLUMN IF NOT EXISTS \`mail\` varchar(255) NULL AFTER \`phone\`,
  ADD COLUMN IF NOT EXISTS \`personId\` varchar(36) NOT NULL AFTER \`mail\`;

-- Remove legacy productive unit linkage
ALTER TABLE \`producers\` DROP COLUMN IF EXISTS \`productiveUnitId\`;

-- Restore foreign key to persons table
ALTER TABLE \`producers\` ADD CONSTRAINT \`FK_producers_personId\` FOREIGN KEY (\`personId\`) REFERENCES \`persons\` (\`id\`) ON DELETE CASCADE;

-- Enforce unique identifier for producers
ALTER TABLE \`producers\` ADD UNIQUE KEY IF NOT EXISTS \`UQ_producers_dni\` (\`dni\`);`;

    // Execute SQL statements
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
