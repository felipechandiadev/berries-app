'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import UpdateBaseForm, { BaseUpdateFormField } from '@/app/baseComponents/BaseForm/UpdateBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { updateTransaction } from '@/app/actions/transactions';
import { formatAuditDateLocaleES } from '@/lib/dateTimeUtils';
import type { DispatchWithRelations } from '../types';

interface UpdateDispatchDateDialogProps {
  dispatch: DispatchWithRelations;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const UpdateDispatchDateDialog: React.FC<UpdateDispatchDateDialogProps> = ({ dispatch, open, onClose, onSuccess }) => {
  const router = useRouter();
  const { success, error: showError } = useAlert();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const currentUserName = (session?.user as any)?.name || 'Usuario';
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Definir estructura del formulario
  const formFields: BaseUpdateFormField[] = [
    {
      name: 'createdAt',
      label: 'Fecha de registro',
      type: 'date' as const,
      required: true,
    },
  ];

  const handleSubmit = async (values: Record<string, any>) => {
    if (!dispatch?.id) {
      showError('Despacho no identificado');
      return;
    }

    setIsSubmitting(true);

    try {
      // Convertir la fecha a formato ISO string con hora local (medianoche en Chile)
      // El input type="date" devuelve formato YYYY-MM-DD
      const [year, month, day] = values.createdAt.split('-').map(Number);
      const createdAtDate = new Date(year, month - 1, day, 12, 0, 0); // Crear fecha al mediodía local
      
      if (isNaN(createdAtDate.getTime())) {
        showError('Fecha inválida');
        setIsSubmitting(false);
        return;
      }

      const previousDateLabel = dispatch.createdAt
        ? formatAuditDateLocaleES(String(dispatch.createdAt))
        : 'Sin registro anterior';
      const newDateLabel = formatAuditDateLocaleES(createdAtDate.toISOString());

      const historyEntry = {
        date: new Date().toISOString(),
        userId: String(currentUserId || 'unknown'),
        userName: currentUserName,
        action: 'Actualización de fecha de registro',
        details: `Se actualizó la fecha de registro de ${previousDateLabel} a ${newDateLabel}.`,
      };

      const updatedMetadata = {
        ...dispatch.metadata,
        history: [...(dispatch.metadata?.history || []), historyEntry],
      };

      const result = await updateTransaction({
        id: dispatch.id,
        createdAt: createdAtDate.toISOString(),
        metadata: updatedMetadata,
      }, currentUserId);

      if (result.success) {
        success('Fecha de registro actualizada exitosamente');

        // Cerrar el dialog después de 500ms y hacer refresh
        setTimeout(() => {
          onClose();
          onSuccess?.();
          router.refresh();
          setIsSubmitting(false);
        }, 500);
      } else {
        const errorMessage = result.error || 'Error al actualizar la fecha de registro';
        showError(errorMessage);
        setIsSubmitting(false);
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Error desconocido';
      showError(errorMessage);
      setIsSubmitting(false);
    }
  };

  // Formatear la fecha actual para el initialState
  const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  return (
    <Dialog open={open} onClose={onClose} zIndex={100}>
      <UpdateBaseForm
        key={dispatch.id} // Force re-render when dispatch changes
        fields={formFields}
        initialState={{
          createdAt: formatDateForInput(dispatch.createdAt),
        }}
        onSubmit={handleSubmit}
        title="Actualizar Fecha de Registro"
        subtitle="Modifica la fecha de registro del despacho"
        submitLabel="Actualizar Fecha"
        isSubmitting={isSubmitting}
        cancelButton={true}
        cancelButtonText="Cancelar"
        onCancel={onClose}
      />
    </Dialog>
  );
};

export default UpdateDispatchDateDialog;