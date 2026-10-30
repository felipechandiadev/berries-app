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

/**
 * Next HMR re-evalúa este módulo: sin globalThis se abren pools nuevos y
 * saturan MySQL (Too many connections) junto con Berries-Angeles.
 */
type DbGlobal = {
  __berriesAppTypeormDs?: DataSource;
  __berriesAppTypeormInit?: Promise<DataSource>;
  __berriesAppLastPing?: number;
};

const g = globalThis as typeof globalThis & DbGlobal;
const PING_INTERVAL_MS = 30_000;

export const getDb = async (retries: number = 0): Promise<DataSource> => {
  const MAX_RETRIES = 5;
  const RETRY_DELAY = Math.min(8000, 500 * Math.pow(2, retries));

  try {
    if (g.__berriesAppTypeormDs?.isInitialized) {
      const lastPing = g.__berriesAppLastPing ?? 0;
      if (Date.now() - lastPing > PING_INTERVAL_MS) {
        try {
          await g.__berriesAppTypeormDs.query("SELECT 1");
          g.__berriesAppLastPing = Date.now();
        } catch (pingError: any) {
          console.warn("[DB] Ping falló, re-inicializando...", pingError?.message);
          try {
            await g.__berriesAppTypeormDs.destroy();
          } catch {
            /* ignore */
          }
          g.__berriesAppTypeormDs = undefined;
          g.__berriesAppTypeormInit = undefined;
        }
      }
      if (g.__berriesAppTypeormDs?.isInitialized) {
        return g.__berriesAppTypeormDs;
      }
    }

    if (!g.__berriesAppTypeormInit) {
      g.__berriesAppTypeormInit = (async () => {
        if (!g.__berriesAppTypeormDs) {
          console.log("[DB] DataSource singleton (globalThis)...");
          g.__berriesAppTypeormDs = new DataSource(getDbConfig());
        }
        if (!g.__berriesAppTypeormDs.isInitialized) {
          console.log("[DB] Inicializando DataSource...");
          await g.__berriesAppTypeormDs.initialize();
          g.__berriesAppLastPing = Date.now();
          console.log("[DB] ✅ DataSource inicializado correctamente");
        }
        return g.__berriesAppTypeormDs;
      })().catch((err) => {
        g.__berriesAppTypeormInit = undefined;
        if (g.__berriesAppTypeormDs && !g.__berriesAppTypeormDs.isInitialized) {
          g.__berriesAppTypeormDs = undefined;
        }
        throw err;
      });
    }

    return await g.__berriesAppTypeormInit;
  } catch (error: any) {
    const errorCode = error?.code || error?.driverError?.code;
    const msg = String(error?.message || "");
    const tooMany =
      errorCode === "ER_CON_COUNT_ERROR" || /too many connections/i.test(msg);
    const isConnectionError =
      errorCode === "ECONNRESET" ||
      errorCode === "ENOTFOUND" ||
      errorCode === "ETIMEDOUT" ||
      errorCode === "PROTOCOL_CONNECTION_LOST" ||
      tooMany;

    if (!isConnectionError || retries >= MAX_RETRIES) {
      throw error;
    }

    console.warn(
      `[DB] Error de conexión: ${errorCode}. Reintentando en ${RETRY_DELAY}ms... (Intento ${retries + 1}/${MAX_RETRIES})`
    );
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));

    // Too many connections: esperar, no destruir (empeora el leak)
    if (tooMany) {
      g.__berriesAppTypeormInit = undefined;
      return getDb(retries + 1);
    }

    if (g.__berriesAppTypeormDs?.isInitialized) {
      try {
        await g.__berriesAppTypeormDs.destroy();
      } catch (destroyError) {
        console.warn("[DB] Error al destruir conexión:", destroyError);
      }
    }
    g.__berriesAppTypeormDs = undefined;
    g.__berriesAppTypeormInit = undefined;
    return getDb(retries + 1);
  }
};

/**
 * Limpia la conexión (útil para testing o shutdown)
 */
export const closeDb = async (): Promise<void> => {
  g.__berriesAppTypeormInit = undefined;
  if (g.__berriesAppTypeormDs?.isInitialized) {
    await g.__berriesAppTypeormDs.destroy();
    console.log("[DB] Conexión cerrada");
  }
  g.__berriesAppTypeormDs = undefined;
};
