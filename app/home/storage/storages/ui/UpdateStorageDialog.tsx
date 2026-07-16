'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import UpdateBaseForm, { BaseUpdateFormField } from '@/app/baseComponents/BaseForm/UpdateBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { Storage } from '@/data/entities/Storage';
import { updateStorage } from '@/app/actions/storages';

interface UpdateStorageDialogProps {
  open: boolean;
  onClose: () => void;
  storage: Storage;
  'data-test-id'?: string;
}

const UpdateStorageDialog: React.FC<UpdateStorageDialogProps> = ({ open, onClose, storage, 'data-test-id': dataTestId }) => {
  const router = useRouter();
  const { success, error } = useAlert();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formFields: BaseUpdateFormField[] = [
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

  const initialState = {
    id: storage.id,
    name: storage.name,
    capacityPallets: storage.capacityPallets ?? '',
    location: storage.location || '',
    active: storage.active,
  };

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);

    const rawCapacity = values.capacityPallets;
    const capacityValue = rawCapacity === '' || rawCapacity === null || rawCapacity === undefined
      ? undefined
      : Number(rawCapacity);

    if (capacityValue !== undefined && (Number.isNaN(capacityValue) || capacityValue < 0 || !Number.isInteger(capacityValue))) {
      error('La capacidad debe ser un número entero positivo');
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await updateStorage({
        id: storage.id,
        name: values.name,
        capacityPallets: capacityValue,
        location: values.location || undefined,
        active: values.active,
      }, currentUserId);

      if (result.success) {
        success(result.message || 'Almacenamiento actualizado exitosamente');
        onClose();
        // Refresh the page to show the updated storage
        router.refresh();
      } else {
        error(result.error || 'Error al actualizar el almacenamiento');
      }
    } catch (err: any) {
      error('Error inesperado al actualizar el almacenamiento');
      console.error('Update storage error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Editar Almacenamiento"
      maxWidth="md"
      data-test-id={dataTestId}
    >
      <UpdateBaseForm
        fields={formFields}
        initialState={initialState}
        onSubmit={handleSubmit}
        submitLabel="Actualizar Almacenamiento"
        isSubmitting={isSubmitting}
      />
    </Dialog>
  );
};

export default UpdateStorageDialog;