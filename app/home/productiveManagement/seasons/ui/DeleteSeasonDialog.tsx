'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import DeleteBaseForm from '@/app/baseComponents/BaseForm/DeleteBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { Season } from '@/data/entities/Season';
import { deleteSeason } from '@/app/actions/seasons';

interface DeleteSeasonDialogProps {
  open: boolean;
  onClose: () => void;
  season: Season;
  'data-test-id'?: string;
}

const DeleteSeasonDialog: React.FC<DeleteSeasonDialogProps> = ({ open, onClose, season, 'data-test-id': dataTestId }) => {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { success, error } = useAlert();

  const handleSubmit = async () => {
    if (!season?.id) {
      setErrors(['Temporada no identificada']);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      const result = await deleteSeason(season.id, currentUserId);

      if (result?.success) {
        success(result.message || 'Temporada eliminada exitosamente');
        onClose();
        // Refresh the page to update the list
        router.refresh();
      } else {
        error(result.error || 'Error al eliminar la temporada');
      }
    } catch (err: any) {
      error('Error inesperado al eliminar la temporada');
      console.error('Delete season error:', err);
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

  const deleteMessage = `¿Estás seguro de que deseas eliminar la temporada "${season.name}"?`;
  const deleteDetails = 'Esta acción marcará la temporada como eliminada, pero podrás restaurarla más tarde si es necesario.';

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
        submitLabel="Eliminar"
        cancelButton={true}
        cancelButtonText="Cancelar"
        title="Eliminar Temporada"
      />
    </Dialog>
  );
};

export default DeleteSeasonDialog;