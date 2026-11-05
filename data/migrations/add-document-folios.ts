import { getDb } from '../db';

/**
 * Agrega folios correlativos por tipo de documento (ADVANCE, SETTLEMENT, RECEPTION).
 *
 * - Crea la tabla document_counters.
 * - Agrega transactions.folio (INT NULL) con índice único (type, folio).
 * - Numera los registros sin folio, en orden de creación, a continuación del
 *   máximo folio existente de cada tipo. Así es seguro volver a ejecutarla.
 * - Deja el contador de cada tipo en el último folio asignado.
 *
 * Recomendado: ejecutar con la aplicación detenida para que nadie cree
 * documentos mientras se numeran.
 */
export const FOLIO_DOCUMENT_TYPES = ['ADVANCE', 'SETTLEMENT', 'RECEPTION'] as const;

export async function addDocumentFolios() {
  const db = await getDb();

  console.log('[addDocumentFolios] Starting migration...');

  await db.query(`
    CREATE TABLE IF NOT EXISTS \`document_counters\` (
      \`documentType\` VARCHAR(32) NOT NULL PRIMARY KEY,
      \`lastFolio\` INT NOT NULL DEFAULT 0
    )
  `);

  const columns: Array<{ COLUMN_NAME: string }> = await db.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'folio'`,
  );
  if (columns.length === 0) {
    await db.query('ALTER TABLE `transactions` ADD COLUMN `folio` INT NULL');
    console.log('[addDocumentFolios] Column transactions.folio created');
  }

  for (const type of FOLIO_DOCUMENT_TYPES) {
    const [{ maxFolio }]: Array<{ maxFolio: number | string | null }> = await db.query(
      'SELECT COALESCE(MAX(`folio`), 0) AS maxFolio FROM `transactions` WHERE `type` = ?',
      [type],
    );

    const pending: Array<{ id: string | number }> = await db.query(
      'SELECT `id` FROM `transactions` WHERE `type` = ? AND `folio` IS NULL ORDER BY `createdAt` ASC, `id` ASC',
      [type],
    );

    let folio = Number(maxFolio ?? 0);
    for (const row of pending) {
      folio += 1;
      await db.query('UPDATE `transactions` SET `folio` = ? WHERE `id` = ? AND `folio` IS NULL', [folio, row.id]);
    }

    await db.query(
      `INSERT INTO \`document_counters\` (\`documentType\`, \`lastFolio\`) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE \`lastFolio\` = GREATEST(\`lastFolio\`, VALUES(\`lastFolio\`))`,
      [type, folio],
    );
    console.log(`[addDocumentFolios] ${type}: ${pending.length} folios asignados (último: ${folio})`);
  }

  const indexes: Array<{ INDEX_NAME: string }> = await db.query(
    `SELECT INDEX_NAME FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND INDEX_NAME = 'UQ_transactions_type_folio'`,
  );
  if (indexes.length === 0) {
    await db.query('CREATE UNIQUE INDEX `UQ_transactions_type_folio` ON `transactions` (`type`, `folio`)');
    console.log('[addDocumentFolios] Unique index created');
  }

  console.log('[addDocumentFolios] ✓ Migration completed');
}

if (require.main === module) {
  addDocumentFolios()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('[addDocumentFolios] Migration failed:', error);
      process.exit(1);
    });
}
