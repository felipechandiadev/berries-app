'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import CreateBaseForm, { BaseFormField } from '@/app/baseComponents/BaseForm/CreateBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { createSeason } from '@/app/actions/seasons';

interface CreateSeasonDialogProps {
  open: boolean;
  onClose: () => void;
  'data-test-id'?: string;
}

const CreateSeasonDialog: React.FC<CreateSeasonDialogProps> = ({ open, onClose, 'data-test-id': dataTestId }) => {
  const router = useRouter();
  const { success, error } = useAlert();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    description: '',
    active: true,
  });

  const formFields: BaseFormField[] = [
    {
      name: 'name',
      label: 'Nombre de la temporada',
      type: 'text',
      required: true
    },
    {
      name: 'startDate',
      label: 'Fecha de inicio',
      type: 'date',
      required: true
    },
    {
      name: 'endDate',
      label: 'Fecha de término',
      type: 'date',
      required: true
    },
    {
      name: 'description',
      label: 'Descripción',
      type: 'textarea',
      required: false
    },
    {
      name: 'active',
      label: 'Estado activo',
      type: 'switch',
      required: false
    }
  ];

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrors([]);

    try {
      const result = await createSeason({
        name: formData.name,
        startDate: new Date(formData.startDate + 'T00:00:00'),
        endDate: new Date(formData.endDate + 'T23:59:59'),
        description: formData.description || undefined,
        active: formData.active,
      }, currentUserId);

      if (result.success) {
        success(result.message || 'Temporada creada exitosamente');
        onClose();
        setFormData({
          name: '',
          startDate: '',
          endDate: '',
          description: '',
          active: true,
        });
        // Refresh the page to show the new season
        router.refresh();
      } else {
        error(result.error || 'Error al crear la temporada');
      }
    } catch (err: any) {
      error('Error inesperado al crear la temporada');
      console.error('Create season error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setFormData({
        name: '',
        startDate: '',
        endDate: '',
        description: '',
        active: true,
      });
      setErrors([]);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Crear Nueva Temporada"
      maxWidth="md"
      data-test-id={dataTestId}
    >
      <CreateBaseForm
        fields={formFields}
        values={formData}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onCancel={handleClose}
        isSubmitting={isSubmitting}
        errors={errors}
        submitLabel="Crear Temporada"
        cancelButtonText="Cancelar"
      />
    </Dialog>
  );
};

export default CreateSeasonDialog;