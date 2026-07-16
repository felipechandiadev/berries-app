import * as fs from "fs";
import * as path from "path";
import * as mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import { randomUUID } from "crypto";
import * as bcrypt from "bcrypt";
import * as dotenv from "dotenv";
import { getDbEnvConfigForEnvironment } from "../dbConfig";

// Load environment variables
dotenv.config();

interface SeedConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port?: number;
  ssl?: boolean;
}

const ENVIRONMENTS: Record<string, SeedConfig> = {
  test: getDbEnvConfigForEnvironment('test'),
  production: getDbEnvConfigForEnvironment('production'),
  local: getDbEnvConfigForEnvironment('local'),
};

const RUN_SEED_TIMEOUT_MS = 120000;
const JSON_DIR = path.join(__dirname, "dataToSeed");

// ============ Types ============

type UserSeedRow = {
  id: string;
  userName: string;
  pass: string;
  mail?: string;
  rol: string;
};

type ProducerSeedRow = {
  name: string;
  dni: string;
  phone?: string;
  mail?: string;
  productiveUnitName?: string;
};

type TraySeedRow = {
  name: string;
  weight: number;
  stock?: number;
  active?: boolean;
};

type FormatSeedRow = {
  name: string;
  description?: string | null;
  active?: boolean;
  varietyName?: string;
  priceCLP?: number;
  priceUSD?: number;
};

type VarietySeedRow = {
  name: string;
  description?: string;
  priceCLP?: number;
  priceUSD?: number;
  currency?: string;
};

type SeasonSeedRow = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  description?: string;
  active?: boolean;
};

type CustomerSeedRow = {
  name: string;
  dni: string;
  phone?: string;
  mail?: string;
};

type ProductiveUnitSeedRow = {
  name: string;
  location?: string;
};

type StorageSeedRow = {
  name: string;
  capacityPallets?: number;
  location?: string;
  active?: boolean;
};

type PalletSeedRow = {
  storageName: string;
  trayName: string;
  traysQuantity?: number;
  capacity?: number;
  weight?: number;
  dispatchWeight?: number;
  status?: string;
  varietyName?: string;
  formatName?: string;
  metadata?: Record<string, unknown> | null;
};

type ReceptionPalletAssignmentSeedRow = {
  palletIndex: number;
  traysAssigned: number;
};

type ReceptionSeedRow = {
  producerName: string;
  date: string;
  storageName: string;
  trayName: string;
  varietyName: string;
  formatName: string;
  traysQuantity: number;
  unitTrayWeight: number;
  grossWeight: number;
  pricePerKg: number;
  palletAssignments: ReceptionPalletAssignmentSeedRow[];
  returnTraysQuantity: number;
  notes?: string;
};

type AdvanceSeedRow = {
  producerName: string;
  amount: number;
  paymentMethod: "CASH" | "TRANSFER" | "CHECK";
  notes?: string;
};

// ============ Helpers ============

