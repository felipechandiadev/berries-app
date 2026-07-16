'use client';

import { useState } from 'react';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import TransferTraysDialog from './TransferTraysDialog';
import type { PalletRow } from './types';

interface TransferTraysButtonProps {
  pallet: PalletRow;
  onSuccess: () => void;
}

export default function TransferTraysButton({ pallet, onSuccess }: TransferTraysButtonProps) {
  const [open, setOpen] = useState(false);

  // Solo mostrar el botón si el pallet tiene bandejas
  const hasTrays = (pallet.traysQuantity ?? 0) > 0;

  if (!hasTrays) {
    return null;
  }

  return (
    <>
      <IconButton
        icon="swap_horiz"
        onClick={() => setOpen(true)}
        title="Transferir bandejas a otro pallet"
        variant="basicSecondary"
        size="sm"
      />
      <TransferTraysDialog
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={() => {
          setOpen(false);
          onSuccess();
        }}
        preselectedSourcePalletId={pallet.id}
      />
    </>
  );
}
