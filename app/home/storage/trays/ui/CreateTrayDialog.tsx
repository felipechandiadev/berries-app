'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import CreateBaseForm, { BaseFormFieldGroup } from '@/app/baseComponents/BaseForm/CreateBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { createTray } from '@/app/actions/trays';

interface CreateTrayDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  'data-test-id'?: string;
}

const CreateTrayDialog: React.FC<CreateTrayDialogProps> = ({ open, onClose, onSuccess, 'data-test-id': dataTestId }) => {
  const router = useRouter();
  const { success, error } = useAlert();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    weight: '0',
  });

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formFields: BaseFormFieldGroup[] = [
    {
      id: 'tray-info',
      title: 'Información de la Bandeja',
      columns: 1,
      fields: [
        {
          name: 'name',
          label: 'Nombre de la bandeja',
          type: 'text',
          required: true
        },
        {
          name: 'weight',
          label: 'Peso (kg)',
          type: 'number',
          required: true,
          min: 0
        },
      ],
    },
  ];

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrors([]);

    try {
      const submitData = {
        name: formData.name,
        weight: parseFloat(formData.weight),
        stock: 0, // Siempre inicia en 0
      };

      const result = await createTray(submitData, currentUserId);

      if (result.success) {
        success('Bandeja creada exitosamente');
        onClose();
        onSuccess?.();
        // Reset form
        setFormData({
          name: '',
          weight: '0',
        });
      } else {
        error(result.error || 'Error al crear la bandeja');
        setErrors([result.error || 'Error desconocido']);
      }
    } catch (err: any) {
      console.error('Error creating tray:', err);
      error('Error inesperado al crear la bandeja');
      setErrors(['Error inesperado al crear la bandeja']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        name: '',
        weight: '0',
      });
      setErrors([]);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Crear Nueva Bandeja"
      maxWidth="md"
      data-test-id={dataTestId || "create-tray-dialog"}
    >
      <CreateBaseForm
        fields={formFields}
        values={formData}
        onChange={handleChange}
        onSubmit={handleSubmit}
        submitLabel="Crear Bandeja"
        cancelButtonText="Cancelar"
        onCancel={handleClose}
        isSubmitting={isSubmitting}
        errors={errors}
        data-test-id="create-tray-form"
      />
    </Dialog>
  );
};

export default CreateTrayDialog;