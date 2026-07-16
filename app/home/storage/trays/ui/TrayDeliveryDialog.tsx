'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import CreateBaseForm, { type BaseFormFieldGroup } from '@/app/baseComponents/BaseForm/CreateBaseForm';
import { getActiveSeason } from '@/app/actions/seasons';
import { getProducersSimpleListWithLabel } from '@/app/actions/producers';
import { getCustomersSimpleListWithLabel } from '@/app/actions/customers';
import { createTrayDelivery, type TrayMovementCounterparty } from '@/app/actions/transactions';

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

interface TrayDeliveryDialogProps {
  open: boolean;
  onClose: () => void;
  tray: Tray;
  onSuccess?: () => void;
  'data-test-id'?: string;
}

type DeliveryFormValues = {
  counterpartyType: TrayMovementCounterparty;
  producerId: string;
  clientId: string;
  amount: number;
  reason: string;
};

const initialFormValues: DeliveryFormValues = {
  counterpartyType: 'producer',
  producerId: '',
  clientId: '',
  amount: 0,
  reason: '',
};

const counterpartyOptions: SelectOption[] = [
  { id: 'producer', label: 'Productor' },
  { id: 'client', label: 'Cliente' },
];

const TrayDeliveryDialog: React.FC<TrayDeliveryDialogProps> = ({
  open,
  onClose,
  tray,
  onSuccess,
  'data-test-id': dataTestId,
}) => {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id as string | undefined;

  const [values, setValues] = useState<DeliveryFormValues>({ ...initialFormValues });
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
        console.error('[TrayDeliveryDialog] Error loading options:', err);
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
  }, [open, hasLoadedOptions]);

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
    return tray.stock - amount;
  }, [tray.stock, values.amount]);

  const deliveryFields: BaseFormFieldGroup[] = useMemo(() => {
    const counterpartyField = values.counterpartyType === 'client'
      ? {
          name: 'clientId',
          label: isLoadingOptions ? 'Cliente (cargando...)' : 'Cliente destino',
          type: 'autocomplete' as const,
          required: true,
          options: clients,
        }
      : {
          name: 'producerId',
          label: isLoadingOptions ? 'Productor (cargando...)' : 'Productor destino',
          type: 'autocomplete' as const,
          required: true,
          options: producers,
        };

    const summarySubtitle = `Stock actual: ${tray.stock} bandejas${Number.isFinite(estimatedStock) ? ` · Stock estimado: ${Math.max(estimatedStock, 0)} bandejas` : ''}`;

    return [
      {
        id: 'delivery-summary',
        title: 'Detalles de la entrega',
        subtitle: summarySubtitle,
        columns: 1,
        fields: [
          {
            name: 'counterpartyType',
            label: 'Tipo de destinatario',
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
            max: tray.stock,
            step: 1,
          },
          {
            name: 'reason',
            label: 'Motivo',
            type: 'text',
          },
        ],
      },
    ];
  }, [clients, estimatedStock, isLoadingOptions, producers, tray.stock, values.counterpartyType]);

  const handleSubmit = async () => {
    setFormErrors([]);

    if (!currentUserId) {
      setFormErrors(['Usuario no autenticado']);
      return;
    }

    const amount = Number(values.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      const message = 'La cantidad a entregar debe ser mayor a 0';
      setFormErrors([message]);
      return;
    }

    if (tray.stock <= 0) {
      const message = 'No hay stock disponible para entregar esta bandeja';
      setFormErrors([message]);
      return;
    }

    if (amount > tray.stock) {
      const message = `No puedes entregar más de ${tray.stock} bandejas disponibles`;
      setFormErrors([message]);
      return;
    }

    const counterpartyId = values.counterpartyType === 'producer' ? values.producerId : values.clientId;
    if (!counterpartyId) {
      const message = values.counterpartyType === 'producer'
        ? 'Debes seleccionar el productor destino'
        : 'Debes seleccionar el cliente destino';
      setFormErrors([message]);
      return;
    }

    setIsSubmitting(true);
    try {
      const seasonResult = await getActiveSeason();
      if (!seasonResult.success || !seasonResult.data) {
        const message = seasonResult.error || 'No se pudo obtener la temporada activa';
        setFormErrors([message]);
        return;
      }

      const seasonId = (Array.isArray(seasonResult.data)
        ? seasonResult.data[0]?.id
        : (seasonResult.data as any)?.id) as string | undefined;

      if (!seasonId) {
        const message = 'La temporada activa es inválida';
        setFormErrors([message]);
        return;
      }

      const result = await createTrayDelivery({
        trayId: tray.id,
        seasonId,
        userId: currentUserId,
        amount,
        counterpartyType: values.counterpartyType,
        counterpartyId,
        metadata: {
          reason: values.reason,
        },
      });

      if (result.success) {
        onSuccess?.();
        resetForm();
        onClose();
        return;
      }

      const message = result.error || 'Error al registrar la entrega de bandejas';
      setFormErrors([message]);
    } catch (err: any) {
      console.error('[TrayDeliveryDialog] Error submitting form:', err);
      const message = err?.message || 'Error inesperado al registrar la entrega';
      setFormErrors([message]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={`Entrega de bandejas · ${tray.name}`}
      size="md"
      data-test-id={dataTestId}
    >
      <CreateBaseForm
        fields={deliveryFields}
        values={values}
        onChange={handleChange}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Registrar entrega"
        cancelButton
        cancelButtonText="Cancelar"
        onCancel={handleClose}
        errors={formErrors}
        data-test-id={dataTestId ? `${dataTestId}-form` : 'tray-delivery-form'}
      />
    </Dialog>
  );
};

export default TrayDeliveryDialog;
