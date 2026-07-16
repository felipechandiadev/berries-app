'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import DeleteBaseForm from '@/app/baseComponents/BaseForm/DeleteBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { deleteVariety } from '@/app/actions/varieties';

interface Variety {
  id: number;
  name: string;
  description: string | null;
}

interface DeleteVarietyDialogProps {
  open: boolean;
  onClose: () => void;
  variety: Variety;
}

const DeleteVarietyDialog: React.FC<DeleteVarietyDialogProps> = ({ open, onClose, variety }) => {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { success, error } = useAlert();

  const handleSubmit = async () => {
    if (!variety?.id) {
      setErrors(['Variedad no identificada']);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      const result = await deleteVariety(variety.id, currentUserId);

      if (result?.success) {
        success(result.message || 'Variedad eliminada exitosamente');
        onClose();
      } else {
        error(result.error || 'Error al eliminar la variedad');
        if (result.error) {
          setErrors([result.error]);
        }
      }
    } catch (err: any) {
      console.error('Error deleting variety:', err);
      error('Error inesperado al eliminar la variedad');
      setErrors(['Error inesperado al eliminar la variedad']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setErrors([]);
      onClose();
    }
  };

  const getDeleteMessage = () => {
    return `¿Estás seguro de que deseas eliminar la variedad "${variety.name}"? Esta acción no se puede deshacer.`;
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title=""
      size="xs"
      data-test-id="delete-variety-dialog"
    >
      <DeleteBaseForm
        message={getDeleteMessage()}
        onSubmit={handleSubmit}
        onCancel={handleClose}
        isSubmitting={isSubmitting}
        errors={errors}
        cancelButton={true}
        title='Eliminar Variedad'
        submitLabel="Eliminar"
        cancelButtonText="Cancelar"
        data-test-id="delete-variety-form"
      />
    </Dialog>
  );
};

export default DeleteVarietyDialog;