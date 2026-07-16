'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import CreateBaseForm from '@/app/baseComponents/BaseForm/CreateBaseForm';
import { useAlert } from '@/app/state/contexts/AlertContext';
import { createAdvance, getProducerBankAccounts, type AdvancePaymentMethod } from '@/app/actions/advances';
import { getProducersSimpleListWithLabel } from '@/app/actions/producers';
import { getActiveSeason } from '@/app/actions/seasons';
import { getActiveAdminBankAccounts } from '@/app/actions/adminBankAccounts';

interface CreateAdvanceButtonProps {
  onSuccess: () => void;
  onClose?: () => void;
}

const initialValues = {
  producerId: '',
  amount: '',
  paymentMethod: 'CASH' as AdvancePaymentMethod,
  bankAccountId: '',
  producerAccountId: '',
  checkNumber: '',
  transferReference: '',
  notes: '',
};

type SelectOption = { id: string; label: string };
type ProducerOption = { id: string; label: string };

const paymentMethodOptions: SelectOption[] = [
  { id: 'CASH', label: 'Efectivo' },
  { id: 'TRANSFER', label: 'Transferencia' },
  { id: 'CHECK', label: 'Cheque' },
];

function formatAdminAccountLabel(account: any): string {
  const base = `${account.bank} - ${account.accountType} - ${account.accountNumber}`;
  return account.alias ? `${base} (${account.alias})` : base;
}

