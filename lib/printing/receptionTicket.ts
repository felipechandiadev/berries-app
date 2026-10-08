import { EscPosEncoder } from './escpos';
import { getPrintLogoRaster } from './logo';
import {
  aggregatePalletLines,
  getDefaultReceptionPrintOptions,
  type ReceptionPrintOptions,
} from './printOptions';

export interface TicketProducer {
  label?: string | null;
  productiveUnitId?: string | null;
  productiveUnitName?: string | null;
}

export interface TicketPalletAssignment {
  palletId?: number;
  traysAssigned?: number;
  grossWeightKg?: number;
}

export interface TicketPack {
  packNumber?: number;
  varietyName?: string | null;
  formatName?: string | null;
  trayLabel?: string | null;
  traysQuantity?: number;
  traysTotalWeight?: number;
  grossWeight?: number;
  netWeightBeforeImpurities?: number;
  netWeight?: number;
  impurityPercent?: number;
  price?: number;
  currency?: string | null;
  totalToPay?: number;
  palletAssignments?: TicketPalletAssignment[];
}

export interface TicketTrayDevolution {
  trayId?: string | null;
  trayLabel?: string | null;
  quantity?: number;
}

export interface TicketTotals {
  totalPacks?: number;
  totalTraysInPacks?: number;
  totalTraysDevolved?: number;
  totalGrossWeight?: number;
  totalNetWeight?: number;
  totalToPayUSD?: number;
  totalToPayCLP?: number;
  totalCLPToPay?: number;
}

export interface ReceptionTicketSnapshot {
  producer?: TicketProducer | null;
  guide?: string;
  driver?: string;
  packs?: TicketPack[];
  trayDevolutions?: TicketTrayDevolution[];
  totals?: TicketTotals;
  exchangeRate?: number;
  /** Fecha de registro de la recepción (ISO). Preferida sobre la hora de impresión. */
  createdAt?: string | null;
}

/** Prefer reception registration date; fall back to print moment. */
export function resolveReceptionTicketDate(
  createdAt?: string | null,
  fallback: Date = new Date()
): Date {
  if (createdAt) {
    const parsed = new Date(createdAt);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return fallback;
}

const formatNumber = (value: number, decimals = 2) =>
  new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value ?? 0);

