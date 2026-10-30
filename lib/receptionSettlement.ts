export type ReceptionSettlementStatus = 'NONE' | 'BORRADOR' | 'COMPLETA';

export type SettlementStatus = 'BORRADOR' | 'COMPLETA';

export function normalizeReceptionSettlementStatus(
  value: unknown,
): ReceptionSettlementStatus {
  if (value === 'BORRADOR' || value === 'COMPLETA') return value;
  return 'NONE';
}

export function receptionSettlementStatusLabel(
  status: ReceptionSettlementStatus | unknown,
): string {
  switch (normalizeReceptionSettlementStatus(status)) {
    case 'COMPLETA':
      return 'Liquidada';
    case 'BORRADOR':
      return 'Liq. borrador';
    default:
      return 'Sin liquidar';
  }
}

/** True when the reception is linked to any settlement (draft or complete). */
export function isReceptionLinkedToSettlement(
  status: ReceptionSettlementStatus | unknown,
): boolean {
  const normalized = normalizeReceptionSettlementStatus(status);
  return normalized === 'BORRADOR' || normalized === 'COMPLETA';
}

/**
 * Estado de una liquidación a partir de su metadata. Soporta liquidaciones
 * antiguas que solo guardaban `isDraft`.
 */
export function resolveSettlementStatus(
  metadata: { status?: unknown; isDraft?: unknown } | null | undefined,
): SettlementStatus {
  if (metadata?.status === 'BORRADOR' || metadata?.status === 'COMPLETA') {
    return metadata.status;
  }
  return metadata?.isDraft ? 'BORRADOR' : 'COMPLETA';
}
