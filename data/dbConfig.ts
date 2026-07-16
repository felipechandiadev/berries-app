import * as dotenv from 'dotenv';

dotenv.config();

const parseBoolean = (value: string | undefined, fallback = false): boolean => {
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

export interface DbEnvConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean;
}

export const getDbEnvConfig = (env: NodeJS.ProcessEnv = process.env): DbEnvConfig => {
  return {
    host: env.DB_HOST || env.DB_HOST_TEST || 'localhost',
    port: env.DB_PORT ? Number(env.DB_PORT) : 3306,
    user: env.DB_USER || env.DB_USERNAME || env.DB_USER_TEST || 'root',
    password: env.DB_PASSWORD || env.DB_PASSWORD_TEST || '',
    database: env.DB_NAME || env.DB_DATABASE || env.DB_NAME_TEST || 'berries-app',
    ssl: parseBoolean(env.DB_SSL, false),
  };
};

export const getDbEnvConfigForEnvironment = (environment: 'local' | 'test' | 'production' = 'local'): DbEnvConfig => {
  if (environment === 'test') {
    return {
      host: process.env.DB_HOST_TEST || process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT_TEST ? Number(process.env.DB_PORT_TEST) : process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER_TEST || process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD_TEST || process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME_TEST || process.env.DB_NAME || 'berries-app-test',
      ssl: parseBoolean(process.env.DB_SSL_TEST, parseBoolean(process.env.DB_SSL, false)),
    };
  }

  if (environment === 'production') {
    return getDbEnvConfig(process.env);
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || process.env.DB_DATABASE || 'berries-app',
    ssl: parseBoolean(process.env.DB_SSL, false),
  };
};

export const getDbEnvConfigFromNodeEnv = (): DbEnvConfig => {
  const env = process.env.NODE_ENV === 'production'
    ? 'production'
    : process.env.NODE_ENV === 'test'
    ? 'test'
    : 'local';

  return getDbEnvConfigForEnvironment(env);
};
