'use client';

import { useState } from 'react';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import DeleteBaseForm from '@/app/baseComponents/BaseForm/DeleteBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { deleteCustomer } from '@/app/actions/customers';
import type { CustomerGridRow } from '@/app/actions/customers';

type Customer = CustomerGridRow;

interface DeleteCustomerDialogProps {
  customer: Customer;
  onSuccess: () => void;
}

export default function DeleteCustomerDialog({ customer, onSuccess }: DeleteCustomerDialogProps) {
  const { showAlert } = useAlert();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrors([]);

    try {
      const result = await deleteCustomer(customer.id);

      if (result.success) {
        showAlert({
          message: 'Cliente eliminado exitosamente',
          type: 'success',
          duration: 4000,
        });
        setTimeout(() => {
          setOpen(false);
          onSuccess();
        }, 500);
      } else {
        const errorMessage = result.error || 'Error al eliminar el cliente';
        showAlert({
          message: errorMessage,
          type: 'error',
          duration: 4000,
        });
        setErrors([errorMessage]);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      const errorMessage = 'Error al eliminar el cliente';
      showAlert({
        message: errorMessage,
        type: 'error',
        duration: 4000,
      });
      setErrors([errorMessage]);
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <IconButton
        icon="delete"
        variant="basicSecondary"
        size="sm"
        onClick={() => setOpen(true)}
        title="Eliminar cliente"
      />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title=""
        size="xs"
      >
        <DeleteBaseForm
          message={`¿Está seguro que desea eliminar al cliente "${customer.name}"? Esta acción no se puede deshacer.`}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          errors={errors}
          cancelButton={true}
          cancelButtonText="Cancelar"
          onCancel={() => setOpen(false)}
          submitLabel="Eliminar"
          title="Eliminar Cliente"
        />
      </Dialog>
    </>
  );
}