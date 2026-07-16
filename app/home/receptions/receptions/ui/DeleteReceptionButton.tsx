'use client';

import { useState } from 'react';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import DeleteBaseForm from '@/app/baseComponents/BaseForm/DeleteBaseForm';
import { useAlert } from '@/app/state/contexts/AlertContext';
import { deleteReception, type ReceptionGridRow } from '@/app/actions/receptions';

interface DeleteReceptionButtonProps {
  reception: ReceptionGridRow;
  onSuccess: () => void;
}

export default function DeleteReceptionButton({ reception, onSuccess }: DeleteReceptionButtonProps) {
  const { showAlert } = useAlert();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrors([]);

    try {
      const result = await deleteReception(reception.id);

      if (result.success) {
        showAlert({
          message: 'Recepción eliminada exitosamente',
          type: 'success',
          duration: 4000,
        });
        setTimeout(() => {
          setOpen(false);
          onSuccess();
        }, 500);
      } else {
        const errorMessage = result.error || 'Error al eliminar la recepción';
        showAlert({
          message: errorMessage,
          type: 'error',
          duration: 4000,
        });
        setErrors([errorMessage]);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error deleting reception:', error);
      const errorMessage = 'Error al eliminar la recepción';
      showAlert({
        message: errorMessage,
        type: 'error',
        duration: 4000,
      });
      setErrors([errorMessage]);
      setIsSubmitting(false);
    }
  };

  const guideLabel = reception.guideNumber ? `guía ${reception.guideNumber}` : `ID ${reception.id}`;

  return (
    <>
      <IconButton
        icon="delete"
        variant="basicSecondary"
        size="xs"
        title={reception.isSettled ? "No se puede eliminar una recepción liquidada" : "Eliminar recepción"}
        ariaLabel="Eliminar recepción"
        onClick={() => setOpen(true)}
        disabled={reception.isSettled}
      />

      <Dialog
        open={open}
        onClose={() => !isSubmitting && setOpen(false)}
        title=""
        size="xs"
      >
        <DeleteBaseForm
          message={`¿Está seguro que desea eliminar la recepción (${guideLabel})? Esta acción no se puede deshacer.`}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          errors={errors}
          cancelButton={true}
          cancelButtonText="Cancelar"
          onCancel={() => setOpen(false)}
          submitLabel="Eliminar"
          title="Eliminar Recepción"
        />
      </Dialog>
    </>
  );
}