const loadSeedJson = <T>(fileName: string): T => {
  const filePath = path.join(JSON_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Seed JSON file not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${(error as Error).message}`);
  }
};

// ============ Seed Functions ============

/**
 * Seed admin user with their person
 */
const seedAdminUser = async (connection: mysql.Connection) => {
  console.log("\n👤 Seeding admin user...");

  const users = loadSeedJson<UserSeedRow[]>("users.json");
  
  if (users.length === 0) {
    console.warn("   ⚠️  No users found in users.json");
    return;
  }

  const admin = users[0]; // Solo el primer usuario (admin)
  
  const userId = admin.id || randomUUID();
  const userName = (admin.userName || "").trim();
  const plainPassword = (admin.pass || "").trim();
  const mail = (admin.mail || "").trim() || null;
  const rol = (admin.rol || "ADMIN").trim();

  if (!userName || !plainPassword) {
    console.warn("   ⚠️  Admin user missing userName or password");
    return;
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  // Create person for admin
  const personId = randomUUID();
  await connection.execute(
    `INSERT INTO persons (id, name, dni, phone, mail, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [personId, "Administrador", "99.999.999-9", null, mail]
  );

  // Create admin user
  await connection.execute(
    `INSERT INTO users (id, userName, pass, mail, rol, personId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [userId, userName, hashedPassword, mail, rol, personId]
  );

  console.log(`   ✓ Created admin user: ${userName}`);
};

/**
 * Seed seasons from JSON
 */
const seedSeasons = async (connection: mysql.Connection) => {
  console.log("\n🌱 Seeding seasons...");

  const seasons = loadSeedJson<SeasonSeedRow[]>("seasons.json");

  let inserted = 0;

  for (const season of seasons) {
    const id = (season.id || randomUUID()).trim();
    const name = (season.name || "").trim();
    const startDate = (season.startDate || "").trim();
    const endDate = (season.endDate || "").trim();
    
    if (!name || !startDate || !endDate) {
      continue;
    }

    const description = (season.description || "").trim() || null;
    const active = season.active !== undefined ? Boolean(season.active) : false;

    await connection.execute(
      `INSERT INTO seasons (id, name, startDate, endDate, description, active, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [id, name, startDate, endDate, description, active]
    );

    inserted++;
  }

  console.log(`   ✓ Inserted ${inserted} seasons`);
};

/**
 * Seed trays from JSON
 */
const seedTrays = async (connection: mysql.Connection): Promise<Record<string, string>> => {
  console.log("\n🧺 Seeding trays...");

  const trays = loadSeedJson<TraySeedRow[]>("trays.json");

  let inserted = 0;
  const seenNames = new Set<string>();
  const trayMap: Record<string, string> = {};

  for (const tray of trays) {
    const name = (tray.name || "").trim();
    if (!name) continue;

    const key = name.toLowerCase();
    if (seenNames.has(key)) continue;

    const weight = Number(tray.weight);
    if (!Number.isFinite(weight) || weight <= 0) {
      console.warn(`   ⚠️  Skipping tray '${name}': invalid weight`);
      continue;
    }

    const stock = Number.isFinite(tray.stock) ? Number(tray.stock) : 0;
    const active = tray.active !== undefined ? Boolean(tray.active) : true;
    const id = randomUUID();

    await connection.execute(
      `INSERT INTO trays (id, name, weight, stock, active, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [id, name, weight, stock, active]
    );

    seenNames.add(key);
    trayMap[key] = id;
    inserted++;
  }

  console.log(`   ✓ Inserted ${inserted} trays`);
  return trayMap;
};

const seedStorages = async (connection: mysql.Connection): Promise<Record<string, string>> => {
  console.log("\n🏬 Seeding storages...");

  const storages = loadSeedJson<StorageSeedRow[]>("storages.json");

  let inserted = 0;
  const seenNames = new Set<string>();
  const storageMap: Record<string, string> = {};

  for (const storage of storages) {
    const name = (storage.name || "").trim();
    if (!name) continue;

    const key = name.toLowerCase();
    if (seenNames.has(key)) continue;

    const capacityPallets = Number.isFinite(Number(storage.capacityPallets))
      ? Number(storage.capacityPallets)
      : null;
    const location = (storage.location || "").trim() || null;
    const active = storage.active !== undefined ? Boolean(storage.active) : true;
    const id = randomUUID();

    await connection.execute(
      `INSERT INTO storages (id, name, capacityPallets, location, active, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [id, name, capacityPallets, location, active]
    );

    storageMap[key] = id;
    seenNames.add(key);
    inserted++;
  }

  console.log(`   ✓ Inserted ${inserted} storages`);
  return storageMap;
};

/**
 * Seed varieties from JSON
 */
const seedVarieties = async (connection: mysql.Connection): Promise<Record<string, number>> => {
  console.log("\n🍇 Seeding varieties...");

  const varieties = loadSeedJson<VarietySeedRow[]>("varieties.json");

  let inserted = 0;
  const seenNames = new Set<string>();
  const varietyMap: Record<string, number> = {};

  for (const variety of varieties) {
    const name = (variety.name || "").trim();
    if (!name) continue;

    const key = name.toLowerCase();
    if (seenNames.has(key)) continue;

    const description = (variety.description || "").trim() || null;
    const priceCLP = Number.isFinite(Number(variety.priceCLP)) ? Number(variety.priceCLP) : 0;
    const priceUSD = Number.isFinite(Number(variety.priceUSD)) ? Number(variety.priceUSD) : 0;
    const currency = (variety.currency || "CLP").trim() || "CLP";

    const result = await connection.execute(
      `INSERT INTO varieties (name, description, priceCLP, priceUSD, currency, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [name, description, priceCLP, priceUSD, currency]
    ) as any;

    const insertedId = result[0]?.insertId;
    if (typeof insertedId === "number") {
      varietyMap[key] = insertedId;
    }

    seenNames.add(key);
    inserted++;
  }

  console.log(`   ✓ Inserted ${inserted} varieties`);
  return varietyMap;
};

/**
 * Seed formats from JSON (with price 0)
 */
const seedFormats = async (
  connection: mysql.Connection,
  varietyMap: Record<string, number>
): Promise<Record<string, number>> => {
  console.log("\n📦 Seeding formats...");

  const formats = loadSeedJson<FormatSeedRow[]>("formats.json");

  let inserted = 0;
  const seenNames = new Set<string>();
  const formatMap: Record<string, number> = {};

  for (const format of formats) {
    const name = (format.name || "").trim();
    if (!name) continue;

    const key = name.toLowerCase();
    if (seenNames.has(key)) continue;

    const description = typeof format.description === "string" ? format.description.trim() : null;
    const active = format.active !== undefined ? Boolean(format.active) : true;
    const priceCLP = Number.isFinite(Number(format.priceCLP)) ? Number(format.priceCLP) : 0;
    const priceUSD = Number.isFinite(Number(format.priceUSD)) ? Number(format.priceUSD) : 0;
    const varietyName = (format.varietyName || "").trim();
    const varietyId = varietyName ? varietyMap[varietyName.toLowerCase()] || null : null;

    if (varietyName && !varietyId) {
      console.warn(`   ⚠️  Variety not found for format '${name}': ${varietyName}`);
    }

    const result = await connection.execute(
      `INSERT INTO formats (name, description, priceCLP, priceUSD, active, varietyId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [name, description || null, priceCLP, priceUSD, active, varietyId]
    ) as any;

    const insertedId = result[0]?.insertId;
    if (typeof insertedId === "number") {
      formatMap[key] = insertedId;
    }

    seenNames.add(key);
    inserted++;
  }

  console.log(`   ✓ Inserted ${inserted} formats`);
  return formatMap;
};

const seedPallets = async (
  connection: mysql.Connection,
  trayMap: Record<string, string>,
  storageMap: Record<string, string>,
  varietyMap: Record<string, number>,
  formatMap: Record<string, number>
) => {
  console.log("\n📦 Seeding pallets...");

  const pallets = loadSeedJson<PalletSeedRow[]>("pallets.json");

  let inserted = 0;

  for (const pallet of pallets) {
    const storageName = (pallet.storageName || "").trim();
    const trayName = (pallet.trayName || "").trim();
    if (!storageName || !trayName) continue;

    const storageId = storageMap[storageName.toLowerCase()] || null;
    const trayId = trayMap[trayName.toLowerCase()] || null;

    if (!storageId) {
      console.warn(`   ⚠️  Storage not found for pallet: ${storageName}`);
      continue;
    }

    if (!trayId) {
      console.warn(`   ⚠️  Tray not found for pallet: ${trayName}`);
      continue;
    }

    const varietyName = (pallet.varietyName || "").trim();
    const formatName = (pallet.formatName || "").trim();
    const varietyId = varietyName ? varietyMap[varietyName.toLowerCase()] || null : null;
    const formatId = formatName ? formatMap[formatName.toLowerCase()] || null : null;

    if (varietyName && !varietyId) {
      console.warn(`   ⚠️  Variety not found for pallet: ${varietyName}`);
    }

    if (formatName && !formatId) {
      console.warn(`   ⚠️  Format not found for pallet: ${formatName}`);
    }

    const traysQuantity = Number.isFinite(Number(pallet.traysQuantity))
      ? Number(pallet.traysQuantity)
      : 50;
    const capacity = Number.isFinite(Number(pallet.capacity))
      ? Number(pallet.capacity)
      : Math.max(traysQuantity, 50);
    const weight = Number.isFinite(Number(pallet.weight)) ? Number(pallet.weight) : 10;
    const dispatchWeight = Number.isFinite(Number(pallet.dispatchWeight))
      ? Number(pallet.dispatchWeight)
      : 0;

    const status = (pallet.status || "AVAILABLE").trim().toUpperCase();
    const allowedStatus = ["AVAILABLE", "CLOSED", "FULL", "DISPATCHED"];
    const finalStatus = allowedStatus.includes(status) ? status : "AVAILABLE";

    const metadata = pallet.metadata && Object.keys(pallet.metadata).length > 0
      ? JSON.stringify(pallet.metadata)
      : null;

    await connection.execute(
      `INSERT INTO pallets (storageId, trayId, varietyId, formatId, traysQuantity, capacity, weight, dispatchWeight, metadata, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [storageId, trayId, varietyId, formatId, traysQuantity, capacity, weight, dispatchWeight, metadata, finalStatus]
    );

    inserted++;
  }

  console.log(`   ✓ Inserted ${inserted} pallets`);
};

const seedReceptions = async (
  connection: mysql.Connection,
  trayMap: Record<string, string>,
  storageMap: Record<string, string>,
  varietyMap: Record<string, number>,
  formatMap: Record<string, number>
) => {
  console.log("\n📥 Seeding receptions...");

  const receptions = loadSeedJson<ReceptionSeedRow[]>("receptions.json");
  if (!Array.isArray(receptions) || receptions.length === 0) {
    console.log("   ⚠️  No receptions found in receptions.json");
    return;
  }

  const [userRows] = await connection.execute<RowDataPacket[]>(
    `SELECT id, userName FROM users ORDER BY userName ASC LIMIT 1`
  );
  if (userRows.length === 0) {
    throw new Error('No users found to associate with reception transactions');
  }
  const userId = String(userRows[0].id);
  const userName = String(userRows[0].userName || 'admin');

  const [seasonRows] = await connection.execute<RowDataPacket[]>(
    `SELECT id FROM seasons WHERE active = 1 ORDER BY startDate DESC LIMIT 1`
  );
  if (seasonRows.length === 0) {
    throw new Error('No active season found for reception seed');
  }
  const seasonId = String(seasonRows[0].id);

  const [palletRows] = await connection.execute<RowDataPacket[]>(
    `SELECT id, storageId, trayId, traysQuantity, capacity, weight, status, metadata FROM pallets ORDER BY id ASC`
  );
  const pallets = palletRows.map((row) => ({
    id: Number(row.id),
    storageId: row.storageId,
    trayId: row.trayId,
    traysQuantity: Number(row.traysQuantity || 0),
    capacity: Number(row.capacity || 0),
    weight: Number(row.weight || 0),
    status: String(row.status || 'AVAILABLE'),
    metadata: row.metadata,
  }));

  let inserted = 0;

  for (const reception of receptions) {
    const producerName = (reception.producerName || "").trim();
    if (!producerName) {
      console.warn(`   ⚠️  Reception missing producer name, skipping`);
      continue;
    }

    const [producerRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM producers WHERE name = ? LIMIT 1`,
      [producerName]
    );
    if (producerRows.length === 0) {
      console.warn(`   ⚠️  Producer not found for reception: ${producerName}`);
      continue;
    }
    const producerId = String(producerRows[0].id);

    const storageName = (reception.storageName || "").trim();
    const trayName = (reception.trayName || "").trim();
    const varietyName = (reception.varietyName || "").trim();
    const formatName = (reception.formatName || "").trim();

    const storageId = storageMap[storageName.toLowerCase()] || null;
    const trayId = trayMap[trayName.toLowerCase()] || null;
    const varietyId = varietyName ? varietyMap[varietyName.toLowerCase()] || null : null;
    const formatId = formatName ? formatMap[formatName.toLowerCase()] || null : null;

    if (!storageId) {
      console.warn(`   ⚠️  Storage not found for reception: ${storageName}`);
      continue;
    }
    if (!trayId) {
      console.warn(`   ⚠️  Tray not found for reception: ${trayName}`);
      continue;
    }
    if (!varietyId) {
      console.warn(`   ⚠️  Variety not found for reception: ${varietyName}`);
      continue;
    }
    if (!formatId) {
      console.warn(`   ⚠️  Format not found for reception: ${formatName}`);
      continue;
    }

    const traysQuantity = Number.isFinite(Number(reception.traysQuantity))
      ? Number(reception.traysQuantity)
      : 0;
    const unitTrayWeight = Number.isFinite(Number(reception.unitTrayWeight))
      ? Number(reception.unitTrayWeight)
      : 0;
    const traysTotalWeight = Number((traysQuantity * unitTrayWeight).toFixed(3));
    const grossWeight = Number.isFinite(Number(reception.grossWeight))
      ? Number(reception.grossWeight)
      : traysTotalWeight;
    const netWeight = Number(Math.max(0, grossWeight - traysTotalWeight).toFixed(3));
    const netWeightBeforeImpurities = netWeight;
    const pricePerKg = Number.isFinite(Number(reception.pricePerKg))
      ? Number(reception.pricePerKg)
      : 500;
    const totalToPay = Number((netWeight * pricePerKg).toFixed(3));
    const currency = 'CLP';
    const packNumber = 1;
    const nowIso = new Date().toISOString();

    const packAssignments = Array.isArray(reception.palletAssignments) ? reception.palletAssignments : [];
    const validAssignments = packAssignments.filter(
      (assignment) => Number.isFinite(Number(assignment.palletIndex)) && Number.isFinite(Number(assignment.traysAssigned)) && assignment.traysAssigned > 0
    );

    const resolvedAssignments: Array<{ palletId: number; traysAssigned: number; palletIndex: number }> = [];
    for (const assignment of validAssignments) {
      const palletReference = pallets[assignment.palletIndex];
      if (!palletReference) {
        console.warn(`   ⚠️  Pallet index ${assignment.palletIndex} not found, skipping assignment`);
        continue;
      }
      if (palletReference.storageId !== storageId || palletReference.trayId !== trayId) {
        console.warn(`   ⚠️  Pallet ${palletReference.id} does not match reception storage/tray, skipping assignment`);
        continue;
      }
      resolvedAssignments.push({
        palletId: palletReference.id,
        traysAssigned: assignment.traysAssigned,
        palletIndex: assignment.palletIndex,
      });
    }

    const [transactionResult] = await connection.execute<any>(
      `INSERT INTO transactions (type, direction, unit, amount, seasonId, producerId, userId, formatId, metadata, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        'RECEPTION',
        'OUT',
        'CLP',
        Number(totalToPay.toFixed(2)),
        seasonId,
        producerId,
        userId,
        null,
        null,
      ]
    );

    const receptionTransactionId = String(transactionResult.insertId);

    const receptionPack = await connection.execute<any>(
      `INSERT INTO reception_packs (receptionTransactionId, varietyId, varietyName, formatId, formatName, trayId, trayLabel, traysQuantity, unitTrayWeight, traysTotalWeight, grossWeight, netWeightBeforeImpurities, impurityPercent, netWeight, pricePerKg, currency, totalToPay, palletAssignments, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        receptionTransactionId,
        varietyId,
        varietyName,
        formatId,
        formatName,
        trayId,
        trayName,
        traysQuantity,
        unitTrayWeight,
        traysTotalWeight,
        grossWeight,
        netWeightBeforeImpurities,
        0,
        netWeight,
        pricePerKg,
        currency,
        totalToPay,
        JSON.stringify(resolvedAssignments.map((assignment) => ({
          palletId: assignment.palletId,
          traysAssigned: assignment.traysAssigned,
        }))),
      ]
    );

    const receptionPackId = Number(receptionPack[0]?.insertId || 0);

    await connection.execute(
      `INSERT INTO transaction_relations (parentTransactionId, childTransactionId, childReceptionPackId, relationType, context, createdAt, updatedAt)
       VALUES (?, NULL, ?, ?, ?, NOW(), NOW())`,
      [receptionTransactionId, receptionPackId, 'RECEPTION_PACK', `pack ${packNumber}`]
    );

    for (const assignment of resolvedAssignments) {
      const palletReference = pallets[assignment.palletIndex];
      if (!palletReference) {
        continue;
      }

      const palletTraysBefore = palletReference.traysQuantity;
      const nextTraysQuantity = palletReference.traysQuantity + assignment.traysAssigned;
      const nextWeight = Number((palletReference.weight + assignment.traysAssigned * unitTrayWeight).toFixed(3));
      const nextStatus = nextTraysQuantity >= palletReference.capacity ? 'FULL' : 'AVAILABLE';

      let metadataArray: Array<Record<string, unknown>> = [];
      if (palletReference.metadata) {
        if (typeof palletReference.metadata === 'string') {
          try {
            const parsed = JSON.parse(palletReference.metadata);
            if (Array.isArray(parsed)) {
              metadataArray = parsed;
            }
          } catch {
            metadataArray = [];
          }
        } else if (Array.isArray(palletReference.metadata)) {
          metadataArray = palletReference.metadata;
        }
      }

      metadataArray.push({
        receptionPackId: String(receptionPackId),
        trayId,
        quantity: assignment.traysAssigned,
        receptionId: receptionTransactionId,
      });

      await connection.execute(
        `UPDATE pallets SET traysQuantity = ?, weight = ?, status = ?, metadata = ? WHERE id = ?`,
        [nextTraysQuantity, nextWeight, nextStatus, JSON.stringify(metadataArray), palletReference.id]
      );

      palletReference.traysQuantity = nextTraysQuantity;
      palletReference.weight = nextWeight;
      palletReference.status = nextStatus;
      palletReference.metadata = JSON.stringify(metadataArray);

      const [assignmentResult] = await connection.execute<any>(
        `INSERT INTO transactions (type, direction, unit, amount, seasonId, producerId, userId, formatId, metadata, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          'PALLET_TRAY_ASSIGNMENT',
          'IN',
          'TRAY',
          assignment.traysAssigned,
          seasonId,
          producerId,
          userId,
          null,
          JSON.stringify({
            receptionTransactionId,
            receptionPackId,
            packNumber,
            palletId: palletReference.id,
            trayId,
            trayLabel: trayName,
            traysAssigned: assignment.traysAssigned,
            palletTraysBefore,
            palletTraysAfter: nextTraysQuantity,
            performedBy: userId,
            performedByName: userName,
            performedAt: nowIso,
          }),
        ]
      );

      const assignmentTransactionId = String(assignmentResult.insertId);
      await connection.execute(
        `INSERT INTO transaction_relations (parentTransactionId, childTransactionId, childReceptionPackId, relationType, context, createdAt, updatedAt)
         VALUES (?, ?, NULL, ?, ?, NOW(), NOW())`,
        [receptionTransactionId, assignmentTransactionId, 'PALLET_ASSIGNMENT', `pack ${packNumber} → pallet ${palletReference.id}`]
      );
    }

    const totalReturns = Number.isFinite(Number(reception.returnTraysQuantity))
      ? Number(reception.returnTraysQuantity)
      : 0;
    const totalPackTrays = traysQuantity;

    const [trayRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, stock FROM trays WHERE id = ? LIMIT 1`,
      [trayId]
    );
    if (trayRows.length === 0) {
      console.warn(`   ⚠️  Tray record not found for reception tray ${trayName}`);
      continue;
    }
    const currentTrayStock = Number(trayRows[0].stock || 0);
    const stockAfterIn = currentTrayStock + totalPackTrays;
    const nextTrayStock = stockAfterIn - totalReturns;

    await connection.execute(
      `UPDATE trays SET stock = ? WHERE id = ?`,
      [nextTrayStock, trayId]
    );

    let trayReturnTransactionId: string | null = null;

    if (totalPackTrays > 0) {
      const [trayReceptionResult] = await connection.execute<any>(
        `INSERT INTO transactions (type, direction, unit, amount, seasonId, producerId, userId, formatId, metadata, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          'TRAY_IN_FROM_PRODUCER',
          'IN',
          'TRAY',
          totalPackTrays,
          seasonId,
          producerId,
          userId,
          null,
          JSON.stringify({
            receptionTransactionId,
            trayId,
            trayLabel: trayName,
            quantity: totalPackTrays,
            stockBefore: currentTrayStock,
            stockAfter: stockAfterIn,
            packReceptionIds: [receptionPackId],
            packNumbers: [packNumber],
          }),
        ]
      );

      const trayReceptionTransactionId = String(trayReceptionResult.insertId);
      await connection.execute(
        `INSERT INTO transaction_relations (parentTransactionId, childTransactionId, childReceptionPackId, relationType, context, createdAt, updatedAt)
         VALUES (?, ?, NULL, ?, ?, NOW(), NOW())`,
        [receptionTransactionId, trayReceptionTransactionId, 'TRAY_RECEPTION', `tray ${trayName}`]
      );
    }

    if (totalReturns > 0) {
      const [trayReturnResult] = await connection.execute<any>(
        `INSERT INTO transactions (type, direction, unit, amount, seasonId, producerId, userId, formatId, metadata, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          'TRAY_OUT_TO_PRODUCER',
          'OUT',
          'TRAY',
          totalReturns,
          seasonId,
          producerId,
          userId,
          null,
          JSON.stringify({
            receptionTransactionId,
            trayId,
            trayLabel: trayName,
            quantityReturned: totalReturns,
            stockBefore: stockAfterIn,
            stockAfter: nextTrayStock,
          }),
        ]
      );

      trayReturnTransactionId = String(trayReturnResult.insertId);
      await connection.execute(
        `INSERT INTO transaction_relations (parentTransactionId, childTransactionId, childReceptionPackId, relationType, context, createdAt, updatedAt)
         VALUES (?, ?, NULL, ?, ?, NOW(), NOW())`,
        [receptionTransactionId, trayReturnTransactionId, 'TRAY_DEVOLUTION', `tray ${trayName} · qty ${totalReturns}`]
      );
    }

    const metadataPacks = [{
      packId: receptionPackId,
      packNumber,
      varietyId,
      varietyName,
      formatId,
      formatName,
      trayId,
      trayLabel: trayName,
      traysQuantity,
      unitTrayWeightKg: unitTrayWeight,
      traysTotalWeightKg: traysTotalWeight,
      grossWeightKg: grossWeight,
      netWeightBeforeImpuritiesKg: netWeightBeforeImpurities,
      netWeightKg: netWeight,
      impurityPercent: 0,
      currency,
      pricePerKg,
      totalToPay,
      palletAssignments: resolvedAssignments.map((assignment) => ({
        palletId: assignment.palletId,
        traysAssigned: assignment.traysAssigned,
      })),
    }];

    const metadataTrayReturns = totalReturns > 0 && trayReturnTransactionId
      ? [{
          transactionId: trayReturnTransactionId,
          trayId,
          trayLabel: trayName,
          quantityReturned: totalReturns,
          stockBefore: stockAfterIn,
          stockAfter: nextTrayStock,
        }]
      : [];

    const receptionMetadata = {
      producerId,
      producerName,
      guideNumber: null,
      driver: null,
      varietyIds: [varietyId],
      formatIds: [formatId],
      trayTypeIds: [trayId],
      packs: metadataPacks,
      trayReturns: metadataTrayReturns,
      multiPack: false,
      totals: {
        packsCount: 1,
        traysInPacks: traysQuantity,
        trayReturns: totalReturns,
        grossWeightKg: grossWeight,
        netWeightKg: netWeight,
        trayWeightKg: traysTotalWeight,
        payableCLP: totalToPay,
        payableUSD: 0,
        totalCLPToPay: totalToPay,
      },
      exchangeRate: 0,
      totalCLPToPay: totalToPay,
      changesHistory: [{
        changedAt: nowIso,
        changedBy: userId,
        changedByName: userName,
        summary: 'Registro inicial de la recepción',
        details: [
          { field: 'exchangeRate', previousValue: null, newValue: 0 },
          { field: 'totalCLPToPay', previousValue: null, newValue: totalToPay },
        ],
      }],
      notes: reception.notes || null,
      date: reception.date,
    };

    await connection.execute(
      `UPDATE transactions SET metadata = ? WHERE id = ?`,
      [JSON.stringify(receptionMetadata), receptionTransactionId]
    );

    inserted++;
  }

  console.log(`   ✓ Inserted ${inserted} receptions`);
};

const seedProductiveUnits = async (connection: mysql.Connection): Promise<Record<string, string>> => {
  console.log("\n🏢 Seeding productive units...");

  const productiveUnits = loadSeedJson<ProductiveUnitSeedRow[]>("productiveUnits.json");

  let inserted = 0;
  const seenNames = new Set<string>();
  const unitMap: Record<string, string> = {};

  for (const unit of productiveUnits) {
    const name = (unit.name || "").trim();
    if (!name) continue;

    const key = name.toLowerCase();
    if (seenNames.has(key)) continue;

    const location = (unit.location || "").trim() || null;
    const id = randomUUID();

    await connection.execute(
      `INSERT INTO productive_units (id, name, location, createdAt, updatedAt)
       VALUES (?, ?, ?, NOW(), NOW())`,
      [id, name, location]
    );

    unitMap[key] = id;
    seenNames.add(key);
    inserted++;
  }

  console.log(`   ✓ Inserted ${inserted} productive units`);
  return unitMap;
};

/**
 * Seed producers from JSON (creating persons first)
 */
const seedProducers = async (
  connection: mysql.Connection,
  productiveUnitMap: Record<string, string> = {}
) => {
  console.log("\n👨‍🌾 Seeding producers...");

  const producers = loadSeedJson<ProducerSeedRow[]>("producers.json");

  let inserted = 0;
  const seenDnis = new Set<string>();
  const maxProducers = 10;

  for (const producer of producers) {
    if (inserted >= maxProducers) break;

    const name = (producer.name || "").trim();
    const dni = (producer.dni || "").trim();
    
    if (!name || !dni) continue;

    // Skip duplicates by DNI
    const dniKey = dni.toLowerCase();
    if (seenDnis.has(dniKey)) continue;

    const phone = (producer.phone || "").trim() || null;
    const mail = (producer.mail || "").trim() || null;
    const productiveUnitName = (producer.productiveUnitName || "").trim();
    const productiveUnitId = productiveUnitName
      ? productiveUnitMap[productiveUnitName.toLowerCase()] || null
      : null;

    if (productiveUnitName && !productiveUnitId) {
      console.warn(`   ⚠️  Productive unit not found for producer '${name}': ${productiveUnitName}`);
    }

    // Create person first
    const personId = randomUUID();
    await connection.execute(
      `INSERT INTO persons (id, name, dni, phone, mail, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [personId, name, dni, phone, mail]
    );

    // Create producer linked to person and optional productive unit
    const producerId = randomUUID();
    await connection.execute(
      `INSERT INTO producers (id, name, dni, phone, mail, personId, productiveUnitId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [producerId, name, dni, phone, mail, personId, productiveUnitId]
    );

    seenDnis.add(dniKey);
    inserted++;
  }

  console.log(`   ✓ Inserted ${inserted} producers (with persons)`);
};

/**
 * Seed advances for producers with receptions.
 * Enforces sum(advances) < sum(reception amounts) per producer.
 */
const seedAdvances = async (connection: mysql.Connection) => {
  console.log("\n💵 Seeding advances...");

  const advances = loadSeedJson<AdvanceSeedRow[]>("advances.json");
  if (!Array.isArray(advances) || advances.length === 0) {
    console.log("   ⚠️  No advances found in advances.json");
    return;
  }

  const [userRows] = await connection.execute<RowDataPacket[]>(
    `SELECT id FROM users ORDER BY userName ASC LIMIT 1`
  );
  if (userRows.length === 0) {
    throw new Error("No users found to associate with advances");
  }
  const userId = String(userRows[0].id);

  const [seasonRows] = await connection.execute<RowDataPacket[]>(
    `SELECT id FROM seasons WHERE active = 1 ORDER BY startDate DESC LIMIT 1`
  );
  if (seasonRows.length === 0) {
    throw new Error("No active season found for advance seed");
  }
  const seasonId = String(seasonRows[0].id);

  const advancesByProducer = new Map<string, AdvanceSeedRow[]>();
  for (const advance of advances) {
    const producerName = (advance.producerName || "").trim();
    if (!producerName) {
      console.warn("   ⚠️  Advance missing producer name, skipping");
      continue;
    }
    const list = advancesByProducer.get(producerName) || [];
    list.push(advance);
    advancesByProducer.set(producerName, list);
  }

  let inserted = 0;

  for (const [producerName, producerAdvances] of advancesByProducer.entries()) {
    const [producerRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM producers WHERE name = ? LIMIT 1`,
      [producerName]
    );
    if (producerRows.length === 0) {
      console.warn(`   ⚠️  Producer not found for advance: ${producerName}`);
      continue;
    }
    const producerId = String(producerRows[0].id);

    const [receptionCapRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM transactions
       WHERE type = 'RECEPTION'
         AND producerId = ?
         AND deletedAt IS NULL`,
      [producerId]
    );
    const receptionCap = Math.floor(Number(receptionCapRows[0]?.total || 0));
    if (receptionCap <= 0) {
      console.warn(`   ⚠️  No reception balance for ${producerName}, skipping advances`);
      continue;
    }

    let runningTotal = 0;
    for (const advance of producerAdvances) {
      const amount = Math.floor(Number(advance.amount));
      if (!Number.isFinite(amount) || amount <= 0) {
        console.warn(`   ⚠️  Invalid advance amount for ${producerName}, skipping`);
        continue;
      }
      if (runningTotal + amount >= receptionCap) {
        console.warn(
          `   ⚠️  Advance ${amount} for ${producerName} would reach/exceed reception cap ${receptionCap} (running ${runningTotal}), skipping`
        );
        continue;
      }

      const paymentMethod = advance.paymentMethod || "CASH";
      const metadata = {
        paymentMethod,
        paymentDetails: {},
        notes: advance.notes || null,
      };

      await connection.execute(
        `INSERT INTO transactions (type, direction, unit, amount, seasonId, producerId, userId, formatId, metadata, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          "ADVANCE",
          "OUT",
          "CLP",
          amount,
          seasonId,
          producerId,
          userId,
          null,
          JSON.stringify(metadata),
        ]
      );

      runningTotal += amount;
      inserted++;
    }

    console.log(
      `   ✓ ${producerName}: ${runningTotal.toLocaleString("es-CL")} CLP in advances (cap ${receptionCap.toLocaleString("es-CL")})`
    );
  }

  console.log(`   ✓ Inserted ${inserted} advances`);
};

/**
 * Seed customers from JSON (creating persons first)
 */
const seedCustomers = async (connection: mysql.Connection) => {
  console.log("\n🛒 Seeding customers...");

  const customers = loadSeedJson<CustomerSeedRow[]>("customers.json");

  let inserted = 0;
  const seenDnis = new Set<string>();

  for (const customer of customers) {
    const name = (customer.name || "").trim();
    const dni = (customer.dni || "").trim();
    
    if (!name || !dni) continue;

    // Skip duplicates by DNI
    const dniKey = dni.toLowerCase();
    if (seenDnis.has(dniKey)) continue;

    const phone = (customer.phone || "").trim() || null;
    const mail = (customer.mail || "").trim() || null;

    // Check if person already exists (might have been created as producer)
    const [existingPerson] = await connection.execute(
      "SELECT id FROM persons WHERE dni = ? LIMIT 1",
      [dni]
    ) as [RowDataPacket[], any];

    let personId: string;
    
    if (existingPerson.length > 0) {
      personId = existingPerson[0].id;
    } else {
      // Create person first
      personId = randomUUID();
      await connection.execute(
        `INSERT INTO persons (id, name, dni, phone, mail, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [personId, name, dni, phone, mail]
      );
    }

    // Create customer linked to person
    const customerId = randomUUID();
    await connection.execute(
      `INSERT INTO customers (id, personId, createdAt, updatedAt)
       VALUES (?, ?, NOW(), NOW())`,
      [customerId, personId]
    );

    seenDnis.add(dniKey);
    inserted++;
  }

  console.log(`   ✓ Inserted ${inserted} customers (with persons)`);
};

// ============ SQL File Execution ============

const executeSqlFile = async (
  connection: mysql.Connection,
  filePath: string,
  name: string
): Promise<void> => {
  try {
    console.log(`\n📄 Executing ${name}...`);
    const sql = fs.readFileSync(filePath, "utf8");

    // Remove comments and split by semicolon
    const lines = sql.split("\n");
    let cleanedSql = "";
    
    for (const line of lines) {
      const commentIndex = line.indexOf("--");
      if (commentIndex === -1) {
        cleanedSql += line + "\n";
      } else if (commentIndex > 0) {
        cleanedSql += line.substring(0, commentIndex) + "\n";
      }
    }

    // Split by semicolon and filter out empty statements
    const statements = cleanedSql
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    let executedCount = 0;
    for (const statement of statements) {
      try {
        await connection.execute(statement);
        executedCount++;
      } catch (error: any) {
        if (!statement.includes("SHOW TABLES") && !statement.includes("SELECT")) {
          console.warn(`⚠️  Statement failed: ${statement.substring(0, 50)}...`);
          console.warn(`   Error: ${error.message}`);
        }
      }
    }

    console.log(`✓ ${name} completed (${executedCount} statements)`);
  } catch (error: any) {
    console.error(`❌ Error reading/executing ${name}:`, error.message);
    throw error;
  }
};

// ============ Main Seed Runner ============

const runSeed = async (environment: "test" | "production" | "local" = "test") => {
  const config = ENVIRONMENTS[environment];

  if (!config) {
    console.error(`❌ Unknown environment: ${environment}`);
    console.error(`Available environments: ${Object.keys(ENVIRONMENTS).join(", ")}`);
    process.exit(1);
  }

  let connection: mysql.Connection | null = null;

  try {
    console.log(`\n🚀 Starting seed process for [${environment.toUpperCase()}]`);
    console.log(`📍 Database: ${config.database} @ ${config.host}:${config.port || 'default'}`);
    console.log(`�� User: ${config.user}`);
    console.log("───────────────────────────────────────────────────────────");

    // Create connection
    console.log("\n🔗 Connecting to database...");
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    });
    console.log("✓ Connected to database");

    // Disable foreign key checks for seeding
    console.log("\n🔒 Disabling foreign key checks...");
    await connection.execute("SET FOREIGN_KEY_CHECKS = 0");

    // Execute SQL files to create all tables
    const sqlDir = path.join(__dirname, "sql");

    await executeSqlFile(
      connection,
      path.join(sqlDir, "drop-all-tables.sql"),
      "Drop All Tables"
    );

    await executeSqlFile(
      connection,
      path.join(sqlDir, "create-tables.sql"),
      "Create Tables"
    );

    // Seed data in order
    console.log("\n📚 Loading seed data from JSON files...");
    
    // 1. Admin user (with person)
    await seedAdminUser(connection);
    
    // 2. Season (active)
    await seedSeasons(connection);
    
    // 3. Trays
    const trayMap = await seedTrays(connection);
    
    // 4. Varieties
    const varietyMap = await seedVarieties(connection);
    
    // 5. Formats
    const formatMap = await seedFormats(connection, varietyMap);

    // 6. Storages
    const storageMap = await seedStorages(connection);

    // 8. Pallets
    await seedPallets(connection, trayMap, storageMap, varietyMap, formatMap);

    // 9. Productive units
    const productiveUnitMap = await seedProductiveUnits(connection);

    // 10. Producers (with persons)
    await seedProducers(connection, productiveUnitMap);

    // 11. Receptions (producer receptions and returns)
    await seedReceptions(connection, trayMap, storageMap, varietyMap, formatMap);

    // 12. Advances (capped below each producer's reception totals)
    await seedAdvances(connection);

    // 13. Customers (with persons)
    await seedCustomers(connection);

    // Re-enable foreign key checks
    console.log("\n🔓 Re-enabling foreign key checks...");
    await connection.execute("SET FOREIGN_KEY_CHECKS = 1");

    console.log("\n───────────────────────────────────────────────────────────");
    console.log("✅ Seed process completed successfully!");
    console.log(`📊 Database [${environment.toUpperCase()}] is now ready`);
    console.log("\n📋 Seeded data summary:");
    console.log("   - 1 Admin user (admin)");
    console.log("   - Seasons from seasons.json");
    console.log("   - Trays from trays.json");
    console.log("   - Storages from storages.json");
    console.log("   - Pallets from pallets.json");
    console.log("   - Varieties from varieties.json");
    console.log("   - Formats from formats.json");
    console.log("   - Productive units from productiveUnits.json");
    console.log("   - Producers from producers.json (with persons, 6 linked to productive units)");
    console.log("   - Receptions from receptions.json (20 ARANDANOS / ARANDANERA)");
    console.log("   - Advances from advances.json (1–2 per producer with receptions)");
    console.log("   - Customers from customers.json (with persons)");
    console.log("\n📭 Empty tables:");
    console.log("   - audits, permissions, admin_bank_accounts");
    console.log("   - producer_bank_accounts");

    await connection.end();
    process.exit(0);
  } catch (error: any) {
    console.error("\n───────────────────────────────────────────────────────────");
    console.error("❌ Seed process failed:");
    console.error(error.message);
    console.error(error.stack);

    if (connection) {
      try {
        await connection.end();
      } catch (closeError) {
        console.error("Error closing connection:", closeError);
      }
    }

    process.exit(1);
  }
};

// Parse command line arguments
const environment = (process.argv[2] || "test") as "test" | "production" | "local";

// Set process timeout
setTimeout(() => {
  console.error(`\n❌ Seed execution timeout (${RUN_SEED_TIMEOUT_MS / 1000} seconds)`);
  process.exit(1);
}, RUN_SEED_TIMEOUT_MS);

runSeed(environment);
