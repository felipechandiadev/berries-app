import type { DispatchPalletForm } from './types';

export const currencyFormatterCLP = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

export const weightFormatter = new Intl.NumberFormat('es-CL', {
  style: 'decimal',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}

export function createEmptyPallet(): DispatchPalletForm {
  return {
    id: generateId(),
    trayId: null,
    trayLabel: null,
    trayWeight: null,
    trayCount: 0,
    palletWeight: 0,
    grossWeight: 0,
    netWeight: 0,
  };
}

export function computeNetWeight(pallet: DispatchPalletForm): number {
  const trayWeight = pallet.trayWeight ?? 0;
  const gross = pallet.grossWeight ?? 0;
  const palletWeight = pallet.palletWeight ?? 0;
  const trayMass = trayWeight * (pallet.trayCount ?? 0);
  const net = gross - palletWeight - trayMass;
  return Number(Math.max(net, 0).toFixed(2));
}

export function formatTrayStepperLabel(trayLabel: string | null, trayWeight: number | null, trayCount: number): string {
  if (!trayLabel || !trayWeight || trayCount <= 0) {
    return 'Cantidad';
  }
  const totalTrayMass = trayWeight * trayCount;
  return `${totalTrayMass.toFixed(2)} kg en bandejas`;
}
