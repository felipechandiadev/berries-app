import { PalletStatus } from '@/data/entities/Pallet';

export interface PalletRow {
  id: number;
  storageId: string;
  storageName: string | null;
  trayId: string;
  trayName: string | null;
  traysQuantity: number;
  capacity: number;
  weight: number;
  dispatchWeight: number;
  status: PalletStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}
