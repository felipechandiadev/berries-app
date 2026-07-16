export type ReceptionRelationType =
  | 'RECEPTION_PACK'
  | 'TRAY_RECEPTION'
  | 'TRAY_DEVOLUTION'
  | 'PALLET_ASSIGNMENT'
  | 'TRAY_ADJUSTMENT'
  | 'PALLET_RELEASE'
  | 'RECEPTION_TO_SETTLEMENT';

export type ReceptionTransactionType =
  | 'TRAY_ADJUSTMENT'
  | 'TRAY_IN_FROM_PRODUCER'
  | 'TRAY_OUT_TO_PRODUCER'
  | 'TRAY_OUT_TO_CLIENT'
  | 'TRAY_IN_FROM_CLIENT'
  | 'RECEPTION'
  | 'PALLET_TRAY_ASSIGNMENT'
  | 'PALLET_TRAY_RELEASE'
  | 'SETTLEMENT';

export type ReceptionTransactionDirection = 'IN' | 'OUT';

export type ReceptionTransactionUnit = 'TRAY' | 'PALLET' | 'KG' | 'CLP' | 'USD';

export interface ReceptionDetailSummary {
  id: string;
  guideNumber?: string | null;
  producerName?: string | null;
  driver?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdById?: string;
  createdByName?: string;
  seasonId?: string | null;
  seasonName?: string | null;
  amount: number;
  unit: ReceptionTransactionUnit;
  exchangeRate?: number | null;
  totalCLPToPay?: number | null;
  payableUSD?: number | null;
  isSettled?: boolean;
}

export interface ReceptionDetailProducerInfo {
  id?: string;
  name?: string | null;
  dni?: string | null;
  phone?: string | null;
  mail?: string | null;
  personName?: string | null;
  personDni?: string | null;
}

export interface ReceptionDetailDocumentInfo {
  guideNumber?: string | null;
  varietyNames: string[];
  formatNames: string[];
  trayLabels: string[];
}

export interface ReceptionDetailTotals {
  packsCount: number;
  traysInPacks: number;
  trayReturns: number;
  grossWeightKg: number;
  netWeightKg: number;
  trayWeightKg: number;
  payableCLP: number;
  payableUSD: number;
  totalCLPToPay: number;
}

export interface ReceptionDetailPalletAssignment {
  palletId: number;
  traysAssigned: number;
}

export interface ReceptionDetailPack {
  packId: string;
  packNumber: number | null;
  varietyId?: number | null;
  varietyName?: string | null;
  formatId?: number | null;
  formatName?: string | null;
  trayLabel?: string | null;
  trayId?: string | null;
  traysQuantity: number;
  unitTrayWeightKg: number;
  traysTotalWeightKg: number;
  grossWeightKg: number;
  netWeightBeforeImpuritiesKg: number;
  netWeightKg: number;
  impurityPercent: number;
  pricePerKg: number;
  totalToPay: number;
  currency: string;
  palletAssignments: ReceptionDetailPalletAssignment[];
}

export interface ReceptionDetailTrayReturn {
  transactionId: string | null;
  trayId: string | null;
  trayLabel: string | null;
  quantityReturned: number;
}

export interface ReceptionDetailRelatedMovement {
  id: string;
  relationId: number;
  relationType: ReceptionRelationType;
  relationContext?: string | null;
  transactionType?: ReceptionTransactionType | null;
  direction?: ReceptionTransactionDirection | null;
  unit?: ReceptionTransactionUnit | null;
  amount: number;
  metadata: Record<string, unknown> | null;
  createdAt?: string;
}

export interface ReceptionDetailRelatedMovementGroup {
  relationType: ReceptionRelationType;
  label: string;
  items: ReceptionDetailRelatedMovement[];
}

export interface ReceptionDetailHistoryDetail {
  field?: string;
  previousValue?: unknown;
  newValue?: unknown;
}

export interface ReceptionDetailHistoryItem {
  changedAt?: string;
  changedBy?: string;
  changedByName?: string;
  summary?: string;
  details?: ReceptionDetailHistoryDetail[];
}

export interface ReceptionDetailData {
  summary: ReceptionDetailSummary;
  producer?: ReceptionDetailProducerInfo | null;
  documents: ReceptionDetailDocumentInfo;
  totals?: ReceptionDetailTotals | null;
  packs: ReceptionDetailPack[];
  trayReturns: ReceptionDetailTrayReturn[];
  relatedMovements: ReceptionDetailRelatedMovementGroup[];
  history: ReceptionDetailHistoryItem[];
  metadataRaw?: Record<string, unknown> | null;
}

export interface ReceptionDetailResponse {
  success: boolean;
  data?: ReceptionDetailData;
  error?: string;
}
