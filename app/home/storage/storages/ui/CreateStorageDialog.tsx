'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import CreateBaseForm, { BaseFormField } from '@/app/baseComponents/BaseForm/CreateBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { createStorage } from '@/app/actions/storages';

interface CreateStorageDialogProps {
  open: boolean;
  onClose: () => void;
  'data-test-id'?: string;
}

const CreateStorageDialog: React.FC<CreateStorageDialogProps> = ({ open, onClose, 'data-test-id': dataTestId }) => {
  const router = useRouter();
  const { success, error } = useAlert();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    capacityPallets: '' as number | '',
    location: '',
    active: true,
  });

  const formFields: BaseFormField[] = [
    {
      name: 'name',
      label: 'Nombre del almacenamiento',
      type: 'text',
      required: true
    },
    {
      name: 'capacityPallets',
      label: 'Capacidad (pallets)',
      type: 'number',
      required: false,
      min: 0
    },
    {
      name: 'location',
      label: 'Ubicación',
      type: 'text',
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
    if (field === 'capacityPallets') {
      if (value === '' || value === null || value === undefined) {
        setFormData(prev => ({
          ...prev,
          capacityPallets: '',
        }));
        return;
      }

      const numericValue = typeof value === 'number' ? value : Number(value);

      if (Number.isNaN(numericValue)) {
        return;
      }

      setFormData(prev => ({
        ...prev,
        capacityPallets: numericValue,
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrors([]);

    try {
      const capacityValue = formData.capacityPallets === '' ? undefined : Number(formData.capacityPallets);

      if (capacityValue !== undefined) {
        if (Number.isNaN(capacityValue) || capacityValue < 0 || !Number.isInteger(capacityValue)) {
          setErrors(['La capacidad debe ser un número entero positivo']);
          setIsSubmitting(false);
          return;
        }
      }

      const result = await createStorage({
        name: formData.name,
        capacityPallets: capacityValue,
        location: formData.location || undefined,
        active: formData.active,
      }, currentUserId);

      if (result.success) {
        success(result.message || 'Almacenamiento creado exitosamente');
        onClose();
        setFormData({
          name: '',
          capacityPallets: '',
          location: '',
          active: true,
        });
        // Refresh the page to show the new storage
        router.refresh();
      } else {
        const errorMessage = result.error || 'Error al crear el almacenamiento';
        error(errorMessage);
        setErrors([errorMessage]);
      }
    } catch (err: any) {
      error('Error inesperado al crear el almacenamiento');
      setErrors(['Error inesperado al crear el almacenamiento']);
      console.error('Create storage error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setFormData({
        name: '',
        capacityPallets: '',
        location: '',
        active: true,
      });
      setErrors([]);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Crear Nuevo Almacenamiento"
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
        submitLabel="Crear Almacenamiento"
        cancelButtonText="Cancelar"
      />
    </Dialog>
  );
};

export default CreateStorageDialog;