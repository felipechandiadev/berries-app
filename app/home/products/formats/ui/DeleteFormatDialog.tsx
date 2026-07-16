'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import DeleteBaseForm from '@/app/baseComponents/BaseForm/DeleteBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { deleteFormat } from '@/app/actions/formats';

interface Format {
  id: number;
  name: string;
  description?: string;
  active: boolean;
}

interface DeleteFormatDialogProps {
  open: boolean;
  onClose: () => void;
  format: Format;
}

const DeleteFormatDialog: React.FC<DeleteFormatDialogProps> = ({ open, onClose, format }) => {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { success, error } = useAlert();

  const handleSubmit = async () => {
    if (!format?.id) {
      setErrors(['Formato no identificado']);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      const result = await deleteFormat(format.id, currentUserId);

      if (result?.success) {
        success(result.message || 'Formato eliminado exitosamente');
        onClose();
        // Refresh the page to update the list
        router.refresh();
      } else {
        error(result.error || 'Error al eliminar el formato');
      }
    } catch (err: any) {
      error('Error inesperado al eliminar el formato');
      console.error('Delete format error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setErrors([]);
    }
  };

  const deleteMessage = `¿Estás seguro de que deseas eliminar el formato "${format.name}"?`;
  const deleteDetails = 'Esta acción marcará el formato como eliminado, pero podrás restaurarlo más tarde si es necesario.';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title=""
      size="xs"
      data-test-id="delete-format-dialog"
    >
      <DeleteBaseForm
        message={deleteMessage}
        onSubmit={handleSubmit}
        onCancel={handleClose}
        cancelButton={true}
        title="Eliminar Formato"
        submitLabel="Eliminar"
        isSubmitting={isSubmitting}
        errors={errors}
        cancelButtonText="Cancelar"
      />
    </Dialog>
  );
};

export default DeleteFormatDialog;