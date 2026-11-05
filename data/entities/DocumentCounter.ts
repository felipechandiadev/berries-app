import { Entity, PrimaryColumn, Column } from 'typeorm';

/**
 * Contador correlativo por tipo de documento (ej. ADVANCE, SETTLEMENT).
 * Se incrementa dentro de la misma transacción que crea el documento (ver lib/folio.ts).
 */
@Entity('document_counters')
export class DocumentCounter {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  documentType!: string;

  @Column({ type: 'int', default: 0 })
  lastFolio!: number;
}
