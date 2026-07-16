import type { Option as SelectOption } from '@/app/baseComponents/Select/Select';

export interface ClientOption extends SelectOption {
  rut?: string | null;
}

export interface VarietyOption extends SelectOption {
}

export interface TrayOption extends SelectOption {
  weight?: number;
}

export interface FormatOption extends SelectOption {
  priceCLP?: number;
  priceUSD?: number;
}

// Pallet existente disponible para despacho (readonly info)
export interface AvailablePallet {
  id: number;
  storageName: string | null;
  trayId: string | null;
  trayName: string | null;
  trayWeight: number;
  traysQuantity: number;
  capacity: number;
  status: string;
  weight: number;
  varietyName: string | null;
  formatName: string | null;
  estimatedNetWeight: number;
}

// Pallet seleccionado para despacho (con peso bruto ingresado)
export interface SelectedPalletForDispatch {
  pallet: AvailablePallet;
  grossWeight: number;
  palletWeight: number;
  netWeight: number;
}

// Legacy: mantener para compatibilidad
export interface DispatchPalletForm {
  id: string;
  trayId: string | null;
  trayLabel: string | null;
  trayWeight: number | null;
  trayCount: number;
  palletWeight: number;
  grossWeight: number;
  netWeight: number;
}

export interface DispatchFormTotals {
  totalPallets: number;
  totalTrays: number;
  totalNetWeight: number;
  totalAmount: number;
}
