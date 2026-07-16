"use client";

import { useEffect, useState } from 'react';
import CreateBaseForm, { type BaseFormField } from '@/app/baseComponents/BaseForm/CreateBaseForm';
import { useAlert } from '@/app/state/contexts/AlertContext';
import { createPallet, type CreatePalletInput } from '@/app/actions/pallets';
import { getStorages } from '@/app/actions/storages';
import { getTraysSimpleList } from '@/app/actions/trays';
import { PalletStatus } from '@/data/entities/Pallet';
import { getPalletStatusLabel } from './PalletStatusBadge';

interface CreatePalletButtonProps {
  onSuccess: () => void;
  onClose?: () => void;
}

interface SelectOption {
  id: string;
  label: string;
}

export default function CreatePalletButton({ onSuccess, onClose }: CreatePalletButtonProps) {
  const { showAlert } = useAlert();
  const [storageOptions, setStorageOptions] = useState<SelectOption[]>([]);
  const [trayOptions, setTrayOptions] = useState<SelectOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [values, setValues] = useState({
    storageId: '',
    trayId: '',
    capacity: '240',
    weight: '0',
  });

  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        const [storagesResult, traysResult] = await Promise.all([
          getStorages({ active: true }),
          getTraysSimpleList(),
        ]);

        if (storagesResult.success && Array.isArray(storagesResult.data)) {
          setStorageOptions(
            storagesResult.data.map((storage: any) => ({
              id: storage.id,
              label: storage.name,
            }))
          );
        }

        setTrayOptions(
          Array.isArray(traysResult)
            ? traysResult.map((tray) => ({ id: tray.id, label: tray.label }))
            : []
        );
      } catch (error) {
        console.error('[CreatePalletButton] Error cargando referencias:', error);
        showAlert({ message: 'No se pudieron cargar los datos de referencia', type: 'error', duration: 5000 });
      }
    };

    loadReferenceData();
  }, [showAlert]);

  const handleChange = (field: string, value: any) => {
    setValues((prev) => ({
      ...prev,
      [field]: String(value ?? ''),
    }));
  };

  const validate = (currentValues: typeof values): string[] => {
    const validationErrors: string[] = [];

    if (!currentValues.storageId) {
      validationErrors.push('Debes seleccionar un almacenamiento.');
    }

    if (!currentValues.trayId) {
      validationErrors.push('Debes seleccionar una bandeja.');
    }

    const capacity = Number(currentValues.capacity);
    if (Number.isNaN(capacity) || capacity <= 0) {
      validationErrors.push('La capacidad debe ser un número mayor a 0.');
    }

    const weight = Number(currentValues.weight);
    if (Number.isNaN(weight) || weight < 0) {
      validationErrors.push('El peso inicial debe ser un número positivo.');
    }

    return validationErrors;
  };

  const handleSubmit = async () => {
    const validationErrors = validate(values);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    const payload: CreatePalletInput = {
      storageId: values.storageId,
      trayId: values.trayId,
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
          trayId: '',
          capacity: '240',
          weight: '0',
        });
        onClose?.();
        onSuccess();
      } else {
        const errorMessage = result.error || 'Error al crear el pallet';
        showAlert({ message: errorMessage, type: 'error', duration: 5000 });
        setErrors([errorMessage]);
      }
    } catch (error) {
      console.error('[CreatePalletButton] Error creando pallet:', error);
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
      name: 'trayId',
      label: 'Bandeja',
      type: 'select',
      required: true,
      options: trayOptions,
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
  );
}
