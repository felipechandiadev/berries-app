"use client";

import { useState } from 'react';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import DeleteBaseForm from '@/app/baseComponents/BaseForm/DeleteBaseForm';
import { useAlert } from '@/app/state/contexts/AlertContext';
import { deletePallet } from '@/app/actions/pallets';
import type { PalletRow } from './types';

interface DeletePalletButtonProps {
  pallet: PalletRow;
  onSuccess: () => void;
}

export default function DeletePalletButton({ pallet, onSuccess }: DeletePalletButtonProps) {
  const { showAlert } = useAlert();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = async () => {
    setErrors([]);
    setIsSubmitting(true);

    try {
      const result = await deletePallet(pallet.id);

      if (result.success) {
        showAlert({
          message: 'Pallet eliminado exitosamente',
          type: 'success',
          duration: 4000,
        });
        setTimeout(() => {
          setOpen(false);
          onSuccess();
        }, 500);
      } else {
        const errorMessage = result.error || 'Error al eliminar el pallet';
        showAlert({ message: errorMessage, type: 'error', duration: 5000 });
        setErrors([errorMessage]);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('[DeletePalletButton] Error eliminando pallet:', error);
      const errorMessage = 'Error inesperado al eliminar el pallet';
      showAlert({ message: errorMessage, type: 'error', duration: 5000 });
      setErrors([errorMessage]);
      setIsSubmitting(false);
    }
  };

  const storageLabel = pallet.storageName || 'sin almacenamiento';
  const trayLabel = pallet.trayName || 'sin bandeja';

  return (
    <>
      <IconButton
        icon="delete"
        variant="basicSecondary"
        size="sm"
        onClick={() => setOpen(true)}
        title="Eliminar"
      />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Eliminar Pallet"
        size="xs"
      >
        <DeleteBaseForm
          message={`¿Está seguro que desea eliminar el pallet asociado al almacenamiento "${storageLabel}" y bandeja "${trayLabel}"? Esta acción no se puede deshacer.`}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          errors={errors}
          cancelButton
          cancelButtonText="Cancelar"
          onCancel={() => setOpen(false)}
          submitLabel="Eliminar"
          title="Eliminar Pallet"
        />
      </Dialog>
    </>
  );
}
