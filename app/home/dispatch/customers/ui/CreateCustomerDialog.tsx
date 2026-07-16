'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import CreateBaseForm, { BaseFormFieldGroup } from '@/app/baseComponents/BaseForm/CreateBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { createCustomer } from '@/app/actions/customers';

interface CreateCustomerDialogProps {
  open?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

const CreateCustomerDialog: React.FC<CreateCustomerDialogProps> = ({ open: externalOpen, onClose, onSuccess }) => {
  const router = useRouter();
  const { success, error: showError } = useAlert();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({
    personId: '',
  });

  // For customers, we need to select a person first, but since it's simplified, perhaps create person inline.
  // But looking at createCustomer, it takes personId.

  // Actually, for simplicity, let's assume we create the person first, but since the action takes personId, we need to handle it.

  // Looking at the action, createCustomer takes personId, so we need to create the person separately or have a way to select.

  // But for the dialog, let's make fields for name, dni, phone, mail, and then create person first.

  // But to keep it simple, let's modify the form to have person fields, and in submit, create person first.

  // But the action is createCustomer with personId.

  // Perhaps the dialog should have autocomplete for person.

  // But for now, let's make it create person inline.

  // Actually, looking at producers, they have name, dni, mail, phone, and createProducer takes those.

  // For customers, createCustomer takes personId, so we need to create person first.

  // Let's modify the dialog to create person first.

  const formFields: BaseFormFieldGroup[] = [
    {
      id: 'customer-info',
      columns: 1,
      fields: [
        {
          name: 'name',
          label: 'Nombre completo',
          type: 'text',
          required: true,
          startIcon: 'person'
        },
        {
          name: 'dni',
          label: 'RUT',
          type: 'dni',
          required: true,
          startIcon: 'badge'
        },
        {
          name: 'mail',
          label: 'Correo electrónico',
          type: 'email',
          startIcon: 'mail'
        },
        {
          name: 'phone',
          label: 'Teléfono',
          type: 'text',
          startIcon: 'phone'
        },
        {
          name: 'address',
          label: 'Dirección',
          type: 'text',
          startIcon: 'location_on'
        }
      ]
    }
  ];

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // First, create the person
      // But createCustomer expects personId, so we need to create person first.

      // Actually, looking at the actions, there is no createPerson, but createCustomer takes personId.

      // Perhaps we need to select existing person.

      // For simplicity, let's assume we have a way to create person.

      // But to make it work, let's modify createCustomer to accept person data and create person internally.

      // But for now, let's use a placeholder personId.

      // Wait, perhaps the dialog should have autocomplete for person.

      // But to keep it simple, let's change the form to have personId as autocomplete.

      // But since there is no getPersons, let's make it text for now.

      // Actually, let's check if there is createPerson.

      // From the actions, there is persons.ts with createPerson.

      // Yes, there is createPerson in actions/persons.ts.

      // So, in the dialog, we can create the person first.

      const { createPerson } = await import('@/app/actions/persons');

      const personResult = await createPerson({
        name: formData.name,
        dni: formData.dni,
        mail: formData.mail || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
      });

      if (!personResult.success) {
        showError(personResult.error || 'Error al crear la persona');
        setIsSubmitting(false);
        return;
      }

      const personId = (personResult.data as any)?.id;

      if (!personId) {
        showError('Error al obtener ID de la persona');
        setIsSubmitting(false);
        return;
      }

      const result = await createCustomer({
        personId,
      }, currentUserId);

      if (result.success) {
        success('Cliente creado exitosamente');

        // Cerrar el dialog después de 500ms y hacer refresh
        setTimeout(() => {
          // Always call onClose if provided
          onClose?.();
          onSuccess?.();
          router.refresh();
          setIsSubmitting(false);
          // Reset form data
          setFormData({
            name: '',
            dni: '',
            mail: '',
            phone: '',
          });
        }, 500);
      } else {
        const errorMessage = result.error || 'Error al crear el cliente';
        showError(errorMessage);
        setIsSubmitting(false);
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Error desconocido';
      showError(errorMessage);
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      dni: '',
      mail: '',
      phone: '',
    });
    // Always call onClose if provided (DataGrid or standalone usage)
    onClose?.();
  };

  const formContent = (
    <CreateBaseForm
      fields={formFields}
      values={formData}
      onChange={handleFieldChange}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      title="Nuevo Cliente"
      subtitle="Complete la información del cliente"
      cancelButton={true}
      cancelButtonText="Cancelar"
      onCancel={handleCancel}
      data-test-id="create-customer-form"
    />
  );

  // If open prop is provided, we are in controlled mode (Standalone)
  // We render the Dialog wrapper.
  if (externalOpen !== undefined) {
    return (
      <Dialog open={externalOpen} onClose={onClose || (() => {})}>
        {formContent}
      </Dialog>
    );
  }

  // If open prop is NOT provided, we assume we are inside DataGrid's Dialog
  // We render ONLY the form content.
  return formContent;
};

export default CreateCustomerDialog;