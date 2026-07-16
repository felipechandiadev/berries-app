'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import UpdateBaseForm, { BaseUpdateFormFieldGroup } from '@/app/baseComponents/BaseForm/UpdateBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { updateTray } from '@/app/actions/trays';

interface Tray {
  id: string;
  name: string;
  weight: number;
  stock: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

interface UpdateTrayDialogProps {
  open: boolean;
  onClose: () => void;
  tray: Tray;
  onSuccess?: () => void;
  'data-test-id'?: string;
}

const UpdateTrayDialog: React.FC<UpdateTrayDialogProps> = ({ open, onClose, tray, onSuccess, 'data-test-id': dataTestId }) => {
  const router = useRouter();
  const { success, error } = useAlert();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: tray.name,
    weight: tray.weight.toString(),
    active: tray.active,
  });

  const formFields: BaseUpdateFormFieldGroup[] = [
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
        {
          name: 'active',
          label: 'Estado activo',
          type: 'switch',
          required: false,
        },
      ],
    },
  ];

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    setErrors([]);

    try {
      const submitData = {
        id: tray.id,
        name: data.name,
        weight: parseFloat(data.weight),
        active: data.active,
        // NOTA: stock no se incluye porque no debe ser editable
      };

      const result = await updateTray(submitData, currentUserId);

      if (result.success) {
        success('Bandeja actualizada exitosamente');
        onClose();
        onSuccess?.();
      } else {
        error(result.error || 'Error al actualizar la bandeja');
        setErrors([result.error || 'Error desconocido']);
      }
    } catch (err: any) {
      console.error('Error updating tray:', err);
      error('Error inesperado al actualizar la bandeja');
      setErrors(['Error inesperado al actualizar la bandeja']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        name: tray.name,
        weight: tray.weight.toString(),
        active: tray.active,
      });
      setErrors([]);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Editar Bandeja"
      maxWidth="md"
      data-test-id={dataTestId || "update-tray-dialog"}
    >
      <UpdateBaseForm
        fields={formFields}
        initialState={formData}
        onSubmit={handleSubmit}
        submitLabel="Actualizar Bandeja"
        cancelButtonText="Cancelar"
        onCancel={handleClose}
        isSubmitting={isSubmitting}
        errors={errors}
        data-test-id="update-tray-form"
      />
    </Dialog>
  );
};

export default UpdateTrayDialog;