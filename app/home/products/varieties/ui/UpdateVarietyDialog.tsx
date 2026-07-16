'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import UpdateBaseForm, { BaseUpdateFormFieldGroup } from '@/app/baseComponents/BaseForm/UpdateBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { updateVariety } from '@/app/actions/varieties';

interface Variety {
  id: number;
  name: string;
  description: string | null;
}

interface UpdateVarietyDialogProps {
  open: boolean;
  onClose: () => void;
  variety: Variety;
}

const UpdateVarietyDialog: React.FC<UpdateVarietyDialogProps> = ({ open, onClose, variety }) => {
  const router = useRouter();
  const { success, error } = useAlert();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: variety.name,
    description: variety.description || '',
  });

  const formFields: BaseUpdateFormFieldGroup[] = [
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
      const result = await updateVariety({
        id: variety.id,
        name: formData.name,
        description: formData.description || undefined,
      }, currentUserId);

      if (result.success) {
        success(result.message || 'Variedad actualizada exitosamente');
        onClose();
      } else {
        error(result.error || 'Error al actualizar la variedad');
        if (result.error) {
          setErrors([result.error]);
        }
      }
    } catch (err: any) {
      console.error('Error updating variety:', err);
      error('Error inesperado al actualizar la variedad');
      setErrors(['Error inesperado al actualizar la variedad']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setErrors([]);
      // Reset form data to original variety data
      setFormData({
        name: variety.name,
        description: variety.description || '',
      });
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Editar Variedad"
      maxWidth="md"
      data-test-id="update-variety-dialog"
    >
      <UpdateBaseForm
        fields={formFields}
        initialState={formData}
        onChange={handleChange}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Actualizar Variedad"
        cancelButtonText="Cancelar"
        onCancel={handleClose}
        errors={errors}
        data-test-id="update-variety-form"
      />
    </Dialog>
  );
};

export default UpdateVarietyDialog;