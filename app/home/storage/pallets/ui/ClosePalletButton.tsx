'use client';

import { useState } from 'react';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { Button } from '@/app/baseComponents/Button/Button';
import { useAlert } from '@/app/state/contexts/AlertContext';
import { closePallet } from '@/app/actions/pallets';
import { PalletStatus } from '@/data/entities/Pallet';
import type { PalletRow } from './types';

interface ClosePalletButtonProps {
  pallet: PalletRow;
  onSuccess?: () => void;
}

export default function ClosePalletButton({ pallet, onSuccess }: ClosePalletButtonProps) {
  const { showAlert } = useAlert();
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // No mostrar si el pallet ya está cerrado o despachado
  if (pallet.status === PalletStatus.CLOSED || pallet.status === PalletStatus.DISPATCHED) {
    return null;
  }

  const handleClose = () => {
    setOpen(false);
  };

  const handleConfirm = async () => {
    setIsClosing(true);
    try {
      const result = await closePallet(pallet.id);
      
      if (result.success) {
        showAlert({ 
          message: `Pallet #${pallet.id} cerrado exitosamente`, 
          type: 'success', 
          duration: 4000 
        });
        handleClose();
        onSuccess?.();
      } else {
        showAlert({ 
          message: result.error || 'Error al cerrar el pallet', 
          type: 'error', 
          duration: 5000 
        });
      }
    } catch (error) {
      console.error('[ClosePalletButton] Error:', error);
      showAlert({ 
        message: 'Error inesperado al cerrar el pallet', 
        type: 'error', 
        duration: 5000 
      });
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <>
      <IconButton
        icon="lock"
        onClick={() => setOpen(true)}
        title="Cerrar pallet"
        variant="basicSecondary"
        size="sm"
      />

      <Dialog
        open={open}
        onClose={handleClose}
        title={`Cerrar Pallet #${pallet.id}`}
      >
        <div className="min-w-[400px] space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">
              warning
            </span>
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-200">
                ¿Estás seguro de cerrar este pallet?
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Al cerrar el pallet, <strong>no se podrán agregar más bandejas</strong>. 
                Esta acción indica que el pallet está listo para ser despachado.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
              Información del pallet
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Almacenamiento:</span>
                <p className="font-medium">{pallet.storageName || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500">Tipo de bandeja:</span>
                <p className="font-medium">{pallet.trayName || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500">Bandejas:</span>
                <p className="font-medium">{pallet.traysQuantity} / {pallet.capacity}</p>
              </div>
              <div>
                <span className="text-gray-500">Estado actual:</span>
                <p className="font-medium capitalize">{pallet.status?.toLowerCase() || '-'}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outlined"
              onClick={handleClose}
              disabled={isClosing}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={isClosing}
            >
              {isClosing ? 'Cerrando...' : 'Cerrar pallet'}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
