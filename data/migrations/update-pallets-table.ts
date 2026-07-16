import { getDb } from '../db';

export async function updatePalletsTable() {
  try {
    console.log('[updatePalletsTable] Starting migration...');

    const db = await getDb();

    // Convertir columna ID a entero autoincremental si aún es VARCHAR
    const idColumnInfo = await db.query(
      `SELECT DATA_TYPE FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pallets' AND COLUMN_NAME = 'id'`
    ) as Array<{ DATA_TYPE: string }>;

    const idColumnType = idColumnInfo[0]?.DATA_TYPE?.toLowerCase();

    if (idColumnType && idColumnType !== 'int') {
      console.log('[updatePalletsTable] Convirtiendo columna id a INT AUTO_INCREMENT');

      await db.query('ALTER TABLE pallets DROP PRIMARY KEY');
      await db.query("ALTER TABLE pallets CHANGE COLUMN id legacyId VARCHAR(36) NULL");
      await db.query('ALTER TABLE pallets ADD COLUMN id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST');

      console.log('[updatePalletsTable] Ajustando IDs existentes para comenzar en 1001');
      await db.query('UPDATE pallets SET id = id + 1000');

      const maxIdRows = await db.query("SELECT MAX(id) AS maxId FROM pallets") as Array<{ maxId: number | null }>;
      const maxId = Number(maxIdRows[0]?.maxId ?? 1000);
      const nextId = Math.max(Number.isFinite(maxId) ? maxId + 1 : 1001, 1001);
      await db.query(`ALTER TABLE pallets AUTO_INCREMENT = ${nextId}`);

      const legacyColumn = await db.query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pallets' AND COLUMN_NAME = 'legacyId'`
      ) as Array<{ COLUMN_NAME: string }>;

      if (legacyColumn.length > 0) {
        console.log('[updatePalletsTable] Eliminando columna legacyId');
        await db.query('ALTER TABLE pallets DROP COLUMN legacyId');
      }
    } else {
      const maxIdRows = await db.query("SELECT MAX(id) AS maxId FROM pallets") as Array<{ maxId: number | null }>;
      const maxId = Number(maxIdRows[0]?.maxId ?? 1000);
      const desiredAutoIncrement = Math.max(Number.isFinite(maxId) ? maxId + 1 : 1001, 1001);
      console.log(`[updatePalletsTable] Garantizando AUTO_INCREMENT >= ${desiredAutoIncrement}`);
      await db.query(`ALTER TABLE pallets AUTO_INCREMENT = ${desiredAutoIncrement}`);
    }

    // Eliminar constraints antiguos que referencian grossWeight/netWeight antes de renombrar columnas
    const legacyChecks = await db.query(
      `SELECT tc.CONSTRAINT_NAME
       FROM information_schema.TABLE_CONSTRAINTS tc
       INNER JOIN information_schema.CHECK_CONSTRAINTS cc
         ON tc.CONSTRAINT_SCHEMA = cc.CONSTRAINT_SCHEMA
        AND tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
       WHERE tc.TABLE_SCHEMA = DATABASE()
         AND tc.TABLE_NAME = 'pallets'
         AND tc.CONSTRAINT_TYPE = 'CHECK'
         AND (cc.CHECK_CLAUSE LIKE '%grossWeight%' OR cc.CHECK_CLAUSE LIKE '%netWeight%')`
    );

    for (const row of (legacyChecks as Array<{ CONSTRAINT_NAME: string }>)) {
      console.log(`[updatePalletsTable] Eliminando constraint heredado ${row.CONSTRAINT_NAME}`);
      await db.query(`ALTER TABLE pallets DROP CHECK ${row.CONSTRAINT_NAME}`);
    }

    // Ajustar columnas de peso si aún existen con los nombres antiguos
    const columns = await db.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pallets'
       AND COLUMN_NAME IN ('grossWeight', 'netWeight', 'weight', 'dispatchWeight')`
    );

    const columnNames = new Set((columns as Array<{ COLUMN_NAME: string }>).map((col) => col.COLUMN_NAME));
    const hasGrossWeight = columnNames.has('grossWeight');
    const hasNetWeight = columnNames.has('netWeight');
    const hasWeight = columnNames.has('weight');
    const hasDispatchWeight = columnNames.has('dispatchWeight');

    if (hasGrossWeight && !hasWeight) {
      console.log('[updatePalletsTable] Renombrando columna grossWeight -> weight');
      await db.query("ALTER TABLE pallets CHANGE COLUMN grossWeight weight DECIMAL(10,3) NOT NULL DEFAULT 0");
    }

    if (hasNetWeight && !hasDispatchWeight) {
      console.log('[updatePalletsTable] Renombrando columna netWeight -> dispatchWeight');
      await db.query("ALTER TABLE pallets CHANGE COLUMN netWeight dispatchWeight DECIMAL(10,3) NOT NULL DEFAULT 0");
    }

    // Actualizar constraints para nuevas columnas
    const dropChecks = [
      'chk_pallets_gross_weight',
      'chk_pallets_net_weight',
      'chk_pallets_weights',
      'chk_trays_quantity',
      'chk_pallets_trays_quantity',
      'chk_trays_vs_capacity',
      'chk_pallets_trays_vs_capacity',
      'chk_pallets_capacity',
    ];

    const existingChecks = await db.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pallets' AND CONSTRAINT_TYPE = 'CHECK'
         AND CONSTRAINT_NAME IN (${dropChecks.map(() => '?').join(', ')})`,
      dropChecks,
    );

    for (const row of (existingChecks as Array<{ CONSTRAINT_NAME: string }>)) {
      const checkName = row.CONSTRAINT_NAME;
      console.log(`[updatePalletsTable] Eliminando constraint ${checkName}`);
      await db.query(`ALTER TABLE pallets DROP CHECK ${checkName}`);
    }

    const metadataColumn = await db.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pallets' AND COLUMN_NAME = 'metadata'`
    ) as Array<{ COLUMN_NAME: string }>;

    if (!metadataColumn.length) {
      console.log('[updatePalletsTable] Agregando columna metadata (JSON)');
      await db.query("ALTER TABLE pallets ADD COLUMN metadata JSON NULL AFTER dispatchWeight");
    }

    const newChecks = [
      { name: 'chk_pallets_trays_quantity', expression: 'CHECK (traysQuantity >= 0)' },
      { name: 'chk_pallets_capacity', expression: 'CHECK (capacity > 0)' },
      { name: 'chk_pallets_trays_vs_capacity', expression: 'CHECK (traysQuantity <= capacity)' },
      { name: 'chk_pallets_weight_initial', expression: 'CHECK (weight >= 0)' },
      { name: 'chk_pallets_weight_dispatch', expression: 'CHECK (dispatchWeight >= 0)' },
      { name: 'chk_pallets_dispatch_vs_weight', expression: 'CHECK (dispatchWeight <= weight)' },
    ];

    const existingNewChecks = await db.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pallets' AND CONSTRAINT_TYPE = 'CHECK'
         AND CONSTRAINT_NAME IN (${newChecks.map(() => '?').join(', ')})`,
      newChecks.map((check) => check.name),
    );

    const existingNewCheckNames = new Set(
      (existingNewChecks as Array<{ CONSTRAINT_NAME: string }>).map((row) => row.CONSTRAINT_NAME)
    );

    for (const check of newChecks) {
      if (!existingNewCheckNames.has(check.name)) {
        console.log(`[updatePalletsTable] Creando constraint ${check.name}`);
        await db.query(`ALTER TABLE pallets ADD CONSTRAINT ${check.name} ${check.expression}`);
      }
    }

    // Ampliar enum temporalmente para permitir la migración de valores entre español e inglés
    await db.query("ALTER TABLE pallets MODIFY COLUMN status ENUM('AVAILABLE','CLOSED','FULL','DISPATCHED','RESERVED','DAMAGED','Disponible','Cerrado','Completo') NOT NULL DEFAULT 'AVAILABLE'");

    // Normalizar estados históricos a la nueva enumeración en inglés
    await db.query("UPDATE pallets SET status = 'AVAILABLE' WHERE status IN ('AVAILABLE','OPEN','Disponible','disponible','DISPONIBLE')");
    await db.query("UPDATE pallets SET status = 'CLOSED' WHERE status IN ('RESERVED','CLOSE','Cerrado','cerrado','CERRADO')");
    await db.query("UPDATE pallets SET status = 'FULL' WHERE status IN ('DAMAGED','FULLY','Completo','cmpleto','completo','COMPLETO')");
    await db.query("UPDATE pallets SET status = 'DISPATCHED' WHERE status IN ('DISPATCH','Despachado','DISPATCHED','despachado','DESPACHADO')");

    // Ajustar enumeración a los nuevos valores admitidos
    await db.query("ALTER TABLE pallets MODIFY COLUMN status ENUM('AVAILABLE','CLOSED','FULL','DISPATCHED') NOT NULL DEFAULT 'AVAILABLE'");

    console.log('[updatePalletsTable] Migration completed successfully');
  } catch (error) {
    console.error('[updatePalletsTable] Migration failed:', error);
    throw error;
  }
}

// Execute migration if this file is run directly
if (require.main === module) {
  updatePalletsTable()
    .then(() => {
      console.log('[updatePalletsTable] Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[updatePalletsTable] Migration script failed:', error);
      process.exit(1);
    });
}