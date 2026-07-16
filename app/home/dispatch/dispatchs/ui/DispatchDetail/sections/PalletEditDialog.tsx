'use client';

import React, { useState, useEffect } from 'react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import { Button } from '@/app/baseComponents/Button/Button';
import { updateDispatchPallets } from '@/app/actions/dispatches';
import { useAlert } from '@/app/state/hooks/useAlert';

interface EditPalletDialogProps {
  open: boolean;
  onClose: () => void;
  dispatchId: string;
  pallets: any[];
  palletIndex: number;
  onSuccess: () => void;
}

export const EditPalletDialog: React.FC<EditPalletDialogProps> = ({
  open,
  onClose,
  dispatchId,
  pallets,
  palletIndex,
  onSuccess,
}) => {
  const [trayCount, setTrayCount] = useState('');
  const [grossWeight, setGrossWeight] = useState('');
  const [palletWeight, setPalletWeight] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { success, error: showError } = useAlert();

  const pallet = pallets[palletIndex];

  useEffect(() => {
    if (pallet) {
      setTrayCount(String(pallet.trayCount || ''));
      setGrossWeight(String(pallet.grossWeight || ''));
      setPalletWeight(String(pallet.palletWeight || ''));
    }
  }, [pallet]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const newPallets = [...pallets];
      newPallets[palletIndex] = {
        ...newPallets[palletIndex],
        trayCount: parseInt(trayCount, 10),
        grossWeight: parseFloat(grossWeight),
        palletWeight: parseFloat(palletWeight),
      };

      const response = await updateDispatchPallets(dispatchId, newPallets);
      if (response.success) {
        success('Pallet actualizado correctamente');
        onSuccess();
      } else {
        showError(response.error || 'Error al actualizar el pallet');
      }
    } catch (error: any) {
      showError(error.message || 'Error inesperado');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Editar Pallet #${palletIndex + 1}`}
      size="sm"
      zIndex={100}
      actions={
        <div className="flex justify-end gap-2">
          <Button variant="text" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 py-2">
        <TextField
          label="Cantidad de Bandejas"
          type="number"
          value={trayCount}
          onChange={(e) => setTrayCount(e.target.value)}
          required
        />
        <TextField
          label="Peso Bruto (kg)"
          type="number"
          value={grossWeight}
          onChange={(e) => setGrossWeight(e.target.value)}
          required
        />
        <TextField
          label="Peso Pallet (kg)"
          type="number"
          value={palletWeight}
          onChange={(e) => setPalletWeight(e.target.value)}
          required
        />
      </div>
    </Dialog>
  );
};
