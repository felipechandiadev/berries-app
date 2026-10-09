import { EscPosEncoder } from './escpos';
import { getPrintLogoRaster } from './logo';
import { resolveReceptionTicketDate } from './receptionTicket';

export type TrayDeliveryCounterpartyType = 'producer' | 'client';

export interface TrayDeliveryTicketSnapshot {
  transactionId: string;
  createdAt?: string | null;
  trayName: string;
  quantity: number;
  counterpartyType: TrayDeliveryCounterpartyType;
  counterpartyName: string;
  /** Label completo productor "Nombre - RUT" si aplica (para RUT en ticket). */
  counterpartyLabel?: string | null;
  productiveUnitName?: string | null;
  reason?: string | null;
  performedByName?: string | null;
  seasonName?: string | null;
  stockBefore?: number | null;
  stockAfter?: number | null;
  showLogo?: boolean;
}

const formatNumber = (value: number, decimals = 0) =>
  new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value ?? 0);

export function formatTrayTicketDateParts(
  createdAt?: string | null,
  fallback: Date = new Date()
): { date: string; time: string; dateTime: string; ticketDate: Date } {
  const ticketDate = resolveReceptionTicketDate(createdAt, fallback);
  const date = new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(ticketDate);
  const time = new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(ticketDate);
  return {
    date,
    time,
    dateTime: `${date} ${time}`,
    ticketDate,
  };
}

export function trayDeliveryMovementLabel(
  counterpartyType: TrayDeliveryCounterpartyType
): string {
  return counterpartyType === 'client'
    ? 'Entrega a cliente'
    : 'Entrega a productor';
}

function splitNameDni(label?: string | null): { name: string; dni: string } {
  if (!label) return { name: '—', dni: '—' };
  const parts = label.split(' - ');
  return { name: parts[0] || '—', dni: parts[1] || '—' };
}

async function appendTicketLogo(enc: EscPosEncoder): Promise<void> {
  try {
    const logo = await getPrintLogoRaster();
    enc.align('center');
    enc.raster(logo.widthBytes, logo.height, logo.data);
    enc.feed(1);
  } catch {
    // Logo opcional: el título ZENIZ ya se imprime debajo
  }
}

export function destinationLines(snapshot: TrayDeliveryTicketSnapshot): {
  destinationLabel: string;
  destinationName: string;
  dni: string | null;
  deliveredTo: string | null;
  counterpartyTypeLabel: string;
} {
  const person = splitNameDni(snapshot.counterpartyLabel || snapshot.counterpartyName);
  const unit = String(snapshot.productiveUnitName ?? '').trim();
  const counterpartyTypeLabel =
    snapshot.counterpartyType === 'client' ? 'Cliente' : 'Productor';

  if (snapshot.counterpartyType === 'producer' && unit) {
    return {
      destinationLabel: 'Unidad productiva',
      destinationName: unit,
      dni: person.dni !== '—' ? person.dni : null,
      deliveredTo: person.name !== '—' ? person.name : snapshot.counterpartyName || null,
      counterpartyTypeLabel,
    };
  }

  return {
    destinationLabel: counterpartyTypeLabel,
    destinationName: person.name !== '—' ? person.name : snapshot.counterpartyName || '—',
    dni: person.dni !== '—' ? person.dni : null,
    deliveredTo: null,
    counterpartyTypeLabel,
  };
}

/**
 * Builds ESC/POS bytes for a tray delivery ticket (80mm).
 */