const formatCurrency = (value: number, currency: string | null | undefined) => {
  const code = String(currency ?? 'CLP').toUpperCase();
  if (!value) {
    return code === 'CLP' ? '$0' : 'US$0.00';
  }
  if (code === 'USD') {
    return new Intl.NumberFormat('es-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

function splitProducer(label?: string | null): { name: string; dni: string } {
  if (!label) return { name: '—', dni: '—' };
  const parts = label.split(' - ');
  return { name: parts[0] || '—', dni: parts[1] || '—' };
}

/**
 * Cabecera de ticket cuando el productor pertenece a una unidad productiva:
 * - Productor = unidad
 * - Entregada por = productor [, driver]
 */
export function resolveTicketHeaderParties(data: {
  producer?: TicketProducer | null;
  driver?: string | null;
}): {
  displayProducerName: string;
  displayProducerDni: string;
  deliveredBy: string | null;
  hasProductiveUnit: boolean;
} {
  const person = splitProducer(data.producer?.label);
  const unitName = String(data.producer?.productiveUnitName ?? '').trim();
  const driver = String(data.driver ?? '').trim();

  if (unitName) {
    const deliveredBy = driver ? `${person.name} · ${driver}` : person.name;
    return {
      displayProducerName: unitName,
      displayProducerDni: person.dni,
      deliveredBy: deliveredBy && deliveredBy !== '—' ? deliveredBy : null,
      hasProductiveUnit: true,
    };
  }

  return {
    displayProducerName: person.name,
    displayProducerDni: person.dni,
    deliveredBy: driver || null,
    hasProductiveUnit: false,
  };
}

function packMetadata(packs: TicketPack[]) {
  const varieties = new Set<string>();
  const formats = new Set<string>();
  const trayTypes = new Set<string>();
  let traysWeightKg = 0;
  let totalImpurities = 0;

  packs.forEach((pack) => {
    if (pack.varietyName) varieties.add(pack.varietyName);
    if (pack.formatName) formats.add(pack.formatName);
    if (pack.trayLabel) trayTypes.add(pack.trayLabel);
    traysWeightKg += pack.traysTotalWeight ?? 0;
    const netBefore = pack.netWeightBeforeImpurities ?? 0;
    const net = pack.netWeight ?? 0;
    totalImpurities += Math.max(netBefore - net, 0);
  });

  return {
    varieties: Array.from(varieties),
    formats: Array.from(formats),
    trayTypes: Array.from(trayTypes),
    traysWeightKg,
    totalImpurities,
  };
}

function currencyBreakdown(packs: TicketPack[], totals?: TicketTotals, exchangeRateRaw = 0) {
  const clpFromTotals = Math.max(0, totals?.totalToPayCLP ?? 0);
  const usdFromTotals = Math.max(0, totals?.totalToPayUSD ?? 0);
  const exchangeRate =
    exchangeRateRaw && Number.isFinite(exchangeRateRaw) ? Math.max(0, exchangeRateRaw) : 0;

  const clpFromPacks = packs.reduce((sum, pack) => {
    const total = Number(pack.totalToPay ?? 0);
    const normalized = Number.isFinite(total) ? Math.max(0, total) : 0;
    return String(pack.currency ?? 'CLP').toUpperCase() === 'USD' ? sum : sum + normalized;
  }, 0);

  const usdFromPacks = packs.reduce((sum, pack) => {
    const total = Number(pack.totalToPay ?? 0);
    const normalized = Number.isFinite(total) ? Math.max(0, total) : 0;
    return String(pack.currency ?? 'CLP').toUpperCase() === 'USD' ? sum + normalized : sum;
  }, 0);

  const clp = clpFromTotals > 0 ? clpFromTotals : clpFromPacks;
  const usd = usdFromTotals > 0 ? usdFromTotals : usdFromPacks;
  return { clp, usd, exchangeRate };
}

async function appendTicketLogo(enc: EscPosEncoder): Promise<void> {
  try {
    const logo = await getPrintLogoRaster();
    enc.align('center');
    enc.raster(logo.widthBytes, logo.height, logo.data);
    enc.feed(1);
  } catch {
    // Fallback text brand if logo fails to load (offline / missing asset).
    enc.align('center');
    enc.bold(true).size(2, 2).line('ZENIZ').size(1, 1).bold(false);
  }
}

function appendPalletsSection(enc: EscPosEncoder, packs: TicketPack[]): void {
  const lines = aggregatePalletLines(packs);
  if (lines.length === 0) {
    enc.separator();
    enc.bold(true).line('PALLETS').bold(false);
    enc.line('Sin asignacion a pallets');
    return;
  }
  enc.separator();
  enc.bold(true).line('PALLETS').bold(false);
  lines.forEach((line) => {
    const packsLabel =
      line.packNumbers.length > 0 ? ` (pack ${line.packNumbers.join(',')})` : '';
    const kgLabel =
      line.grossWeightKg > 0 ? ` · ${formatNumber(line.grossWeightKg, 2)} kg` : '';
    enc.line(
      `Pallet #${line.palletId}: ${formatNumber(line.traysAssigned, 0)} ban.${kgLabel}${packsLabel}`
    );
  });
}

/**
 * Builds ESC/POS bytes for a simple reception ticket (80mm).
 */
export async function buildReceptionTicketEscPos(
  snapshot: ReceptionTicketSnapshot | null | undefined,
  receptionTransactionId?: string | null,
  printedAt: Date = new Date(),
  options: ReceptionPrintOptions = getDefaultReceptionPrintOptions()
): Promise<Uint8Array> {
  const data = snapshot ?? {};
  const packs = Array.isArray(data.packs) ? data.packs : [];
  const trayDevolutions = Array.isArray(data.trayDevolutions) ? data.trayDevolutions : [];
  const totals = data.totals ?? {};
  const parties = resolveTicketHeaderParties(data);
  const meta = packMetadata(packs);
  const money = currencyBreakdown(packs, totals, data.exchangeRate ?? 0);
  const totalTraysReturned = trayDevolutions.reduce((s, i) => s + (i.quantity ?? 0), 0);

  const ticketDate = resolveReceptionTicketDate(data.createdAt, printedAt);
  const date = new Intl.DateTimeFormat('es-CL', { dateStyle: 'short' }).format(ticketDate);
  const time = new Intl.DateTimeFormat('es-CL', {
    timeStyle: 'short',
    hour12: false,
  }).format(ticketDate);

  const enc = new EscPosEncoder(42);
  enc.init();
  if (options.showLogo) {
    await appendTicketLogo(enc);
  }
  enc.align('center');
  enc.line('Comprobante recepcion');
  enc.align('left');
  enc.separator();
  enc.line(`Recepcion: #${receptionTransactionId ?? '—'}`);
  enc.line(`Fecha: ${date}`);
  enc.line(`Hora: ${time}`);
  enc.line(`Productor: ${parties.displayProducerName}`);
  enc.line(`RUT: ${parties.displayProducerDni}`);
  if (options.showGuideDriver && data.guide) {
    enc.line(`Guia: ${data.guide}`);
  }
  if (parties.hasProductiveUnit && parties.deliveredBy) {
    enc.line(`Entregada por: ${parties.deliveredBy}`);
  } else if (options.showGuideDriver && parties.deliveredBy) {
    enc.line(`Entregada por: ${parties.deliveredBy}`);
  }
  enc.separator();
  enc.bold(true).line('RESUMEN').bold(false);
  enc.line(`Variedad: ${meta.varieties.length ? meta.varieties.join(', ') : '—'}`);
  enc.line(`Tipo bandeja: ${meta.trayTypes.length ? meta.trayTypes.join(', ') : '—'}`);
  enc.line(`Total bandejas: ${formatNumber(totals.totalTraysInPacks ?? 0, 0)}`);
  enc.line(`Kg bandejas: ${formatNumber(meta.traysWeightKg, 2)} kg`);
  enc.line(`kg bruto: ${formatNumber(totals.totalGrossWeight ?? 0, 2)} kg`);
  enc.line(`kg neto: ${formatNumber(totals.totalNetWeight ?? 0, 2)} kg`);
  if (meta.totalImpurities > 0) {
    enc.line(`Kg impurezas: ${formatNumber(meta.totalImpurities, 2)} kg`);
  }
  if (options.showPrices) {
    enc.line(`Total CLP: ${formatCurrency(money.clp, 'CLP')}`);
    enc.line(`Total USD: ${formatCurrency(money.usd, 'USD')}`);
  }
  if (options.showTrayDevolutions && totalTraysReturned > 0) {
    enc.line(`Bandejas devueltas: ${formatNumber(totalTraysReturned, 0)}`);
  }

  if (options.showPackDetails && packs.length > 0) {
    enc.separator();
    enc.bold(true).line(`PACKS (${packs.length})`).bold(false);
    packs.forEach((pack, index) => {
      enc.line(`Pack #${pack.packNumber || index + 1}`);
      enc.line(`  Variedad: ${pack.varietyName || '—'}`);
      enc.line(`  Bandeja: ${pack.trayLabel || '—'}`);
      enc.line(`  Cant: ${pack.traysQuantity || 0} uds`);
      enc.line(`  P.Neto: ${formatNumber(pack.netWeight ?? 0)} kg`);
      if (options.showPrices) {
        enc.line(`  Total: ${formatCurrency(pack.totalToPay ?? 0, pack.currency)}`);
      }
    });
  }

  if (options.showPallets) {
    appendPalletsSection(enc, packs);
  }

  if (options.showTrayDevolutions && trayDevolutions.length > 0) {
    enc.separator();
    enc.bold(true).line('DEVOLUCION BANDEJAS').bold(false);
    trayDevolutions.forEach((item) => {
      enc.line(
        `${item.trayLabel ?? item.trayId ?? 'Bandeja'}: ${formatNumber(item.quantity ?? 0, 0)}`
      );
    });
  }

  enc.separator();
  enc.line('Gracias por su entrega.');
  enc.line('Conserve este comprobante.');
  enc.cut();
  return enc.encode();
}

/**
 * Builds ESC/POS bytes for a multipack reception ticket (80mm).
 */
export async function buildMultipackReceptionTicketEscPos(
  snapshot: ReceptionTicketSnapshot | null | undefined,
  receptionTransactionId?: string | null,
  printedAt: Date = new Date(),
  options: ReceptionPrintOptions = getDefaultReceptionPrintOptions()
): Promise<Uint8Array> {
  const data = snapshot ?? {};
  const packs = Array.isArray(data.packs) ? data.packs : [];
  const trayDevolutions = Array.isArray(data.trayDevolutions) ? data.trayDevolutions : [];
  const parties = resolveTicketHeaderParties(data);
  const meta = packMetadata(packs);
  const totalTraysReturned = trayDevolutions.reduce((s, i) => s + (i.quantity ?? 0), 0);

  const clpTotal = packs
    .filter((p) => String(p.currency ?? 'CLP').toUpperCase() === 'CLP')
    .reduce((sum, p) => sum + (p.totalToPay ?? 0), 0);
  const usdTotal = packs
    .filter((p) => String(p.currency ?? 'CLP').toUpperCase() === 'USD')
    .reduce((sum, p) => sum + (p.totalToPay ?? 0), 0);

  const ticketDate = resolveReceptionTicketDate(data.createdAt, printedAt);
  const date = new Intl.DateTimeFormat('es-CL', { dateStyle: 'short' }).format(ticketDate);
  const time = new Intl.DateTimeFormat('es-CL', {
    timeStyle: 'short',
    hour12: false,
  }).format(ticketDate);

  const enc = new EscPosEncoder(42);
  enc.init();
  if (options.showLogo) {
    await appendTicketLogo(enc);
  }
  enc.align('center');
  enc.line('Recepcion multipack');
  enc.align('left');
  enc.separator();
  enc.line(`Folio: #${receptionTransactionId ?? '—'}`);
  enc.line(`Productor: ${parties.displayProducerName}`);
  enc.line(`RUT: ${parties.displayProducerDni}`);
  enc.line(`Fecha: ${date}`);
  enc.line(`Hora: ${time}`);
  if (options.showGuideDriver && data.guide) {
    enc.line(`Guia: ${data.guide}`);
  }
  if (parties.hasProductiveUnit && parties.deliveredBy) {
    enc.line(`Entregada por: ${parties.deliveredBy}`);
  } else if (options.showGuideDriver && parties.deliveredBy) {
    enc.line(`Entregada por: ${parties.deliveredBy}`);
  }
  enc.separator();
  enc.bold(true).line('RESUMEN').bold(false);
  enc.line(
    `Variedad: ${
      meta.varieties.length > 1
        ? `${meta.varieties.length} variedades`
        : meta.varieties[0] || '—'
    }`
  );
  enc.line(
    `Formato: ${
      meta.formats.length > 1 ? `${meta.formats.length} formatos` : meta.formats[0] || '—'
    }`
  );
  enc.line(
    `Tipo bandeja: ${
      meta.trayTypes.length > 1 ? `${meta.trayTypes.length} tipos` : meta.trayTypes[0] || '—'
    }`
  );
  enc.line(`Packs: ${packs.length}`);
  enc.line(
    `Bandejas: ${packs.reduce((sum, p) => sum + (p.traysQuantity ?? 0), 0)}`
  );
  enc.line(
    `Peso bruto: ${formatNumber(packs.reduce((s, p) => s + (p.grossWeight ?? 0), 0))} kg`
  );
  enc.line(`Peso bandejas: ${formatNumber(meta.traysWeightKg)} kg`);
  enc.line(
    `Peso neto: ${formatNumber(packs.reduce((s, p) => s + (p.netWeight ?? 0), 0))} kg`
  );
  if (meta.totalImpurities > 0) {
    enc.line(`Impurezas: ${formatNumber(meta.totalImpurities)} kg`);
  }
  if (options.showTrayDevolutions) {
    enc.line(`Bandejas devueltas: ${totalTraysReturned}`);
  }

  if (options.showPackDetails) {
    enc.separator();
    enc.bold(true).line(`PACKS (${packs.length})`).bold(false);
    packs.forEach((pack, index) => {
      enc.line(`Pack #${pack.packNumber || index + 1}`);
      enc.line(`  Variedad: ${pack.varietyName || '—'}`);
      enc.line(`  Formato: ${pack.formatName || '—'}`);
      enc.line(`  Bandeja: ${pack.trayLabel || '—'}`);
      enc.line(`  Cant: ${pack.traysQuantity || 0} uds`);
      enc.line(`  P.Bruto: ${formatNumber(pack.grossWeight ?? 0)} kg`);
      enc.line(`  P.Neto: ${formatNumber(pack.netWeight ?? 0)} kg`);
      if (options.showPrices) {
        enc.line(`  Precio: ${formatCurrency(pack.price ?? 0, pack.currency)}/kg`);
        enc.line(`  Total: ${formatCurrency(pack.totalToPay ?? 0, pack.currency)}`);
      }
    });
  }

  if (options.showPallets) {
    appendPalletsSection(enc, packs);
  }

  if (options.showTrayDevolutions && trayDevolutions.length > 0) {
    enc.separator();
    enc.bold(true).line(`BANDEJAS DEV (${totalTraysReturned})`).bold(false);
    trayDevolutions.forEach((item) => {
      enc.line(
        `${item.trayLabel || item.trayId || 'Bandeja'}: ${item.quantity || 0} uds`
      );
    });
  }

  if (options.showPrices) {
    enc.separator();
    enc.bold(true).line('TOTALES').bold(false);
    if (clpTotal > 0) enc.line(`Total CLP: ${formatCurrency(clpTotal, 'CLP')}`);
    if (usdTotal > 0) enc.line(`Total USD: ${formatCurrency(usdTotal, 'USD')}`);
    if ((data.exchangeRate ?? 0) > 0 && usdTotal > 0) {
      enc.line(`T.Cambio: ${formatNumber(data.exchangeRate ?? 0, 0)} CLP/USD`);
    }
  }

  enc.feed(1);
  enc.cut();
  return enc.encode();
}
