'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import UpdateBaseForm, { BaseUpdateFormFieldGroup } from '@/app/baseComponents/BaseForm/UpdateBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { updateProductiveUnit } from '@/app/actions/productiveUnits';
import type { ProductiveUnitGridData } from '@/app/actions/productiveUnits';

interface UpdateProductiveUnitDialogProps {
  open: boolean;
  onClose: () => void;
  productiveUnit: ProductiveUnitGridData | null;
  onSuccess?: () => void;
}

const UpdateProductiveUnitDialog: React.FC<UpdateProductiveUnitDialogProps> = ({
  open,
  onClose,
  productiveUnit,
  onSuccess,
}) => {
  const router = useRouter();
  const { success, error: showError } = useAlert();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields definition - solo nombre y ubicación
  const formFields: BaseUpdateFormFieldGroup[] = [
    {
      id: 'unit-info',
      columns: 1,
      fields: [
        {
          name: 'name',
          label: 'Nombre',
          type: 'text' as const,
          required: true,
          startIcon: 'agriculture',
        },
        {
          name: 'location',
          label: 'Ubicación / Dirección',
          type: 'text' as const,
          startIcon: 'location_on',
        },
      ],
    },
  ];

  // Initial values from productiveUnit
  const initialState = productiveUnit
    ? {
        name: productiveUnit.name || '',
        location: productiveUnit.location || '',
      }
    : {
        name: '',
        location: '',
      };

  const handleSubmit = async (values: Record<string, any>) => {
    if (!productiveUnit?.id) {
      showError('Unidad productiva no identificada');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateProductiveUnit({
        id: productiveUnit.id,
        name: values.name,
        location: values.location || undefined,
      });

      if (result.success) {
        success('Unidad productiva actualizada exitosamente');

        setTimeout(() => {
          onClose();
          onSuccess?.();
          router.refresh();
          setIsSubmitting(false);
        }, 500);
      } else {
        showError(result.error || 'Error al actualizar la unidad productiva');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      showError(err?.message || 'Error desconocido');
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Editar Unidad Productiva">
      {productiveUnit ? (
        <UpdateBaseForm
          fields={formFields}
          initialState={initialState}
          onSubmit={handleSubmit}
          submitLabel="Actualizar"
          isSubmitting={isSubmitting}
        />
      ) : (
        <div className="text-center py-8 text-gray-500">
          No hay datos para mostrar
        </div>
      )}
    </Dialog>
  );
};

export default UpdateProductiveUnitDialog;
