'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import CreateBaseForm, { BaseFormFieldGroup } from '@/app/baseComponents/BaseForm/CreateBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { createAdminBankAccount } from '@/app/actions/adminBankAccounts';
import { AccountTypeName, BankName } from '@/data/entities/AdminBankAccount';

interface CreateBankAccountDialogProps {
  open: boolean;
  onClose: () => void;
  'data-test-id'?: string;
}

const CreateBankAccountDialog: React.FC<CreateBankAccountDialogProps> = ({ open, onClose, 'data-test-id': dataTestId }) => {
  const router = useRouter();
  const { success, error } = useAlert();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    accountType: AccountTypeName.CUENTA_CORRIENTE,
    bank: BankName.BANCO_CHILE,
    accountNumber: '',
    alias: '',
    isActive: true,
  });

  const accountTypeOptions = Object.values(AccountTypeName).map(type => ({
    id: type,
    label: type,
  }));

  const bankOptions = Object.values(BankName).map(bank => ({
    id: bank,
    label: bank,
  }));

  const formFields: BaseFormFieldGroup[] = [
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
      const result = await createAdminBankAccount({
        accountType: formData.accountType,
        bank: formData.bank,
        accountNumber: formData.accountNumber,
        alias: formData.alias || undefined,
        isActive: formData.isActive,
      });

      if (result.success) {
        success(result.message || 'Cuenta bancaria creada exitosamente');
        onClose();
        setFormData({
          accountType: AccountTypeName.CUENTA_CORRIENTE,
          bank: BankName.BANCO_CHILE,
          accountNumber: '',
          alias: '',
          isActive: true,
        });
      } else {
        error(result.error || 'Error al crear la cuenta bancaria');
        if (result.error) {
          setErrors([result.error]);
        }
      }
    } catch (err: any) {
      console.error('Error creating bank account:', err);
      error('Error inesperado al crear la cuenta bancaria');
      setErrors(['Error inesperado al crear la cuenta bancaria']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setErrors([]);
      setFormData({
        accountType: AccountTypeName.CUENTA_CORRIENTE,
        bank: BankName.BANCO_CHILE,
        accountNumber: '',
        alias: '',
        isActive: true,
      });
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Crear Nueva Cuenta Bancaria"
      maxWidth="md"
      data-test-id={dataTestId}
    >
      <CreateBaseForm
        fields={formFields}
        values={formData}
        onChange={handleChange}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Crear Cuenta Bancaria"
        cancelButtonText="Cancelar"
        onCancel={handleClose}
        errors={errors}
        data-test-id={`${dataTestId}-form`}
      />
    </Dialog>
  );
};

export default CreateBankAccountDialog;