import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { getDbEnvConfigFromNodeEnv } from './dbConfig';

dotenv.config();

const config = getDbEnvConfigFromNodeEnv();

(async () => {
  const start = Date.now();
  console.log('Intentando conectar a MySQL...');
  console.log('Host:', config.host);
  console.log('Puerto:', config.port);
  console.log('Usuario:', config.user);
  console.log('Base de datos:', config.database);
  try {
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectTimeout: 5000,
    });
    await connection.ping();
    const elapsed = Date.now() - start;
    console.log('Conexión exitosa a la base de datos:', config.host);
    console.log('Tiempo de conexión:', elapsed, 'ms');
    await connection.end();
    process.exit(0);
  } catch (err) {
    const elapsed = Date.now() - start;
    const error = err as any;
    console.error('Error de conexión:', error);
    console.error('Tiempo de espera:', elapsed, 'ms');
    if (error?.code) console.error('Código de error:', error.code);
    if (error?.errno) console.error('Errno:', error.errno);
    if (error?.sqlState) console.error('SQL State:', error.sqlState);
    process.exit(1);
  }
})();
