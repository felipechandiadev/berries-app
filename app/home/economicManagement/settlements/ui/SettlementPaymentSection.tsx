'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAlert } from '@/app/state/contexts/AlertContext';
import { getProducerBankAccounts, type AdvancePaymentMethod } from '@/app/actions/advances';
import { getActiveAdminBankAccounts } from '@/app/actions/adminBankAccounts';
import Select from '@/app/baseComponents/Select/Select';
import { TextField } from '@/app/baseComponents/TextField/TextField';

interface SettlementPaymentSectionProps {
  selectedProducerId?: string;
  onPaymentChange: (paymentData: PaymentData) => void;
  initialPaymentData?: Partial<PaymentData>;
}

export interface PaymentData {
  paymentMethod: AdvancePaymentMethod;
  bankAccountId: string;
  producerAccountId: string;
  checkNumber: string;
  transferReference: string;
}

const initialValues: PaymentData = {
  paymentMethod: 'CASH',
  bankAccountId: '',
  producerAccountId: '',
  checkNumber: '',
  transferReference: '',
};

type SelectOption = { id: string; label: string };

const paymentMethodOptions: SelectOption[] = [
  { id: 'CASH', label: 'Efectivo' },
  { id: 'TRANSFER', label: 'Transferencia' },
  { id: 'CHECK', label: 'Cheque' },
];

function formatAdminAccountLabel(account: any): string {
  const base = `${account.bank} - ${account.accountType} - ${account.accountNumber}`;
  return account.alias ? `${base} (${account.alias})` : base;
}

export default function SettlementPaymentSection({
  selectedProducerId,
  onPaymentChange,
  initialPaymentData,
}: SettlementPaymentSectionProps) {
  const { showAlert } = useAlert();
  const [values, setValues] = useState<PaymentData>({
    ...initialValues,
    ...initialPaymentData,
  });
  const [adminAccounts, setAdminAccounts] = useState<SelectOption[]>([]);
  const [producerAccounts, setProducerAccounts] = useState<SelectOption[]>([]);
  const [isLoadingProducerAccounts, setIsLoadingProducerAccounts] = useState(false);

  useEffect(() => {
    const loadAdminAccounts = async () => {
      try {
        const adminAccountsResult = await getActiveAdminBankAccounts();
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
        console.error('Error loading admin accounts:', error);
        showAlert({
          message: 'Error al cargar cuentas de administración',
          type: 'error',
          duration: 4000,
        });
      }
    };

    loadAdminAccounts();
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

  useEffect(() => {
    if (selectedProducerId) {
      loadProducerAccounts(selectedProducerId);
    }
  }, [selectedProducerId, loadProducerAccounts]);

  const handleChange = (field: keyof PaymentData, value: string) => {
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

  useEffect(() => {
    onPaymentChange(values);
  }, [values, onPaymentChange]);

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-primary">Datos de Pago</h2>
      </div>

      <div className="rounded-lg border border-border bg-background px-6 py-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Método de Pago"
            value={values.paymentMethod}
            onChange={(value) => handleChange('paymentMethod', value as string)}
            options={paymentMethodOptions}
            required
          />

        {(values.paymentMethod === 'TRANSFER' || values.paymentMethod === 'CHECK') && (
          <Select
            label="Cuenta Administración"
            value={values.bankAccountId}
            onChange={(value) => handleChange('bankAccountId', value as string)}
            options={adminAccounts}
            required
          />
        )}

        {values.paymentMethod === 'TRANSFER' && (
          <>
            <Select
              label={isLoadingProducerAccounts ? 'Cuentas del productor (cargando...)' : 'Cuenta Productor'}
              value={values.producerAccountId}
              onChange={(value) => handleChange('producerAccountId', value as string)}
              options={producerAccounts}
              required
            />
            <TextField
              label="Referencia de Transferencia"
              value={values.transferReference}
              onChange={(e) => handleChange('transferReference', e.target.value)}
            />
          </>
        )}

        {values.paymentMethod === 'CHECK' && (
          <TextField
            label="Número de Cheque"
            value={values.checkNumber}
            onChange={(e) => handleChange('checkNumber', e.target.value)}
            required
          />
        )}
      </div>
    </div>
    </section>
  );
}