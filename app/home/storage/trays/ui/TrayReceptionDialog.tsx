'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import CreateBaseForm, { type BaseFormFieldGroup } from '@/app/baseComponents/BaseForm/CreateBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { getActiveSeason } from '@/app/actions/seasons';
import { getProducersSimpleListWithLabel } from '@/app/actions/producers';
import { getCustomersSimpleListWithLabel } from '@/app/actions/customers';
import { createTrayReception, type TrayMovementCounterparty } from '@/app/actions/transactions';

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

interface SelectOption {
  id: string;
  label: string;
}

interface TrayReceptionDialogProps {
  open: boolean;
  onClose: () => void;
  tray: Tray;
  onSuccess?: () => void;
  'data-test-id'?: string;
}

type ReceptionFormValues = {
  counterpartyType: TrayMovementCounterparty;
  producerId: string;
  clientId: string;
  amount: number;
  reason: string;
  notes: string;
  driver: string;
};

const initialFormValues: ReceptionFormValues = {
  counterpartyType: 'producer',
  producerId: '',
  clientId: '',
  amount: 0,
  reason: '',
  notes: '',
  driver: '',
};

const counterpartyOptions: SelectOption[] = [
  { id: 'producer', label: 'Productor' },
  { id: 'client', label: 'Cliente' },
];

const TrayReceptionDialog: React.FC<TrayReceptionDialogProps> = ({
  open,
  onClose,
  tray,
  onSuccess,
  'data-test-id': dataTestId,
}) => {
  const { success, error } = useAlert();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id as string | undefined;

  const [values, setValues] = useState<ReceptionFormValues>({ ...initialFormValues });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [hasLoadedOptions, setHasLoadedOptions] = useState(false);
  const [producers, setProducers] = useState<SelectOption[]>([]);
  const [clients, setClients] = useState<SelectOption[]>([]);

  useEffect(() => {
    if (!open || hasLoadedOptions) {
      return;
    }

    let isMounted = true;
    setIsLoadingOptions(true);

    const loadOptions = async () => {
      try {
        const [producerList, clientList] = await Promise.all([
          getProducersSimpleListWithLabel(),
          getCustomersSimpleListWithLabel(),
        ]);

        if (!isMounted) {
          return;
        }

        setProducers(producerList);
        setClients(clientList);
        setHasLoadedOptions(true);
      } catch (err) {
        console.error('[TrayReceptionDialog] Error loading options:', err);
        if (isMounted) {
          error('No fue posible cargar productores o clientes');
        }
      } finally {
        if (isMounted) {
          setIsLoadingOptions(false);
        }
      }
    };

    void loadOptions();

    return () => {
      isMounted = false;
    };
  }, [open, hasLoadedOptions, error]);

  const handleChange = (field: string, value: any) => {
    setValues(prev => {
      if (field === 'counterpartyType') {
        const nextType = value as TrayMovementCounterparty;
        return {
          ...prev,
          counterpartyType: nextType,
          producerId: nextType === 'producer' ? prev.producerId : '',
          clientId: nextType === 'client' ? prev.clientId : '',
        };
      }

      return {
        ...prev,
        [field]: value,
      };
    });
  };

  const resetForm = () => {
    setValues({ ...initialFormValues });
    setFormErrors([]);
  };

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }
    resetForm();
    onClose();
  };

  const estimatedStock = useMemo(() => {
    const amount = Number(values.amount);
    if (!Number.isFinite(amount)) {
      return tray.stock;
    }
    return tray.stock + amount;
  }, [tray.stock, values.amount]);

  const receptionFields: BaseFormFieldGroup[] = useMemo(() => {
    const counterpartyField = values.counterpartyType === 'client'
      ? {
          name: 'clientId',
          label: isLoadingOptions ? 'Cliente (cargando...)' : 'Cliente de origen',
          type: 'autocomplete' as const,
          required: true,
          options: clients,
        }
      : {
          name: 'producerId',
          label: isLoadingOptions ? 'Productor (cargando...)' : 'Productor de origen',
          type: 'autocomplete' as const,
          required: true,
          options: producers,
        };

    const summarySubtitle = `Stock actual: ${tray.stock} bandejas${Number.isFinite(estimatedStock) ? ` · Stock estimado: ${estimatedStock} bandejas` : ''}`;

    return [
      {
        id: 'reception-summary',
        title: 'Detalles de la recepción',
        subtitle: summarySubtitle,
        columns: 1,
        fields: [
          {
            name: 'counterpartyType',
            label: 'Tipo de origen',
            type: 'select',
            required: true,
            options: counterpartyOptions,
          },
          counterpartyField,
          {
            name: 'amount',
            label: 'Cantidad de bandejas',
            type: 'numberStepper',
            required: true,
            min: 0,
            step: 1,
          },
          {
            name: 'reason',
            label: 'Motivo',
            type: 'text',
          },
          {
            name: 'driver',
            label: 'Entregado por',
            type: 'text',
          },
        ],
      },
    ];
  }, [clients, estimatedStock, isLoadingOptions, producers, tray.stock, values.counterpartyType]);

  const handleSubmit = async () => {
    setFormErrors([]);

    if (!currentUserId) {
      error('Usuario no autenticado');
      return;
    }

    const amount = Number(values.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      const message = 'La cantidad a recibir debe ser mayor a 0';
      setFormErrors([message]);
      error(message);
      return;
    }

    const counterpartyId = values.counterpartyType === 'producer' ? values.producerId : values.clientId;
    if (!counterpartyId) {
      const message = values.counterpartyType === 'producer'
        ? 'Debes seleccionar el productor de origen'
        : 'Debes seleccionar el cliente de origen';
      setFormErrors([message]);
      error(message);
      return;
    }

    setIsSubmitting(true);
    try {
      const seasonResult = await getActiveSeason();
      if (!seasonResult.success || !seasonResult.data) {
        const message = seasonResult.error || 'No se pudo obtener la temporada activa';
        error(message);
        setFormErrors([message]);
        return;
      }

      const seasonId = (Array.isArray(seasonResult.data)
        ? seasonResult.data[0]?.id
        : (seasonResult.data as any)?.id) as string | undefined;

      if (!seasonId) {
        const message = 'La temporada activa es inválida';
        error(message);
        setFormErrors([message]);
        return;
      }

      const result = await createTrayReception({
        trayId: tray.id,
        seasonId,
        userId: currentUserId,
        amount,
        counterpartyType: values.counterpartyType,
        counterpartyId,
        metadata: {
          reason: values.reason,
          notes: values.notes,
          driver: values.driver,
        },
      });

      if (result.success) {
        success('Recepción de bandejas registrada correctamente');
        onSuccess?.();
        resetForm();
        onClose();
        return;
      }

      const message = result.error || 'Error al registrar la recepción de bandejas';
      error(message);
      setFormErrors([message]);
    } catch (err: any) {
      console.error('[TrayReceptionDialog] Error submitting form:', err);
      const message = err?.message || 'Error inesperado al registrar la recepción';
      error(message);
      setFormErrors([message]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={`Recepción de bandejas · ${tray.name}`}
      size="md"
      data-test-id={dataTestId}
    >
      <CreateBaseForm
        fields={receptionFields}
        values={values}
        onChange={handleChange}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Registrar recepción"
        cancelButton
        cancelButtonText="Cancelar"
        onCancel={handleClose}
        errors={formErrors}
        data-test-id={dataTestId ? `${dataTestId}-form` : 'tray-reception-form'}
      />
    </Dialog>
  );
};

export default TrayReceptionDialog;
