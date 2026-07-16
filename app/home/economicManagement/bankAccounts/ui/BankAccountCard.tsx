'use client';
import React, { useState } from 'react';
import Badge from '@/app/baseComponents/Badge/Badge';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import DeleteBankAccountDialog from './DeleteBankAccountDialog';
import UpdateBankAccountDialog from './UpdateBankAccountDialog';
import { usePermissions } from '@/app/state/hooks/usePermissions';

export interface BankAccountCardProps {
  bankAccount: {
    id: string;
    accountType: string;
    bank: string;
    accountNumber: string;
    alias?: string;
    isActive: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
    deletedAt?: Date | string | null;
  };
  'data-test-id'?: string;
}

const BankAccountCard: React.FC<BankAccountCardProps> = ({ bankAccount, 'data-test-id': dataTestId }) => {
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openUpdateDialog, setOpenUpdateDialog] = useState(false);
  const { has } = usePermissions();

  const formatAccountNumber = (accountNumber: string) => {
    // Format account number with spaces for readability
    return accountNumber.replace(/(.{4})/g, '$1 ').trim();
  };

  const getStatusBadgeVariant = (isActive: boolean): 'success' | 'error' => {
    return isActive ? 'success' : 'error';
  };

  const getStatusLabel = (isActive: boolean): string => {
    return isActive ? 'Activa' : 'Inactiva';
  };

  return (
    <article className="border border-neutral-200 bg-white rounded-lg shadow-sm p-4 flex flex-col justify-between min-w-[260px]" data-test-id={dataTestId}>
      {/* Información principal */}
      <div className="flex flex-col gap-2 w-full overflow-hidden mb-2">
        <h3 className="text-lg font-semibold text-foreground truncate break-all" data-test-id={`${dataTestId}-bank`}>
          {bankAccount.bank}
        </h3>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-600">Tipo:</span>
            <span className="font-medium text-gray-900">{bankAccount.accountType}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-600">Cuenta:</span>
            <span className="font-medium text-gray-900 font-mono text-sm">{formatAccountNumber(bankAccount.accountNumber)}</span>
          </div>
          {bankAccount.alias && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-600">Alias:</span>
              <span className="font-medium text-gray-900">{bankAccount.alias}</span>
            </div>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between mt-4" data-test-id={`${dataTestId}-actions`}>
        <Badge
          variant={getStatusBadgeVariant(bankAccount.isActive)}
          data-test-id={`${dataTestId}-status`}
        >
          {getStatusLabel(bankAccount.isActive)}
        </Badge>
        <div className="flex gap-2">
          {has('ADMIN_BANK_ACCOUNTS_UPDATE') && (
            <IconButton
              icon="edit"
              variant="text"
              size="sm"
              title="Editar cuenta bancaria"
              onClick={() => setOpenUpdateDialog(true)}
              data-test-id={`${dataTestId}-edit-button`}
            />
          )}
          {has('ADMIN_BANK_ACCOUNTS_DELETE') && (
            <IconButton
              icon="delete"
              variant="text"
              size="sm"
              title="Eliminar cuenta bancaria"
              onClick={() => setOpenDeleteDialog(true)}
              data-test-id={`${dataTestId}-delete-button`}
            />
          )}
        </div>
      </div>

      {/* Dialogs */}
      <UpdateBankAccountDialog
        open={openUpdateDialog}
        onClose={() => setOpenUpdateDialog(false)}
        bankAccount={bankAccount}
        data-test-id={`${dataTestId}-update-dialog`}
      />
      <DeleteBankAccountDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        bankAccount={bankAccount}
        data-test-id={`${dataTestId}-delete-dialog`}
      />
    </article>
  );
};

export default BankAccountCard;