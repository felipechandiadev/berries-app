'use client';

import React, { useState } from 'react';
import { SectionProps } from '../types';
import { PersonBankAccount, AccountTypeName, BankName } from '@/data/entities/Person';
import { updatePersonBankAccounts } from '@/app/actions/persons';
import { Button } from '@/app/baseComponents/Button/Button';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import Select from '@/app/baseComponents/Select/Select';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import Alert from '@/app/baseComponents/Alert/Alert';
import { Edit, Trash2, Plus, Landmark, CreditCard, CheckCircle2 } from 'lucide-react';

export const BankAccountsSection: React.FC<SectionProps> = ({ data, onRefresh }) => {
  const person = data.producer.person;
  const [bankAccounts, setBankAccounts] = useState<PersonBankAccount[]>(person?.bankAccounts || []);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<PersonBankAccount>({
    accountType: AccountTypeName.CUENTA_CORRIENTE,
    bank: BankName.BANCO_ESTADO,
    accountNumber: '',
    alias: '',
    isPrimary: false,
  });

  const handleOpenDialog = (index: number | null = null) => {
    if (index !== null) {
      setFormData({ ...bankAccounts[index] });
      setEditingIndex(index);
    } else {
      setFormData({
        accountType: AccountTypeName.CUENTA_CORRIENTE,
        bank: BankName.BANCO_ESTADO,
        accountNumber: '',
        alias: '',
        isPrimary: bankAccounts.length === 0,
      });
      setEditingIndex(null);
    }
    setIsDialogOpen(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!formData.accountNumber.trim()) {
      setError('El número de cuenta es requerido');
      return;
    }

    setLoading(true);
    try {
      let newAccounts = [...bankAccounts];
      
      // If this is primary, unmark others
      if (formData.isPrimary) {
        newAccounts = newAccounts.map(acc => ({ ...acc, isPrimary: false }));
      }

      if (editingIndex !== null) {
        newAccounts[editingIndex] = formData;
      } else {
        newAccounts.push(formData);
      }

      const result = await updatePersonBankAccounts(person!.id, newAccounts);
      if (result.success) {
        setBankAccounts(newAccounts);
        setIsDialogOpen(false);
        onRefresh?.();
      } else {
        setError(result.error || 'Error al guardar');
      }
    } catch (err) {
      setError('Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (index: number) => {
    if (!confirm('¿Está seguro de eliminar esta cuenta bancaria?')) return;

    setLoading(true);
    try {
      const newAccounts = bankAccounts.filter((_, i) => i !== index);
      
      // If we deleted the primary one and there are others, make the first one primary
      if (bankAccounts[index].isPrimary && newAccounts.length > 0) {
        newAccounts[0].isPrimary = true;
      }

      const result = await updatePersonBankAccounts(person!.id, newAccounts);
      if (result.success) {
        setBankAccounts(newAccounts);
        onRefresh?.();
      } else {
        alert(result.error || 'Error al eliminar');
      }
    } catch (err) {
      alert('Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  if (!person) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Landmark size={48} className="mb-4 opacity-20" />
        <p>No se encontró información de la persona asociada al productor.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-4">
          <IconButton 
            icon="add" 
            variant="outlined"
            ariaLabel="Agregar cuenta"
            onClick={() => handleOpenDialog()}
          />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Cuentas Bancarias</h3>
            <p className="text-sm text-neutral-500">Gestiona las cuentas para pagos y transferencias.</p>
          </div>
        </div>
      </div>

      {bankAccounts.length === 0 ? (
        <div className="bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-lg p-12 flex flex-col items-center justify-center text-center">
          <div className="bg-white p-4 rounded-full shadow-sm mb-4">
            <CreditCard size={32} className="text-neutral-400" />
          </div>
          <h4 className="text-gray-900 font-medium mb-1">Sin cuentas registradas</h4>
          <p className="text-neutral-500 text-sm max-w-xs">
            Aún no has agregado ninguna cuenta bancaria para este productor.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 w-full">
          {bankAccounts.map((account, index) => (
            <article 
              key={index}
              className={`
                border border-neutral-200 rounded-lg shadow-sm p-4 flex flex-col justify-between transition-all duration-200
                ${account.isPrimary ? 'bg-primary/5' : 'bg-white'}
              `}
            >
              <div className="flex flex-col gap-2 w-full overflow-hidden mb-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className={`p-2 rounded-lg ${account.isPrimary ? 'bg-primary/20 text-primary' : 'bg-neutral-100 text-neutral-500'}`}>
                      <Landmark size={18} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {account.alias || account.bank}
                    </h3>
                  </div>
                  {account.isPrimary && (
                    <span className="bg-primary/10 text-primary text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                      <CheckCircle2 size={10} />
                      Principal
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-600">Banco:</span>
                    <span className="text-sm font-medium text-gray-900">{account.bank}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-600">Tipo:</span>
                    <span className="text-xs font-medium text-neutral-500 uppercase">{account.accountType}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-neutral-600">N° Cuenta:</span>
                    <span className="text-sm font-mono font-bold text-gray-700">{account.accountNumber}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end items-center mt-4">
                <div className="flex gap-2">
                  <IconButton 
                    icon="edit" 
                    variant="basicSecondary"
                    onClick={() => handleOpenDialog(index)}
                    ariaLabel="Editar"
                  />
                  <IconButton 
                    icon="delete" 
                    variant="basicSecondary"
                    onClick={() => handleDelete(index)}
                    ariaLabel="Eliminar"
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={editingIndex !== null ? 'Editar Cuenta Bancaria' : 'Nueva Cuenta Bancaria'}
        size="md"
      >
        <div className="space-y-4 py-2">
          {error && <Alert variant="error">{error}</Alert>}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Banco"
              value={formData.bank}
              onChange={(val: string | number | null) => setFormData({ ...formData, bank: val as BankName })}
              options={Object.values(BankName).map(bank => ({ label: bank, id: bank }))}
              required
            />
            <Select
              label="Tipo de Cuenta"
              value={formData.accountType}
              onChange={(val: string | number | null) => setFormData({ ...formData, accountType: val as AccountTypeName })}
              options={Object.values(AccountTypeName).map(type => ({ label: type, id: type }))}
              required
            />
          </div>

          <TextField
            label="Número de Cuenta"
            value={formData.accountNumber}
            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
            placeholder="Ej: 123456789"
            required
          />

          <TextField
            label="Alias (Opcional)"
            value={formData.alias || ''}
            onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
            placeholder="Ej: Cuenta Personal, Empresa, etc."
          />

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <input
              type="checkbox"
              id="isPrimary"
              checked={formData.isPrimary}
              onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="isPrimary" className="text-sm font-medium text-gray-700 cursor-pointer">
              Marcar como cuenta principal para pagos
            </label>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setIsDialogOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSave} loading={loading}>
              {editingIndex !== null ? 'Actualizar' : 'Guardar Cuenta'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
