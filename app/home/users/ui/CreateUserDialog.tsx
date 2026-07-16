'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import CreateBaseForm, { BaseFormFieldGroup } from '@/app/baseComponents/BaseForm/CreateBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { createUserWithPerson } from '@/app/actions/users';

interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
}

const CreateUserDialog: React.FC<CreateUserDialogProps> = ({ open, onClose }) => {
  const router = useRouter();
  const { success, error } = useAlert();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    userName: '',
    mail: '',
    password: '',
    phone: '',
    rol: 'OPERATOR',
    personName: '',
    personDni: ''
  });

  const formFields: BaseFormFieldGroup[] = [
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
          name: 'password',
          label: 'Contraseña',
          type: 'password',
          required: true
        },
        {
          name: 'phone',
          label: 'Teléfono',
          type: 'text'
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
        }
      ]
    }
  ];

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrors([]);

    try {
      const result = await createUserWithPerson({
        userName: formData.userName,
        mail: formData.mail,
        phone: formData.phone,
        rol: formData.rol as 'ADMIN' | 'OPERATOR',
        password: formData.password,
        personName: formData.personName,
        personDni: formData.personDni,
      }, currentUserId);

      if (result.success) {
        success('Usuario creado correctamente');
        setFormData({
          userName: '',
          mail: '',
          password: '',
          phone: '',
          rol: 'OPERATOR',
          personName: '',
          personDni: ''
        });

        // Cerrar el dialog después de que se complete la acción
        setTimeout(() => {
          onClose();
          router.refresh();
          setIsSubmitting(false);
        }, 300);
      } else {
        setErrors([result.error || 'Error al crear el usuario']);
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setErrors([err?.message || 'Error al crear el usuario']);
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Crear Usuario">
      <CreateBaseForm
        fields={formFields}
        values={formData}
        onChange={handleChange}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Crear Usuario"
        cancelButton={true}
        cancelButtonText="Cancelar"
        onCancel={onClose}
        errors={errors}
      />
    </Dialog>
  );
};

export default CreateUserDialog;
