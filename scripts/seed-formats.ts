/**
 * Script para poblar la tabla formats con datos de ejemplo
 *
 * Uso: npx ts-node scripts/seed-formats.ts
 */

import { createFormat } from '../app/actions/formats';
import { getVarieties, createVariety } from '../app/actions/varieties';

async function seedFormats() {
  try {
    console.log('🌱 Poblando tabla formats con datos de ejemplo...');

    const formatsData = [
      { name: 'IQF', description: 'Congelado individual rápido', varietyName: 'Arandano' },
      { name: 'BLOCK', description: 'Producto congelado en bloque', varietyName: 'Frambuesa' },
      { name: 'JUGO', description: 'Producto destinado a jugo o pulpa', varietyName: null },
      { name: 'FRESCO', description: 'Producto fresco sin congelar', varietyName: null },
      { name: 'PURE', description: 'Pulpa o puré de fruta', varietyName: null },
    ];

    for (const formatData of formatsData) {
      try {
        // Ensure variety exists and get its id
        let varietyId: number | undefined | null = undefined;
        if ((formatData as any).varietyName) {
          const vRes = await getVarieties({ name: (formatData as any).varietyName });
          if (vRes.success && Array.isArray(vRes.data) && vRes.data.length > 0) {
            varietyId = (vRes.data as any)[0].id;
          } else {
            const created = await createVariety({ name: (formatData as any).varietyName });
            if (created.success && created.data) {
              varietyId = (created.data as any).id;
            }
          }
        }

        const input = { name: formatData.name, description: formatData.description, varietyId };
        const result = await createFormat(input as any);
        if (result.success) {
          console.log(`✅ Formato '${formatData.name}' creado exitosamente`);
        } else {
          console.log(`⚠️  Error al crear formato '${formatData.name}': ${result.error}`);
        }
      } catch (error) {
        console.log(`❌ Error al crear formato '${formatData.name}':`, error);
      }
    }

    console.log('🎉 Poblado de formatos completado!');

  } catch (error) {
    console.error('❌ Error en el poblado de formatos:', error);
    process.exit(1);
  }
}

seedFormats();