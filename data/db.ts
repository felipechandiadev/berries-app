import * as dotenv from 'dotenv';
dotenv.config();
import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entities/User";
import { Person } from "./entities/Person";
import { Audit } from "./entities/Audit";
import { Variety } from "./entities/Variety";
import { Format } from "./entities/Format";
import { Season } from "./entities/Season";
import { Producer } from "./entities/Producer";
import { Customer } from "./entities/Customer";
import { Storage } from "./entities/Storage";
import { Tray } from "./entities/Tray";
import { Pallet } from "./entities/Pallet";
import { Transaction } from "./entities/Transaction";
import { ReceptionPack } from "./entities/ReceptionPack";
import { TransactionRelation } from "./entities/TransactionRelation";
import { AdminBankAccount } from "./entities/AdminBankAccount";
import { Permission } from "./entities/Permission";
import { ProductiveUnit } from "./entities/ProductiveUnit";
import { AuditSubscriber } from "./subscribers/AuditSubscriber";

const parseBoolean = (value: string | undefined, fallback = false): boolean => {
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const getDbConfig = () => {
  // Prefer DB_*; fall back to DATABASE_* (common in Vercel dashboards)
  const host =
    process.env.DB_HOST ||
    process.env.DATABASE_HOST ||
    "localhost";
  const port = Number(
    process.env.DB_PORT || process.env.DATABASE_PORT || 3306
  );
  const username =
    process.env.DB_USER ||
    process.env.DB_USERNAME ||
    process.env.DATABASE_USER ||
    "root";
  const password =
    process.env.DB_PASSWORD ||
    process.env.DATABASE_PASSWORD ||
    "";
  const database =
    process.env.DB_NAME ||
    process.env.DB_DATABASE ||
    process.env.DATABASE_NAME ||
    "next-start";
  const synchronize = parseBoolean(process.env.DB_SYNCHRONIZE, false);
  const logging = parseBoolean(process.env.DB_LOGGING, false);
  const useSsl = parseBoolean(process.env.DB_SSL, false);
  const rejectUnauthorized = parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, false);

  console.log("[DB] Configuración de base de datos:", {
    host,
    port,
    username,
    database,
    synchronize,
    logging,
    useSsl,
  });

  return {
    type: "mysql" as const,
    host,
    port,
    username,
    password,
    database,
    synchronize,
    logging,
    entities: [
      User,
      Person,
      Audit,
      Variety,
      Format,
      Season,
      Producer,
      Customer,
      Storage,
      Tray,
      Pallet,
      Transaction,
      TransactionRelation,
      ReceptionPack,
      AdminBankAccount,
      Permission,
      ProductiveUnit,
    ],
    subscribers: [AuditSubscriber],
    migrations: [],
    ssl: useSsl
      ? {
          rejectUnauthorized,
        }
      : undefined,
    // Keep a small pool: limit 1 deadlocks when a transaction holds the only
    // connection and session/auth callbacks try to query the DB.
    extra: {
      connectionLimit: 5,
      waitForConnections: true,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      decimalNumbers: true,
      connectTimeout: 20000,
    },
  };
};

let globalDataSource: DataSource | null = null;
let initializationPromise: Promise<DataSource> | null = null;
let lastPingAt = 0;
const PING_INTERVAL_MS = 30_000;

export const getDb = async (retries: number = 0): Promise<DataSource> => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000 * Math.pow(2, retries);

  try {
    if (!globalDataSource) {
      console.log("[DB] Creando nueva instancia de DataSource (singleton)...");
      globalDataSource = new DataSource(getDbConfig());
    }

    if (!globalDataSource.isInitialized) {
      if (!initializationPromise) {
        console.log("[DB] Inicializando DataSource...");
        initializationPromise = globalDataSource.initialize().then((ds) => {
          console.log("[DB] ✅ DataSource inicializado correctamente");
          lastPingAt = Date.now();
          return ds;
        }).catch((err) => {
          initializationPromise = null;
          throw err;
        });
      }
      await initializationPromise;
    } else if (Date.now() - lastPingAt > PING_INTERVAL_MS) {
      try {
        await globalDataSource.query("SELECT 1");
        lastPingAt = Date.now();
      } catch (pingError: any) {
        console.warn("[DB] Conexión existente falló el ping, re-inicializando...", pingError?.message);
        try {
          initializationPromise = null;
          await globalDataSource.destroy();
          globalDataSource = new DataSource(getDbConfig());
          initializationPromise = globalDataSource.initialize();
          await initializationPromise;
          lastPingAt = Date.now();
          console.log("[DB] ✅ DataSource re-inicializado correctamente tras fallo de ping");
        } catch (reinitError) {
          console.error("[DB] Error crítico re-inicializando tras fallo de ping:", reinitError);
          throw reinitError;
        }
      }
    }

    return globalDataSource;
  } catch (error: any) {
    const errorCode = error?.code || error?.driverError?.code;
    const isConnectionError =
      errorCode === "ECONNRESET" ||
      errorCode === "ENOTFOUND" ||
      errorCode === "ETIMEDOUT" ||
      errorCode === "PROTOCOL_CONNECTION_LOST" ||
      errorCode === "ER_CON_COUNT_ERROR" ||
      error?.message?.includes("too many connections");

    if (isConnectionError && retries < MAX_RETRIES) {
      console.warn(
        `[DB] Error de conexión: ${errorCode}. Reintentando en ${RETRY_DELAY}ms... (Intento ${retries + 1}/${MAX_RETRIES})`
      );

      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));

      if (globalDataSource?.isInitialized) {
        try {
          await globalDataSource.destroy();
          console.log("[DB] Conexión destruida después del error");
        } catch (destroyError) {
          console.warn("[DB] Error al destruir conexión:", destroyError);
        }
      }

      globalDataSource = null;
      return getDb(retries + 1);
    }

    throw error;
  }
};

/**
 * Limpia la conexión (útil para testing o shutdown)
 */
export const closeDb = async (): Promise<void> => {
  if (globalDataSource?.isInitialized) {
    await globalDataSource.destroy();
    globalDataSource = null;
    console.log("[DB] Conexión cerrada");
  }
};
