'use client';
import { use, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import BankAccountCard from "./BankAccountCard";
import CreateBankAccountDialog from "./CreateBankAccountDialog";
import { TextField } from '@/app/baseComponents/TextField/TextField';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import { AdminBankAccount } from '@/data/entities/AdminBankAccount';
import { usePermissions } from '@/app/state/hooks/usePermissions';

export interface BankAccountType {
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

export interface ListBankAccountsProps {
  bankAccounts: BankAccountType[];
}

const defaultEmptyMessage = 'No hay cuentas bancarias para mostrar.';

const ListBankAccounts: React.FC<ListBankAccountsProps> = ({ bankAccounts }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const { has } = usePermissions();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setSearch(value);
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/home/economicManagement/bankAccounts';
    router.replace(`${pathname}?${params.toString()}`);
    router.refresh();
  };

  const displayedBankAccounts = bankAccounts;

  return (
    <div className="w-full" data-test-id="bank-accounts-list-container">
      {/* Primera fila: búsqueda y botón */}
      <div className="flex items-center justify-between mb-4 gap-4" data-test-id="bank-accounts-list-header">
        {has('ADMIN_BANK_ACCOUNTS_CREATE') && (
          <IconButton
            icon="add"
            variant='outlined'
            aria-label="Agregar cuenta bancaria"
            onClick={() => setOpenCreateDialog(true)}
            data-test-id="bank-accounts-add-button"
          />
        )}
        <div className="w-full max-w-sm" data-test-id="bank-accounts-search-container">
          <TextField
            label="Buscar"
            value={search}
            onChange={handleSearchChange}
            startIcon="search"
            placeholder="Buscar cuenta bancaria..."
            data-test-id="bank-accounts-search-input"
          />
        </div>
      </div>
      {/* Segunda fila: grid de tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full" data-test-id="bank-accounts-grid">
        {displayedBankAccounts && displayedBankAccounts.length > 0 ? (
          displayedBankAccounts.map(bankAccount => (
            <BankAccountCard
              key={bankAccount.id}
              bankAccount={bankAccount}
              data-test-id={`bank-account-card-${bankAccount.id}`}
            />
          ))
        ) : (
          <div className="col-span-full text-center text-neutral-500 py-8" data-test-id="bank-accounts-empty-message">{defaultEmptyMessage}</div>
        )}
      </div>

      {/* CreateBankAccountDialog */}
      <CreateBankAccountDialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        data-test-id="bank-accounts-create-dialog"
      />
    </div>
  );
};

export default ListBankAccounts;