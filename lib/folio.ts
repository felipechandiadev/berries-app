import type { EntityManager } from 'typeorm';
import { DocumentCounter } from '@/data/entities/DocumentCounter';
import { TransactionType } from '@/data/entities/Transaction';

export type FolioDocumentType = TransactionType.ADVANCE | TransactionType.SETTLEMENT | TransactionType.RECEPTION;

/**
 * Asigna el siguiente folio correlativo para un tipo de documento.
 * Debe llamarse dentro de la misma transacción que inserta el documento:
 * el bloqueo FOR UPDATE evita folios duplicados en creaciones concurrentes,
 * y si la transacción hace rollback el contador también vuelve atrás.
 */
export async function nextFolio(manager: EntityManager, documentType: FolioDocumentType): Promise<number> {
  const repo = manager.getRepository(DocumentCounter);

  await manager.query(
    'INSERT IGNORE INTO `document_counters` (`documentType`, `lastFolio`) VALUES (?, 0)',
    [documentType],
  );

  const counter = await repo.findOne({
    where: { documentType },
    lock: { mode: 'pessimistic_write' },
  });

  if (!counter) {
    throw new Error(`No se pudo obtener el contador de folios para ${documentType}.`);
  }

  counter.lastFolio = Number(counter.lastFolio) + 1;
  await repo.save(counter);
  return counter.lastFolio;
}