export default function CreateAdvanceButton({ onSuccess, onClose }: CreateAdvanceButtonProps) {
  const { showAlert } = useAlert();
  const { data: session, status } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [values, setValues] = useState(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [producers, setProducers] = useState<ProducerOption[]>([]);
  const [activeSeason, setActiveSeason] = useState<{ id: string; name: string } | null>(null);
  const [adminAccounts, setAdminAccounts] = useState<SelectOption[]>([]);
  const [producerAccounts, setProducerAccounts] = useState<SelectOption[]>([]);
  const [isLoadingProducerAccounts, setIsLoadingProducerAccounts] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [producerList, seasonResult, adminAccountsResult] = await Promise.all([
          getProducersSimpleListWithLabel(),
          getActiveSeason(),
          getActiveAdminBankAccounts(),
        ]);

        setProducers(producerList);

        if (seasonResult.success && seasonResult.data) {
          const season = seasonResult.data as { id: string; name: string };
          setActiveSeason({ id: season.id, name: season.name });
        } else {
          showAlert({
            message: seasonResult.error || 'No se encontró una temporada activa',
            type: 'warning',
            duration: 5000,
          });
        }

        if (adminAccountsResult.success && Array.isArray(adminAccountsResult.data)) {
          const options: SelectOption[] = (adminAccountsResult.data as any[]).map(account => ({
            id: account.id,
            label: formatAdminAccountLabel(account),
          }));
          setAdminAccounts(options);
        } else {
          showAlert({
            message: adminAccountsResult.error || 'No fue posible cargar las cuentas de administración',
            type: 'warning',
            duration: 5000,
          });
        }
      } catch (error) {
        console.error('Error loading advance form data:', error);
        showAlert({
          message: 'Error al cargar datos para el anticipo',
          type: 'error',
          duration: 4000,
        });
      }
    };

    loadInitialData();
  }, [showAlert]);

  const loadProducerAccounts = useCallback(async (producerId: string) => {
    setProducerAccounts([]);
    if (!producerId) {
      return;
    }

    setIsLoadingProducerAccounts(true);
    try {
      const accounts = await getProducerBankAccounts(producerId);
      setProducerAccounts(accounts);
    } catch (error) {
      console.error('Error loading producer accounts:', error);
      showAlert({
        message: 'No fue posible obtener las cuentas del productor',
        type: 'warning',
        duration: 4000,
      });
    } finally {
      setIsLoadingProducerAccounts(false);
    }
  }, [showAlert]);

  const resetForm = useCallback(() => {
    setValues({ ...initialValues });
    setProducerAccounts([]);
  }, []);

  const handleChange = (field: string, value: any) => {
    if (field === 'producerId') {
      setValues(prev => ({
        ...prev,
        producerId: value,
        producerAccountId: '',
      }));
      loadProducerAccounts(value);
      return;
    }

    if (field === 'paymentMethod') {
      const method = value as AdvancePaymentMethod;
      setValues(prev => ({
        ...prev,
        paymentMethod: method,
        bankAccountId: method === 'CASH' ? '' : prev.bankAccountId,
        producerAccountId: method === 'TRANSFER' ? prev.producerAccountId : '',
        checkNumber: method === 'CHECK' ? prev.checkNumber : '',
        transferReference: method === 'TRANSFER' ? prev.transferReference : '',
      }));
      return;
    }

    setValues(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (status === 'loading') {
      showAlert({
        message: 'Cargando sesión de usuario. Por favor, espere un momento.',
        type: 'error',
        duration: 4000,
      });
      return;
    }

    if (!currentUserId) {
      showAlert({
        message: 'Usuario no autenticado. Por favor, inicie sesión nuevamente.',
        type: 'error',
        duration: 4000,
      });
      return;
    }

    if (!values.producerId) {
      showAlert({
        message: 'Debe seleccionar un productor',
        type: 'error',
        duration: 4000,
      });
      return;
    }

    if (!activeSeason) {
      showAlert({
        message: 'No hay una temporada activa configurada',
        type: 'error',
        duration: 4000,
      });
      return;
    }

    const amountDigits = `${values.amount ?? ''}`.replace(/[^\d]/g, '');
    const parsedAmount = amountDigits ? Number(amountDigits) : Number.NaN;
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      showAlert({
        message: 'El monto debe ser mayor a cero',
        type: 'error',
        duration: 4000,
      });
      return;
    }

    if (values.paymentMethod === 'TRANSFER') {
      if (!values.bankAccountId) {
        showAlert({
          message: 'Debe seleccionar la cuenta de la administración para la transferencia',
          type: 'error',
          duration: 4000,
        });
        return;
      }

      if (!values.producerAccountId) {
        showAlert({
          message: 'Debe seleccionar la cuenta bancaria del productor para la transferencia',
          type: 'error',
          duration: 4000,
        });
        return;
      }
    }

    if (values.paymentMethod === 'CHECK') {
      if (!values.bankAccountId) {
        showAlert({
          message: 'Debe seleccionar la cuenta de la administración que emite el cheque',
          type: 'error',
          duration: 4000,
        });
        return;
      }

      if (!values.checkNumber?.trim()) {
        showAlert({
          message: 'Debe ingresar el número de serie del cheque',
          type: 'error',
          duration: 4000,
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const paymentDetails: Record<string, string> = {};

      if (values.paymentMethod === 'TRANSFER') {
        paymentDetails.bankAccountId = values.bankAccountId;
        paymentDetails.producerAccountId = values.producerAccountId;
        if (values.transferReference?.trim()) {
          paymentDetails.transactionId = values.transferReference.trim();
        }
      }

      if (values.paymentMethod === 'CHECK') {
        paymentDetails.bankAccountId = values.bankAccountId;
        paymentDetails.checkNumber = values.checkNumber.trim();
      }

      await createAdvance({
        producerId: values.producerId,
        seasonId: activeSeason.id,
        amount: parsedAmount,
        paymentMethod: values.paymentMethod,
        paymentDetails: Object.keys(paymentDetails).length > 0 ? paymentDetails : undefined,
        notes: values.notes?.trim() ? values.notes.trim() : undefined,
        userId: currentUserId || 'current-user', // Fallback to 'current-user' if session not available
      });

      showAlert({
        message: 'Anticipo creado exitosamente',
        type: 'success',
        duration: 4000,
      });

      resetForm();
      onClose?.();
      onSuccess();
    } catch (error) {
      console.error('Error creating advance:', error);
      showAlert({
        message: error instanceof Error ? error.message : 'Error al crear el anticipo',
        type: 'error',
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formFields = useMemo(() => {
    const baseFields: any[] = [
      {
        name: 'producerId',
        label: 'Productor',
        type: 'autocomplete' as const,
        required: true,
        options: producers,
      },
      {
        name: 'amount',
        label: 'Monto (CLP)',
        type: 'currency' as const,
        required: true,
      },
      {
        name: 'paymentMethod',
        label: 'Método de Pago',
        type: 'select' as const,
        required: true,
        options: paymentMethodOptions,
      },
    ];

    if (values.paymentMethod === 'TRANSFER' || values.paymentMethod === 'CHECK') {
      baseFields.push({
        name: 'bankAccountId',
        label: 'Cuenta Administración',
        type: 'select' as const,
        required: true,
        options: adminAccounts,
      });
    }

    if (values.paymentMethod === 'TRANSFER') {
      baseFields.push(
        {
          name: 'producerAccountId',
          label: isLoadingProducerAccounts ? 'Cuentas del productor (cargando...)' : 'Cuenta Productor',
          type: 'select' as const,
          required: true,
          options: producerAccounts,
        },
        {
          name: 'transferReference',
          label: 'Referencia de Transferencia',
          type: 'text' as const,
        },
      );
    }

    if (values.paymentMethod === 'CHECK') {
      baseFields.push({
        name: 'checkNumber',
        label: 'Número de Cheque',
        type: 'text' as const,
        required: true,
      });
    }

    baseFields.push({
      name: 'notes',
      label: 'Notas',
      type: 'textarea' as const,
      rows: 3,
    });

    return baseFields;
  }, [adminAccounts, producerAccounts, producers, values.paymentMethod, isLoadingProducerAccounts]);

  return (
    <div className="space-y-4">
      <CreateBaseForm
        title=""
        fields={formFields}
        values={values}
        onChange={handleChange}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Crear"
        cancelButton={Boolean(onClose)}
        onCancel={() => {
          resetForm();
          onClose?.();
        }}
      />
    </div>
  );
}
