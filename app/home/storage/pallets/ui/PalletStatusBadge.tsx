"use client";

import Badge, { type BadgeVariant } from '@/app/baseComponents/Badge/Badge';
import { PalletStatus } from '@/data/entities/Pallet';

interface PalletStatusBadgeProps {
  status: PalletStatus;
}

export const PALLET_STATUS_VARIANTS: Record<PalletStatus, BadgeVariant> = {
  [PalletStatus.AVAILABLE]: 'success',
  [PalletStatus.CLOSED]: 'warning',
  [PalletStatus.FULL]: 'primary',
  [PalletStatus.DISPATCHED]: 'info',
};

export const PALLET_STATUS_LABELS: Record<PalletStatus, string> = {
  [PalletStatus.AVAILABLE]: 'Disponible',
  [PalletStatus.CLOSED]: 'Cerrado',
  [PalletStatus.FULL]: 'Completo',
  [PalletStatus.DISPATCHED]: 'Despachado',
};

export function getPalletStatusLabel(status: PalletStatus): string {
  return PALLET_STATUS_LABELS[status] ?? status;
}

export function getPalletStatusOptions(): Array<{ id: PalletStatus; label: string }> {
  return Object.values(PalletStatus).map((status) => ({
    id: status,
    label: getPalletStatusLabel(status),
  }));
}

export default function PalletStatusBadge({ status }: PalletStatusBadgeProps) {
  const variant = PALLET_STATUS_VARIANTS[status] ?? 'primary';
  const label = getPalletStatusLabel(status);

  return (
    <Badge variant={variant} className="uppercase">
      {label}
    </Badge>
  );
}
