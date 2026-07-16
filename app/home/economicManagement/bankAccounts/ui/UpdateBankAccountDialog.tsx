'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import UpdateBaseForm, { BaseUpdateFormFieldGroup } from '@/app/baseComponents/BaseForm/UpdateBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { updateAdminBankAccount } from '@/app/actions/adminBankAccounts';
import { AccountTypeName, BankName } from '@/data/entities/AdminBankAccount';

interface BankAccount {
  id: string;
  accountType: string;
  bank: string;
  accountNumber: string;
  alias?: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
}

interface UpdateBankAccountDialogProps {
  open: boolean;
  onClose: () => void;
  bankAccount: BankAccount;
  'data-test-id'?: string;
}

const UpdateBankAccountDialog: React.FC<UpdateBankAccountDialogProps> = ({ open, onClose, bankAccount, 'data-test-id': dataTestId }) => {
  const router = useRouter();
  const { success, error } = useAlert();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    accountType: bankAccount.accountType as AccountTypeName,
    bank: bankAccount.bank as BankName,
    accountNumber: bankAccount.accountNumber,
    alias: bankAccount.alias || '',
    isActive: bankAccount.isActive,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        accountType: bankAccount.accountType as AccountTypeName,
        bank: bankAccount.bank as BankName,
        accountNumber: bankAccount.accountNumber,
        alias: bankAccount.alias || '',
        isActive: bankAccount.isActive,
      });
    }
  }, [open, bankAccount]);

  const accountTypeOptions = Object.values(AccountTypeName).map(type => ({
    id: type,
    label: type,
  }));

  const bankOptions = Object.values(BankName).map(bank => ({
    id: bank,
    label: bank,
  }));

  const formFields: BaseUpdateFormFieldGroup[] = [
    {
      id: 'bank-account-info',
      title: 'Información de la Cuenta Bancaria',
      columns: 1,
      fields: [
        {
          name: 'bank',
          label: 'Banco',
          type: 'select',
          required: true,
          options: bankOptions,
        },
        {
          name: 'accountType',
          label: 'Tipo de Cuenta',
          type: 'select',
          required: true,
          options: accountTypeOptions,
        },
        {
          name: 'accountNumber',
          label: 'Número de Cuenta',
          type: 'text',
          required: true,
        },
        {
          name: 'alias',
          label: 'Alias (opcional)',
          type: 'text',
          required: false,
        },
        {
          name: 'isActive',
          label: 'Cuenta Activa',
          type: 'switch',
          required: false,
        },
      ],
    },
  ];

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrors([]);

    try {
      const result = await updateAdminBankAccount({
        id: bankAccount.id,
        accountType: formData.accountType,
        bank: formData.bank,
        accountNumber: formData.accountNumber,
        alias: formData.alias || undefined,
        isActive: formData.isActive,
      });

      if (result.success) {
        success(result.message || 'Cuenta bancaria actualizada exitosamente');
        onClose();
      } else {
        error(result.error || 'Error al actualizar la cuenta bancaria');
        if (result.error) {
          setErrors([result.error]);
        }
      }
    } catch (err: any) {
      console.error('Error updating bank account:', err);
      error('Error inesperado al actualizar la cuenta bancaria');
      setErrors(['Error inesperado al actualizar la cuenta bancaria']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setErrors([]);
      // Reset form data to original bank account data
      setFormData({
        accountType: bankAccount.accountType as AccountTypeName,
        bank: bankAccount.bank as BankName,
        accountNumber: bankAccount.accountNumber,
        alias: bankAccount.alias || '',
        isActive: bankAccount.isActive,
      });
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Editar Cuenta Bancaria"
      maxWidth="md"
      data-test-id={dataTestId}
    >
      <UpdateBaseForm
        fields={formFields}
        initialState={formData}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Actualizar Cuenta Bancaria"
        cancelButtonText="Cancelar"
        onCancel={handleClose}
        errors={errors}
        data-test-id={`${dataTestId}-form`}
      />
    </Dialog>
  );
};

export default UpdateBankAccountDialog;