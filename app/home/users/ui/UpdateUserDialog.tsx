'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import UpdateBaseForm, { BaseUpdateFormFieldGroup } from '@/app/baseComponents/BaseForm/UpdateBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { updateUserWithPerson } from '@/app/actions/users';

interface User {
  id: string;
  userName: string;
  mail: string;
  rol: string;
  person?: {
    name?: string;
    dni?: string;
    phone?: string;
  };
}

interface UpdateUserDialogProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onSuccess?: () => void;
}

const UpdateUserDialog: React.FC<UpdateUserDialogProps> = ({ open, onClose, user, onSuccess }) => {
  const router = useRouter();
  const { success, error } = useAlert();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Definir estructura del formulario
  const formFields: BaseUpdateFormFieldGroup[] = [
    {
      id: 'user-info',
      title: 'Información del Usuario',
      columns: 1,
      fields: [
        {
          name: 'userName',
          label: 'Nombre de usuario',
          type: 'text',
          required: true
        },
        {
          name: 'mail',
          label: 'Correo',
          type: 'email',
          required: true
        },
        {
          name: 'rol',
          label: 'Rol',
          type: 'select',
          required: true,
          options: [
            { id: 'OPERATOR', label: 'Operador' },
            { id: 'ADMIN', label: 'Administrador' }
          ]
        }
      ]
    },
    {
      id: 'person-info',
      title: 'Información de la Persona',
      columns: 1,
      fields: [
        {
          name: 'personName',
          label: 'Nombre completo',
          type: 'text',
          required: true
        },
        {
          name: 'personDni',
          label: 'RUT',
          type: 'dni',
          required: true
        },
        {
          name: 'phone',
          label: 'Teléfono',
          type: 'text'
        }
      ]
    }
  ];

  // Datos iniciales del usuario
  const initialState = user ? {
    userName: user.userName || '',
    mail: user.mail || '',
    rol: user.rol || 'OPERATOR',
    personName: user.person?.name || '',
    personDni: user.person?.dni || '',
    phone: user.person?.phone || '',
  } : {
    userName: '',
    mail: '',
    rol: 'OPERATOR',
    personName: '',
    personDni: '',
    phone: '',
  };

  const handleSubmit = async (formValues: Record<string, any>) => {
    if (!user?.id) {
      error('Usuario no identificado');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateUserWithPerson({
        id: String(user.id),
        userName: formValues.userName,
        mail: formValues.mail,
        phone: formValues.phone,
        rol: formValues.rol as 'ADMIN' | 'OPERATOR',
        personName: formValues.personName,
        personDni: formValues.personDni,
      }, currentUserId);

      if (result.success) {
        success('Usuario actualizado exitosamente');
        
        // Cerrar el dialog después de 500ms y hacer refresh
        setTimeout(() => {
          onClose();
          onSuccess?.();
          router.refresh();
          setIsSubmitting(false);
        }, 500);
      } else {
        const errorMessage = result.error || 'Error al actualizar el usuario';
        error(errorMessage);
        setIsSubmitting(false);
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Error desconocido';
      error(errorMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Editar Usuario">
      {user ? (
        <UpdateBaseForm
          fields={formFields}
          initialState={initialState}
          onSubmit={handleSubmit}
          submitLabel="Actualizar Usuario"
          isSubmitting={isSubmitting}
        />
      ) : (
        <div className="text-center py-8 text-gray-500">
          No hay datos de usuario para mostrar
        </div>
      )}
    </Dialog>
  );
};

export default UpdateUserDialog;
