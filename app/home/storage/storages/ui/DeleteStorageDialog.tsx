'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import DeleteBaseForm from '@/app/baseComponents/BaseForm/DeleteBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { Storage } from '@/data/entities/Storage';
import { deleteStorage } from '@/app/actions/storages';

interface DeleteStorageDialogProps {
  open: boolean;
  onClose: () => void;
  storage: Storage;
  'data-test-id'?: string;
}

const DeleteStorageDialog: React.FC<DeleteStorageDialogProps> = ({ open, onClose, storage, 'data-test-id': dataTestId }) => {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { success, error } = useAlert();

  const handleSubmit = async () => {
    if (!storage?.id) {
      setErrors(['Almacenamiento no identificado']);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      const result = await deleteStorage(storage.id, currentUserId);

      if (result?.success) {
        success(result.message || 'Almacenamiento eliminado exitosamente');
        onClose();
        // Refresh the page to update the list
        router.refresh();
      } else {
        error(result.error || 'Error al eliminar el almacenamiento');
      }
    } catch (err: any) {
      error('Error inesperado al eliminar el almacenamiento');
      console.error('Delete storage error:', err);
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

  const deleteMessage = `¿Estás seguro de que deseas eliminar el almacenamiento "${storage.name}"?`;
  const deleteDetails = 'Esta acción marcará el almacenamiento como eliminado, pero podrás restaurarlo más tarde si es necesario.';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title=""
      size="xs"
      data-test-id={dataTestId}
    >
      <DeleteBaseForm
        message={deleteMessage}
        onSubmit={handleSubmit}
        onCancel={handleClose}
        isSubmitting={isSubmitting}
        errors={errors}
        cancelButton={true}
        title="Eliminar Almacenamiento"
        submitLabel="Eliminar"
        cancelButtonText="Cancelar"
      />
    </Dialog>
  );
};

export default DeleteStorageDialog;