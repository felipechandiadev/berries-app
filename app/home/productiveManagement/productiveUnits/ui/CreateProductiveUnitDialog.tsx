'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import CreateBaseForm, { BaseFormFieldGroup } from '@/app/baseComponents/BaseForm/CreateBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { createProductiveUnit } from '@/app/actions/productiveUnits';
import IconButton from '@/app/baseComponents/IconButton/IconButton';

interface CreateProductiveUnitDialogProps {
  open?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  /** Si es true, solo renderiza el formulario sin Dialog wrapper (para uso en DataGrid) */
  embedded?: boolean;
}

const CreateProductiveUnitDialog: React.FC<CreateProductiveUnitDialogProps> = ({ 
  open: externalOpen, 
  onClose, 
  onSuccess,
  embedded = false,
}) => {
  const router = useRouter();
  const { success, error: showError } = useAlert();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({
    name: '',
    location: '',
  });

  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;

  // Form fields definition - solo nombre y ubicación
  const formFields: BaseFormFieldGroup[] = [
    {
      id: 'unit-info',
      columns: 1,
      fields: [
        {
          name: 'name',
          label: 'Nombre',
          type: 'text',
          required: true,
          startIcon: 'agriculture',
        },
        {
          name: 'location',
          label: 'Ubicación / Dirección',
          type: 'text',
          startIcon: 'location_on',
        },
      ],
    },
  ];

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setInternalOpen(false);
    }
    // Reset form
    setFormData({
      name: '',
      location: '',
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const result = await createProductiveUnit({
        name: formData.name,
        location: formData.location || undefined,
      });

      if (result.success) {
        success('Unidad productiva creada exitosamente');

        setTimeout(() => {
          handleClose();
          onSuccess?.();
          router.refresh();
          setIsSubmitting(false);
        }, 500);
      } else {
        showError(result.error || 'Error al crear la unidad productiva');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      showError(err?.message || 'Error desconocido');
      setIsSubmitting(false);
    }
  };

  // Componente del formulario
  const FormContent = (
    <CreateBaseForm
      fields={formFields}
      onSubmit={handleSubmit}
      onChange={handleFieldChange}
      values={formData}
      submitLabel="Crear Unidad Productiva"
      isSubmitting={isSubmitting}
    />
  );

  // Si está embebido (dentro del DataGrid), solo devuelve el formulario
  if (embedded || onClose) {
    return FormContent;
  }

  // Si no está embebido, renderiza con botón y Dialog propio
  return (
    <>
      <IconButton
        icon="add"
        variant="containedPrimary"
        size="md"
        onClick={() => setInternalOpen(true)}
        title="Crear Unidad Productiva"
      />

      <Dialog
        open={isOpen}
        onClose={handleClose}
        title="Nueva Unidad Productiva"
      >
        {FormContent}
      </Dialog>
    </>
  );
};

export default CreateProductiveUnitDialog;
