/**
 * Script para asignar `varietyId` a formatos existentes usando un mapeo configurable.
 * Uso:
 *  node -r ts-node/register scripts/migrate-format-variety.ts [mapping.json] [--apply]
 * Si no se pasa mapping.json usa el mapeo por defecto dentro del script.
 */

import { getDb } from '../data/db';
import { Format } from '../data/entities/Format';
import { Variety } from '../data/entities/Variety';

async function run() {
  const arg = process.argv[2];
  const apply = process.argv.includes('--apply');

  let mapping: Record<string, string> = {
    // default example mapping: format name -> variety name
    IQF: 'Arandano',
    BLOCK: 'Frambuesa',
  };

  if (arg && !arg.startsWith('--')) {
    try {
      // eslint-disable-next-line node/no-unsupported-features/es-builtins
      const fs = require('fs');
      const raw = fs.readFileSync(arg, 'utf8');
      mapping = JSON.parse(raw);
      console.log('Loaded mapping from', arg);
    } catch (err) {
      console.error('Error reading mapping file:', err);
      process.exit(1);
    }
  }

  const db = await getDb();
  const formatRepo = db.getRepository(Format);
  const varietyRepo = db.getRepository(Variety);

  const report: any[] = [];

  for (const [formatName, varietyName] of Object.entries(mapping)) {
    // find variety
    let variety = await varietyRepo.findOne({ where: { name: varietyName } });
    if (!variety) {
      console.log(`Variety '${varietyName}' not found. Creating...`);
      variety = varietyRepo.create({ name: varietyName });
      if (apply) {
        variety = await varietyRepo.save(variety);
        console.log(`Created variety id=${variety.id}`);
      } else {
        console.log(`Dry-run: would create variety '${varietyName}'`);
      }
    }

    // find formats matching name and without variety
    const formats = await formatRepo.find({ where: { name: Like(formatName), varietyId: IsNull() } } as any);

    if (!formats || formats.length === 0) {
      report.push({ formatName, varietyName, affected: 0 });
      console.log(`No formats found for '${formatName}' without variety`);
      continue;
    }

    for (const f of formats) {
      report.push({ formatId: f.id, formatName: f.name, varietyName, varietyId: variety ? variety.id : null });
      if (apply && variety) {
        await formatRepo.update({ id: f.id }, { varietyId: variety.id } as any);
        console.log(`Updated format id=${f.id} -> varietyId=${variety.id}`);
      } else {
        console.log(`Dry-run: would update format id=${f.id} -> variety='${varietyName}'`);
      }
    }
  }

  console.log('Migration report:', JSON.stringify(report, null, 2));
  process.exit(0);
}

// helpers from typeorm used dynamically
function Like(pattern: string) {
  // simple wrapper for TypeORM Like used in runtime queries via raw object
  // actual query building will accept the string directly when used with repository.find
  return pattern;
}

function IsNull() {
  return null;
}

run().catch((err) => {
  console.error('Error running migration script:', err);
  process.exit(1);
});
