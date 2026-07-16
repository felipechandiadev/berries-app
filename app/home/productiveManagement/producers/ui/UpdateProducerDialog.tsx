'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import UpdateBaseForm, { BaseUpdateFormFieldGroup } from '@/app/baseComponents/BaseForm/UpdateBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { updateProducer } from '@/app/actions/producers';
import { getProductiveUnitsForSelect } from '@/app/actions/productiveUnits';
import type { ProducerGridData } from '@/app/actions/producers';

interface UpdateProducerDialogProps {
  open: boolean;
  onClose: () => void;
  producer: ProducerGridData | null;
  onSuccess?: () => void;
}

const UpdateProducerDialog: React.FC<UpdateProducerDialogProps> = ({ open, onClose, producer, onSuccess }) => {
  const router = useRouter();
  const { success, error: showError } = useAlert();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productiveUnits, setProductiveUnits] = useState<{ id: string; label: string }[]>([]);

  // Cargar unidades productivas
  useEffect(() => {
    const loadProductiveUnits = async () => {
      const units = await getProductiveUnitsForSelect();
      setProductiveUnits(units);
    };
    loadProductiveUnits();
  }, []);

  // Definir estructura del formulario
  const formFields: BaseUpdateFormFieldGroup[] = [
    {
      id: 'producer-info',
      columns: 1,
      fields: [
        {
          name: 'name',
          label: 'Nombre completo',
          type: 'text' as const,
          required: true,
          startIcon: 'person'
        },
        {
          name: 'dni',
          label: 'RUT',
          type: 'dni' as const,
          required: true,
          startIcon: 'badge'
        },
        {
          name: 'productiveUnitId',
          label: 'Unidad Productiva',
          type: 'autocomplete' as const,
          options: productiveUnits,
          startIcon: 'agriculture'
        },
        {
          name: 'mail',
          label: 'Correo electrónico',
          type: 'email' as const,
          startIcon: 'mail'
        },
        {
          name: 'phone',
          label: 'Teléfono',
          type: 'text' as const,
          startIcon: 'phone'
        },
        {
          name: 'address',
          label: 'Dirección',
          type: 'text' as const,
          startIcon: 'location_on'
        }
      ]
    }
  ];

  const handleSubmit = async (values: Record<string, any>) => {
    if (!producer?.id) {
      showError('Productor no identificado');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateProducer({
        id: producer.id,
        name: values.name,
        dni: values.dni,
        mail: values.mail,
        phone: values.phone,
        address: values.address,
        productiveUnitId: values.productiveUnitId || null,
      }, currentUserId);

      if (result.success) {
        success('Productor actualizado exitosamente');

        // Cerrar el dialog después de 500ms y hacer refresh
        setTimeout(() => {
          onClose();
          onSuccess?.();
          router.refresh();
          setIsSubmitting(false);
        }, 500);
      } else {
        const errorMessage = result.error || 'Error al actualizar el productor';
        showError(errorMessage);
        setIsSubmitting(false);
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Error desconocido';
      showError(errorMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      {producer ? (
        <UpdateBaseForm
          fields={formFields}
          initialState={{
            name: producer.name || '',
            dni: producer.dni || '',
            productiveUnitId: producer.productiveUnitId || '',
            mail: producer.mail || '',
            phone: producer.phone || '',
            address: producer.address || '',
          }}
          onSubmit={handleSubmit}
          title='Editar Productor'
          subtitle='Actualiza la información del productor'
          submitLabel="Actualizar Productor"
          isSubmitting={isSubmitting}
          cancelButton={true}
          cancelButtonText="Cancelar"
          onCancel={onClose}
        />
      ) : (
        <div className="text-center py-8 text-gray-500">
          No hay datos del productor para mostrar
        </div>
      )}
    </Dialog>
  );
};

export default UpdateProducerDialog;