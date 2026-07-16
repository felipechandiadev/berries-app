"use client";

import { useEffect, useState } from 'react';
import CreateBaseForm, { type BaseFormField } from '@/app/baseComponents/BaseForm/CreateBaseForm';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { useAlert } from '@/app/state/contexts/AlertContext';
import { createPallet, type CreatePalletInput } from '@/app/actions/pallets';
import { getStorages } from '@/app/actions/storages';
import { PalletStatus } from '@/data/entities/Pallet';
import { getPalletStatusLabel } from '../../../../storage/pallets/ui/PalletStatusBadge';

interface CreatePalletDialogProps {
  open: boolean;
  onClose: () => void;
  trayId: string;
  onSuccess: () => void;
}

interface SelectOption {
  id: string;
  label: string;
}

export default function CreatePalletDialog({ open, onClose, trayId, onSuccess }: CreatePalletDialogProps) {
  const { showAlert } = useAlert();
  const [storageOptions, setStorageOptions] = useState<SelectOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [values, setValues] = useState({
    storageId: '',
    capacity: '240',
    weight: '0',
  });

  useEffect(() => {
    if (open) {
      const loadReferenceData = async () => {
        try {
          const storagesResult = await getStorages({ active: true });

          if (storagesResult.success && Array.isArray(storagesResult.data)) {
            setStorageOptions(
              storagesResult.data.map((storage: any) => ({
                id: storage.id,
                label: storage.name,
              }))
            );
          }
        } catch (error) {
          console.error('[CreatePalletDialog] Error loading reference data:', error);
        }
      };

      loadReferenceData();
    }
  }, [open]);

  const handleChange = (field: string, value: any) => {
    setValues((prev) => ({
      ...prev,
      [field]: String(value ?? ''),
    }));
  };

  const handleSubmit = async () => {
    const validationErrors: string[] = [];

    if (!values.storageId) {
      validationErrors.push('Debe seleccionar un almacenamiento');
    }

    if (!values.capacity || Number(values.capacity) <= 0) {
      validationErrors.push('La capacidad debe ser mayor a 0');
    }

    if (values.weight === '' || Number(values.weight) < 0) {
      validationErrors.push('El peso inicial debe ser mayor o igual a 0');
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    const payload: CreatePalletInput = {
      storageId: values.storageId,
      trayId,
      capacity: Number(values.capacity),
      weight: Number(values.weight),
      dispatchWeight: 0,
      status: PalletStatus.AVAILABLE,
      traysQuantity: 0,
    };

    try {
      const result = await createPallet(payload);

      if (result.success) {
        showAlert({ message: `Pallet creado exitosamente (${getPalletStatusLabel(PalletStatus.AVAILABLE)})`, type: 'success', duration: 4000 });
        setValues({
          storageId: '',
          capacity: '240',
          weight: '0',
        });
        onClose();
        onSuccess();
      } else {
        const errorMessage = result.error || 'Error al crear el pallet';
        showAlert({ message: errorMessage, type: 'error', duration: 5000 });
        setErrors([errorMessage]);
      }
    } catch (error) {
      console.error('[CreatePalletDialog] Error creando pallet:', error);
      const errorMessage = 'Error inesperado al crear el pallet';
      showAlert({ message: errorMessage, type: 'error', duration: 5000 });
      setErrors([errorMessage]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fields: BaseFormField[] = [
    {
      name: 'storageId',
      label: 'Almacenamiento',
      type: 'select',
      required: true,
      options: storageOptions,
    },
    {
      name: 'capacity',
      label: 'Capacidad (bandejas)',
      type: 'number',
      required: true,
      min: 1,
    },
    {
      name: 'weight',
      label: 'Peso inicial (kg)',
      type: 'number',
      required: true,
      min: 0,
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Crear Pallet"
      size="sm"
      showCloseButton
    >
      <CreateBaseForm
        fields={fields}
        values={values}
        onChange={handleChange}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Crear Pallet"
        cancelButton
        cancelButtonText="Cancelar"
        onCancel={onClose}
        errors={errors}
      />
    </Dialog>
  );
}