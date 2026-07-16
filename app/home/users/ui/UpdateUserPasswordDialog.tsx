'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import CreateBaseForm, { BaseFormFieldGroup } from '@/app/baseComponents/BaseForm/CreateBaseForm';
import { useAlert } from '@/app/state/contexts/AlertContext';
import { updateUserPassword } from '@/app/actions/users';

interface UpdateUserPasswordDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  onSuccess?: () => void;
}

const UpdateUserPasswordDialog: React.FC<UpdateUserPasswordDialogProps> = ({
  open,
  onClose,
  userId,
  userName,
  onSuccess,
}) => {
  const { showAlert } = useAlert();
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Get current user ID from session for audit
  const user = session?.user as any;
  const currentUserId = user?.id || userId; // Fallback to userId if session doesn't have it

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear errors when user starts typing
    if (formErrors.length > 0) {
      setFormErrors([]);
    }
  };

  const validateForm = (values: Record<string, any>): string[] => {
    const errors: string[] = [];

    if (!values.currentPassword || !values.currentPassword.trim()) {
      errors.push('La contraseña actual es requerida');
    }

    if (!values.newPassword || !values.newPassword.trim()) {
      errors.push('La nueva contraseña es requerida');
    } else if (values.newPassword.length < 6) {
      errors.push('La contraseña debe tener al menos 6 caracteres');
    }

    if (!values.confirmPassword || !values.confirmPassword.trim()) {
      errors.push('Debe confirmar la contraseña');
    } else if (values.newPassword !== values.confirmPassword) {
      errors.push('Las contraseñas no coinciden');
    }

    if (values.currentPassword === values.newPassword) {
      errors.push('La nueva contraseña debe ser diferente a la actual');
    }

    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateForm(formData);
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateUserPassword(
        {
          userId,
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword,
        },
        currentUserId // Pass current user ID for audit
      );

      if (result.success) {
        showAlert({
          message: 'Contraseña actualizada exitosamente',
          type: 'success',
          duration: 3000,
        });
        handleClose();
        onSuccess?.();
      } else {
        showAlert({
          message: result.error || 'Error al actualizar la contraseña',
          type: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('[UpdateUserPasswordDialog] Error:', error);
      showAlert({
        message: 'Error al actualizar la contraseña',
        type: 'error',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setFormErrors([]);
    onClose();
  };

  const formFields: BaseFormFieldGroup[] = [
    {
      id: 'password-info',
      title: 'Cambiar Contraseña',
      subtitle: 'Ingresa tu contraseña actual para confirmar la identidad y luego proporciona una nueva contraseña.',
      fields: [
        {
          name: 'currentPassword',
          label: 'Contraseña Actual',
          type: 'password',
          required: true,
          passwordVisibilityToggle: true,
        },
        {
          name: 'newPassword',
          label: 'Nueva Contraseña',
          type: 'password',
          required: true,
          passwordVisibilityToggle: true,
        },
        {
          name: 'confirmPassword',
          label: 'Confirmar Contraseña',
          type: 'password',
          required: true,
          passwordVisibilityToggle: true,
        },
      ],
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={``}
      maxWidth="xs"
      data-test-id="update-password-dialog"
    >
      <CreateBaseForm
        fields={formFields}
        values={formData}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Actualizar Contraseña"
        errors={formErrors}
        cancelButton={true}
        cancelButtonText="Cancelar"
        onCancel={handleClose}
      />
    </Dialog>
  );
};

export default UpdateUserPasswordDialog;
