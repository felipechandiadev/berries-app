'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import DeleteBaseForm from '@/app/baseComponents/BaseForm/DeleteBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { deleteAdminBankAccount } from '@/app/actions/adminBankAccounts';

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

interface DeleteBankAccountDialogProps {
  open: boolean;
  onClose: () => void;
  bankAccount: BankAccount;
  'data-test-id'?: string;
}

const DeleteBankAccountDialog: React.FC<DeleteBankAccountDialogProps> = ({ open, onClose, bankAccount, 'data-test-id': dataTestId }) => {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { success, error } = useAlert();

  const handleSubmit = async () => {
    if (!bankAccount?.id) {
      setErrors(['Cuenta bancaria no identificada']);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      const result = await deleteAdminBankAccount(bankAccount.id);

      if (result?.success) {
        success(result.message || 'Cuenta bancaria eliminada exitosamente');
        onClose();
      } else {
        error(result.error || 'Error al eliminar la cuenta bancaria');
        if (result.error) {
          setErrors([result.error]);
        }
      }
    } catch (err: any) {
      console.error('Error deleting bank account:', err);
      error('Error inesperado al eliminar la cuenta bancaria');
      setErrors(['Error inesperado al eliminar la cuenta bancaria']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setErrors([]);
      onClose();
    }
  };

  const getDeleteMessage = () => {
    const accountDisplay = bankAccount.alias
      ? `${bankAccount.alias} (${bankAccount.accountNumber})`
      : bankAccount.accountNumber;
    return `¿Estás seguro de que deseas eliminar la cuenta bancaria "${accountDisplay}" del banco "${bankAccount.bank}"? Esta acción no se puede deshacer.`;
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title=""
      size="xs"
      data-test-id={dataTestId}
    >
      <DeleteBaseForm
        message={getDeleteMessage()}
        onSubmit={handleSubmit}
        onCancel={handleClose}
        isSubmitting={isSubmitting}
        errors={errors}
        submitLabel="Eliminar"
        cancelButton={true}
        title="Eliminar Cuenta Bancaria"
        cancelButtonText="Cancelar"
        data-test-id={`${dataTestId}-form`}
      />
    </Dialog>
  );
};

export default DeleteBankAccountDialog;