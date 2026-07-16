'use client';

import { useState } from 'react';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import type { ReceptionDetailPack } from '../types';
import { DeletePackDialog } from './DeletePackDialog';

interface DeletePackButtonProps {
  receptionId: string;
  pack: ReceptionDetailPack;
  onDeleted?: () => void;
  'data-test-id'?: string;
  isSettled?: boolean;
}

export function DeletePackButton({ receptionId, pack, onDeleted, 'data-test-id': dataTestId, isSettled = false }: DeletePackButtonProps) {
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <>
      <IconButton
        icon="delete"
        variant="basicSecondary"
        aria-label={isSettled ? "No se puede eliminar: recepción liquidada" : `Eliminar pack ${pack.packId}`}
        onClick={handleOpen}
        data-test-id={dataTestId ?? `delete-pack-${pack.packId}`}
        disabled={isSettled}
      />
      <DeletePackDialog
        open={open}
        onClose={handleClose}
        receptionId={receptionId}
        packId={pack.packId}
        summary={{
          packNumber: pack.packNumber,
          trayLabel: pack.trayLabel ?? pack.trayId ?? null,
          traysQuantity: pack.traysQuantity,
          grossWeightKg: pack.grossWeightKg,
          netWeightKg: pack.netWeightKg,
          totalToPay: pack.totalToPay,
          currency: pack.currency,
        }}
        onSuccess={() => {
          setOpen(false);
          onDeleted?.();
        }}
      />
    </>
  );
}
