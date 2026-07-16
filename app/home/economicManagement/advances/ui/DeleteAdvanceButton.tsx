'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import DeleteBaseForm from '@/app/baseComponents/BaseForm/DeleteBaseForm';
import { useAlert } from '@/app/state/contexts/AlertContext';
import { deleteAdvance } from '@/app/actions/advances';

interface DeleteAdvanceButtonProps {
  advanceId: string;
  producerName?: string | null;
  amountLabel?: string | null;
  advanceStatus?: string;
  onSuccess?: () => void;
}

export default function DeleteAdvanceButton({
  advanceId,
  producerName,
  amountLabel,
  advanceStatus,
  onSuccess,
}: DeleteAdvanceButtonProps) {
  const { data: session, status } = useSession();
  const { showAlert } = useAlert();
  const currentUserId = (session?.user as any)?.id as string | undefined;

  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }
    setOpen(false);
    setErrors([]);
  };

  const handleSubmit = async () => {
    if (status === 'loading') {
      showAlert({
        message: 'Cargando sesión de usuario. Por favor, intente nuevamente en un momento.',
        type: 'error',
        duration: 4000,
      });
      return;
    }

    if (!currentUserId) {
      showAlert({
        message: 'No fue posible identificar al usuario actual. Inicie sesión nuevamente e intente otra vez.',
        type: 'error',
        duration: 4000,
      });
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      await deleteAdvance({
        advanceId,
        userId: currentUserId,
      });

      showAlert({
        message: 'Anticipo eliminado correctamente.',
        type: 'success',
        duration: 4000,
      });

      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('[DeleteAdvanceButton] Error deleting advance:', error);
      const errorMessage = error?.message ?? 'No se pudo eliminar el anticipo. Intente nuevamente.';
      showAlert({
        message: errorMessage,
        type: 'error',
        duration: 4000,
      });
      setErrors([errorMessage]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const producerDisplay = producerName ? ` del productor "${producerName}"` : '';
  const amountDisplay = amountLabel ? ` por un monto de ${amountLabel}` : '';

  return (
    <>
      <IconButton
        icon="delete"
        variant="basicSecondary"
        size="sm"
        ariaLabel={advanceStatus === 'APPLIED' ? "No se puede eliminar: anticipo liquidado" : "Eliminar anticipo"}
        title={advanceStatus === 'APPLIED' ? "No se puede eliminar: anticipo liquidado" : "Eliminar anticipo"}
        onClick={() => setOpen(true)}
        disabled={advanceStatus === 'APPLIED'}
      />

      <Dialog
        open={open}
        onClose={handleClose}
        title="Eliminar anticipo"
        size="xs"
      >
        <DeleteBaseForm
          message={`¿Confirma que desea eliminar este anticipo${producerDisplay}${amountDisplay}? Esta acción no se puede deshacer.`}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          errors={errors}
          cancelButton
          cancelButtonText="Cerrar"
          onCancel={handleClose}
          submitLabel="Eliminar anticipo"
        />
      </Dialog>
    </>
  );
}
