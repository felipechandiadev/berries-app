"use client";

import { useState } from 'react';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import DeleteBaseForm from '@/app/baseComponents/BaseForm/DeleteBaseForm';
import { useAlert } from '@/app/state/contexts/AlertContext';
import { deleteSettlement } from '@/app/actions/settlements';

interface DeleteSettlementButtonProps {
  settlementId: string;
  folio: string;
}

export default function DeleteSettlementButton({ settlementId, folio }: DeleteSettlementButtonProps) {
  const { showAlert } = useAlert();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = async () => {
    setErrors([]);
    setIsSubmitting(true);

    try {
      const result = await deleteSettlement(settlementId);

      if (result.success) {
        showAlert({
          message: 'Liquidación eliminada exitosamente',
          type: 'success',
          duration: 4000,
        });
        setOpen(false);
      } else {
        const errorMessage = result.error || 'Error al eliminar la liquidación';
        showAlert({ message: errorMessage, type: 'error', duration: 5000 });
        setErrors([errorMessage]);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('[DeleteSettlementButton] Error eliminando liquidación:', error);
      const errorMessage = 'Error inesperado al eliminar la liquidación';
      showAlert({ message: errorMessage, type: 'error', duration: 5000 });
      setErrors([errorMessage]);
      setIsSubmitting(false);
    }
  };

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
        title="Eliminar Liquidación"
        size="xs"
      >
        <DeleteBaseForm
          message={`¿Está seguro que desea eliminar la liquidación Folio "${folio}"? Esta acción eliminará las relaciones con recepciones y anticipos, dejándolos disponibles nuevamente.`}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          errors={errors}
          cancelButton
          cancelButtonText="Cancelar"
          onCancel={() => setOpen(false)}
          submitLabel="Eliminar"
          title="Eliminar Liquidación"
        />
      </Dialog>
    </>
  );
}
