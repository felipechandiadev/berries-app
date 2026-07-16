const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const getEnvNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

async function checkTable() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: getEnvNumber(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'berries-app',
  };

  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
  });
  
  try {
    const [rows] = await connection.execute('DESCRIBE transactions');
    console.log('Columnas actuales en tabla transactions:');
    rows.forEach((row) => {
      console.log(`- ${row.Field}: ${row.Type} ${row.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${row.Default ? 'DEFAULT ' + row.Default : ''}`);
    });
  } finally {
    await connection.end();
  }
}

checkTable().catch(console.error);
