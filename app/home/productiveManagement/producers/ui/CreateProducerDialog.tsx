'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import CreateBaseForm, { BaseFormFieldGroup } from '@/app/baseComponents/BaseForm/CreateBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { createProducer } from '@/app/actions/producers';
import { getProductiveUnitsForSelect } from '@/app/actions/productiveUnits';

interface CreateProducerDialogProps {
  open?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

interface ProductiveUnitOption {
  id: string;
  label: string;
}

const CreateProducerDialog: React.FC<CreateProducerDialogProps> = ({ open: externalOpen, onClose, onSuccess }) => {
  const router = useRouter();
  const { success, error: showError } = useAlert();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productiveUnits, setProductiveUnits] = useState<ProductiveUnitOption[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({
    name: '',
    dni: '',
    mail: '',
    phone: '',
    address: '',
    productiveUnitId: '',
  });

  // Cargar unidades productivas al montar
  useEffect(() => {
    const loadProductiveUnits = async () => {
      try {
        const units = await getProductiveUnitsForSelect();
        setProductiveUnits(units);
      } catch (error) {
        console.error('Error loading productive units:', error);
      }
    };
    loadProductiveUnits();
  }, []);

  // Definir estructura del formulario
  const formFields: BaseFormFieldGroup[] = [
    {
      id: 'producer-info',
      columns: 1,
      fields: [
        {
          name: 'name',
          label: 'Nombre completo',
          type: 'text',
          required: true,
          startIcon: 'person'
        },
        {
          name: 'dni',
          label: 'RUT',
          type: 'dni',
          required: true,
          startIcon: 'badge'
        },
        {
          name: 'productiveUnitId',
          label: 'Unidad Productiva',
          type: 'autocomplete',
          options: productiveUnits,
          startIcon: 'agriculture'
        },
        {
          name: 'mail',
          label: 'Correo electrónico',
          type: 'email',
          startIcon: 'mail'
        },
        {
          name: 'phone',
          label: 'Teléfono',
          type: 'text',
          startIcon: 'phone'
        },
        {
          name: 'address',
          label: 'Dirección',
          type: 'text',
          startIcon: 'location_on'
        }
      ]
    }
  ];

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const result = await createProducer({
        name: formData.name,
        dni: formData.dni,
        mail: formData.mail || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        productiveUnitId: formData.productiveUnitId || undefined,
      }, currentUserId);

      if (result.success) {
        success('Productor creado exitosamente');

        // Cerrar el dialog después de 500ms y hacer refresh
        setTimeout(() => {
          // Always call onClose if provided
          onClose?.();
          onSuccess?.();
          router.refresh();
          setIsSubmitting(false);
          // Reset form data
          setFormData({
            name: '',
            dni: '',
            mail: '',
            phone: '',
            address: '',
            productiveUnitId: '',
          });
        }, 500);
      } else {
        const errorMessage = result.error || 'Error al crear el productor';
        showError(errorMessage);
        setIsSubmitting(false);
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Error desconocido';
      showError(errorMessage);
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      dni: '',
      mail: '',
      phone: '',
      address: '',
      productiveUnitId: '',
    });
    // Always call onClose if provided (DataGrid or standalone usage)
    onClose?.();
  };

  const formContent = (
    <CreateBaseForm
      fields={formFields}
      values={formData}
      onChange={handleFieldChange}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      title="Nuevo Productor"
      subtitle="Complete la información del productor"
      cancelButton={true}
      cancelButtonText="Cancelar"
      onCancel={handleCancel}
      data-test-id="create-producer-form"
    />
  );

  // If open prop is provided, we are in controlled mode (Standalone)
  // We render the Dialog wrapper.
  if (externalOpen !== undefined) {
    return (
      <Dialog open={externalOpen} onClose={onClose || (() => {})}>
        {formContent}
      </Dialog>
    );
  }

  // If open prop is NOT provided, we assume we are inside DataGrid's Dialog
  // We render ONLY the form content.
  return formContent;
};

export default CreateProducerDialog;