'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import UpdateBaseForm, { BaseUpdateFormFieldGroup } from '@/app/baseComponents/BaseForm/UpdateBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { updatePerson } from '@/app/actions/persons';
import type { CustomerGridRow } from '@/app/actions/customers';

interface UpdateCustomerDialogProps {
  customer: CustomerGridRow;
  onSuccess?: () => void;
}

const UpdateCustomerDialog: React.FC<UpdateCustomerDialogProps> = ({ customer, onSuccess }) => {
  const router = useRouter();
  const { success, error: showError } = useAlert();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onClose = () => setOpen(false);

  // Definir estructura del formulario
  const formFields: BaseUpdateFormFieldGroup[] = [
    {
      id: 'customer-info',
      columns: 1,
      fields: [
        {
          name: 'name',
          label: 'Nombre completo',
          type: 'text' as const,
          required: true,
          startIcon: 'person'
        },
        {
          name: 'dni',
          label: 'RUT',
          type: 'dni' as const,
          required: true,
            startIcon: 'badge'
        },
        {
          name: 'mail',
          label: 'Correo electrónico',
          type: 'email' as const,
            startIcon: 'mail'
        },
        {
          name: 'phone',
          label: 'Teléfono',
          type: 'text' as const,
            startIcon: 'phone'
        },
        {
          name: 'address',
          label: 'Dirección',
          type: 'text' as const,
            startIcon: 'home'
        }
      ]
    }
  ];

  const handleSubmit = async (values: Record<string, any>) => {
    if (!customer?.personId) {
      showError('Cliente no identificado');
      return;
    }

    setIsSubmitting(true);

    try {
      // Ensure values are strings
      const cleanValues = {
        name: typeof values.name === 'string' ? values.name : '',
        dni: typeof values.dni === 'string' ? values.dni : (values.dni?.value || ''),
        mail: typeof values.mail === 'string' ? values.mail : '',
        phone: typeof values.phone === 'string' ? values.phone : '',
        address: typeof values.address === 'string' ? values.address : '',
      };

      const result = await updatePerson(customer.personId, cleanValues, currentUserId);

      if (result.success) {
        success('Cliente actualizado exitosamente');

        // Cerrar el dialog después de 500ms y hacer refresh
        setTimeout(() => {
          onClose();
          onSuccess?.();
          router.refresh();
          setIsSubmitting(false);
        }, 500);
      } else {
        const errorMessage = result.error || 'Error al actualizar el cliente';
        showError(errorMessage);
        setIsSubmitting(false);
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Error desconocido';
      showError(errorMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <IconButton
        icon="edit"
        variant="basicSecondary"
        aria-label={`Editar cliente ${customer.name}`}
        onClick={() => setOpen(true)}
        data-test-id={`edit-customer-${customer.id}`}
      />
      <Dialog open={open} onClose={onClose}>
        <UpdateBaseForm
          key={customer.id} // Force re-render when customer changes
          fields={formFields}
          initialState={{
            name: customer.name || '',
            dni: customer.dni || '',
            mail: customer.mail || '',
            phone: customer.phone || '',
            address: customer.address || '',
          }}
          onSubmit={handleSubmit}
          title='Editar Cliente'
          subtitle='Modifica la información de cliente'
          submitLabel="Actualizar Cliente"
          isSubmitting={isSubmitting}
          cancelButton={true}
          cancelButtonText="Cancelar"
          onCancel={onClose}
        />
      </Dialog>
    </>
  );
};

export default UpdateCustomerDialog;