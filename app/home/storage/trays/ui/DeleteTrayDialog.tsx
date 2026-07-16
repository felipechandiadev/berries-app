'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import DeleteBaseForm from '@/app/baseComponents/BaseForm/DeleteBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { deleteTray } from '@/app/actions/trays';

interface Tray {
  id: string;
  name: string;
  weight: number;
  stock: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

interface DeleteTrayDialogProps {
  open: boolean;
  onClose: () => void;
  tray: Tray;
  onSuccess?: () => void;
  'data-test-id'?: string;
}

const DeleteTrayDialog: React.FC<DeleteTrayDialogProps> = ({ open, onClose, tray, onSuccess, 'data-test-id': dataTestId }) => {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { success, error } = useAlert();

  const handleSubmit = async () => {
    if (!tray?.id) {
      setErrors(['Bandeja no identificada']);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      const result = await deleteTray(tray.id, currentUserId);

      if (result?.success) {
        success(result.message || 'Bandeja eliminada exitosamente');
        onClose();
        onSuccess?.();
      } else {
        error(result.error || 'Error al eliminar la bandeja');
        setErrors([result.error || 'Error desconocido']);
      }
    } catch (err: any) {
      console.error('Error deleting tray:', err);
      error('Error inesperado al eliminar la bandeja');
      setErrors(['Error inesperado al eliminar la bandeja']);
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

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title=""
      size="xs"
      data-test-id={dataTestId || "delete-tray-dialog"}
    >
      <DeleteBaseForm
        message={`¿Estás seguro de que quieres eliminar la bandeja "${tray.name}"? Esta acción no se puede deshacer.`}
        onSubmit={handleSubmit}
        onCancel={handleClose}
        cancelButton={true}
        title="Eliminar Bandeja"
        submitLabel="Eliminar"
        cancelButtonText="Cancelar"
        isSubmitting={isSubmitting}
        errors={errors}
        data-test-id="delete-tray-form"
      />
    </Dialog>
  );
};

export default DeleteTrayDialog;