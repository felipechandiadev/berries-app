'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import CreateBaseForm, { BaseFormFieldGroup } from '@/app/baseComponents/BaseForm/CreateBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { createVariety } from '@/app/actions/varieties';

interface CreateVarietyDialogProps {
  open: boolean;
  onClose: () => void;
}

const CreateVarietyDialog: React.FC<CreateVarietyDialogProps> = ({ open, onClose }) => {
  const router = useRouter();
  const { success, error } = useAlert();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const formFields: BaseFormFieldGroup[] = [
    {
      id: 'variety-info',
      title: 'Información de la Variedad',
      columns: 1,
      fields: [
        {
          name: 'name',
          label: 'Nombre de la variedad',
          type: 'text',
          required: true
        },
        {
          name: 'description',
          label: 'Descripción',
          type: 'text',
          required: false
        }
      ]
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
      const result = await createVariety({
        name: formData.name,
        description: formData.description || undefined,
      }, currentUserId);

      if (result.success) {
        success(result.message || 'Variedad creada exitosamente');
        onClose();
        setFormData({
          name: '',
          description: '',
        });
      } else {
        error(result.error || 'Error al crear la variedad');
        if (result.error) {
          setErrors([result.error]);
        }
      }
    } catch (err: any) {
      console.error('Error creating variety:', err);
      error('Error inesperado al crear la variedad');
      setErrors(['Error inesperado al crear la variedad']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setErrors([]);
      setFormData({
        name: '',
        description: '',
      });
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Crear Nueva Variedad"
      maxWidth="md"
      data-test-id="create-variety-dialog"
    >
      <CreateBaseForm
        fields={formFields}
        values={formData}
        onChange={handleChange}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Crear Variedad"
        cancelButtonText="Cancelar"
        onCancel={handleClose}
        errors={errors}
        data-test-id="create-variety-form"
      />
    </Dialog>
  );
};

export default CreateVarietyDialog;