export async function buildTrayDeliveryTicketEscPos(
  snapshot: TrayDeliveryTicketSnapshot,
  printedAt: Date = new Date()
): Promise<Uint8Array> {
  const { date, time } = formatTrayTicketDateParts(snapshot.createdAt, printedAt);
  const printed = formatTrayTicketDateParts(printedAt.toISOString(), printedAt);
  const dest = destinationLines(snapshot);
  const showLogo = snapshot.showLogo !== false;
  const movementLabel = trayDeliveryMovementLabel(snapshot.counterpartyType);

  const enc = new EscPosEncoder(42);
  enc.init();
  enc.align('center');
  enc.bold(true).line('COMPROBANTE DE ENTREGA').bold(false);
  enc.line('Entrega de bandejas');
  if (showLogo) {
    await appendTicketLogo(enc);
  }
  enc.align('center');
  enc.bold(true).line('ZENIZ').bold(false);
  enc.align('left');
  enc.separator();

  enc.bold(true).line('IDENTIFICACION').bold(false);
  enc.line(`Folio: #${snapshot.transactionId || '—'}`);
  enc.line(`Tipo: ${movementLabel}`);
  enc.line(`Fecha: ${date}`);
  enc.line(`Hora: ${time}`);
  if (snapshot.seasonName) {
    enc.line(`Temporada: ${snapshot.seasonName}`);
  }
  enc.separator();

  enc.bold(true).line('DESTINO').bold(false);
  enc.line(`Tipo destinatario: ${dest.counterpartyTypeLabel}`);
  enc.line(`${dest.destinationLabel}: ${dest.destinationName}`);
  if (dest.dni) {
    enc.line(`RUT: ${dest.dni}`);
  }
  if (dest.deliveredTo) {
    enc.line(`Entregada a: ${dest.deliveredTo}`);
  }
  enc.separator();

  enc.bold(true).line('DETALLE').bold(false);
  enc.line(`Bandeja: ${snapshot.trayName || '—'}`);
  enc.line(`Cantidad: ${formatNumber(snapshot.quantity, 0)} bandejas`);
  if (snapshot.stockBefore != null && Number.isFinite(Number(snapshot.stockBefore))) {
    enc.line(`Stock anterior: ${formatNumber(Number(snapshot.stockBefore), 0)}`);
  }
  if (snapshot.stockAfter != null && Number.isFinite(Number(snapshot.stockAfter))) {
    enc.line(`Stock nuevo: ${formatNumber(Number(snapshot.stockAfter), 0)}`);
  }
  if (snapshot.reason) {
    enc.line(`Motivo: ${snapshot.reason}`);
  }
  enc.separator();

  enc.bold(true).line('REGISTRO').bold(false);
  if (snapshot.performedByName) {
    enc.line(`Registrado por: ${snapshot.performedByName}`);
  }
  enc.line(`Impreso: ${printed.date} ${printed.time}`);
  enc.separator();

  enc.align('center');
  enc.line('Comprobante de entrega de bandejas');
  enc.line('Conserve este documento');
  enc.feed(3);
  enc.cut();

  return enc.encode();
}

/** Map createTrayDelivery / detailed transaction into a print snapshot. */
export function buildTrayDeliverySnapshotFromParts(parts: {
  transactionId: string;
  createdAt?: string | Date | null;
  trayName: string;
  quantity: number;
  counterpartyType: TrayDeliveryCounterpartyType;
  counterpartyName: string;
  counterpartyLabel?: string | null;
  productiveUnitName?: string | null;
  reason?: string | null;
  performedByName?: string | null;
  seasonName?: string | null;
  stockBefore?: number | null;
  stockAfter?: number | null;
  showLogo?: boolean;
}): TrayDeliveryTicketSnapshot {
  const createdAt =
    parts.createdAt instanceof Date
      ? parts.createdAt.toISOString()
      : parts.createdAt
        ? String(parts.createdAt)
        : null;

  return {
    transactionId: String(parts.transactionId),
    createdAt,
    trayName: parts.trayName,
    quantity: Number(parts.quantity) || 0,
    counterpartyType: parts.counterpartyType,
    counterpartyName: parts.counterpartyName || '—',
    counterpartyLabel: parts.counterpartyLabel ?? null,
    productiveUnitName: parts.productiveUnitName ?? null,
    reason: parts.reason ?? null,
    performedByName: parts.performedByName ?? null,
    seasonName: parts.seasonName ?? null,
    stockBefore:
      parts.stockBefore != null && Number.isFinite(Number(parts.stockBefore))
        ? Number(parts.stockBefore)
        : null,
    stockAfter:
      parts.stockAfter != null && Number.isFinite(Number(parts.stockAfter))
        ? Number(parts.stockAfter)
        : null,
    showLogo: parts.showLogo !== false,
  };
}
