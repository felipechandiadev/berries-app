'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import UpdateBaseForm, { BaseUpdateFormField } from '@/app/baseComponents/BaseForm/UpdateBaseForm';
import { updateAdvanceDate } from '@/app/actions/advances';
import { useAlert } from '@/app/state/hooks/useAlert';

interface EditDateButtonProps {
  advanceId: string;
  currentDate: string;
  producerName?: string;
  isSettled: boolean;
  onSuccess?: () => void;
}

/**
 * Convierte una fecha ISO a formato YYYY-MM-DD para el input date
 */
function toDateInputValue(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return '';
    // Usar fecha local
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

/**
 * Convierte una fecha del input date a ISO string preservando la hora original
 */
function fromDateInputValue(dateValue: string, originalIsoDate: string): string {
  try {
    const originalDate = new Date(originalIsoDate);
    const [year, month, day] = dateValue.split('-').map(Number);
    
    // Crear nueva fecha manteniendo la hora original
    const newDate = new Date(originalDate);
    newDate.setFullYear(year);
    newDate.setMonth(month - 1);
    newDate.setDate(day);
    
    return newDate.toISOString();
  } catch {
    return new Date(dateValue).toISOString();
  }
}

const EditDateButton = ({
  advanceId,
  currentDate,
  producerName,
  isSettled,
  onSuccess,
}: EditDateButtonProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const router = useRouter();
  const { data: session } = useSession();
  const { success, error: showError } = useAlert();

  const currentUserId = (session?.user as any)?.id;

  const handleOpenDialog = useCallback(() => {
    setFormErrors([]);
    setIsDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    setFormErrors([]);
  }, []);

  const handleSubmit = useCallback(
    async (values: Record<string, unknown>) => {
      setFormErrors([]);

      const newDateValue = values.createdAt as string;

      if (!newDateValue) {
        setFormErrors(['La fecha es requerida.']);
        return;
      }

      if (!currentUserId) {
        setFormErrors(['Sesión no válida. Por favor, vuelva a iniciar sesión.']);
        return;
      }

      const newIsoDate = fromDateInputValue(newDateValue, currentDate);

      const result = await updateAdvanceDate({
        advanceId,
        newDate: newIsoDate,
        userId: currentUserId,
      });

      if (!result.success) {
        setFormErrors([result.error || 'Error al actualizar la fecha.']);
        return;
      }

      success('Fecha del anticipo actualizada correctamente.');
      handleCloseDialog();
      router.refresh();
      onSuccess?.();
    },
    [advanceId, currentDate, currentUserId, success, handleCloseDialog, router, onSuccess]
  );

  // Usar useMemo para evitar que el formulario se resetee en cada render
  const fields: BaseUpdateFormField[] = useMemo(() => [
    {
      name: 'createdAt',
      label: 'Fecha de registro',
      type: 'date',
      required: true,
    },
  ], []);

  const initialState = useMemo(() => ({
    createdAt: toDateInputValue(currentDate),
  }), [currentDate]);

  // No mostrar el botón si el anticipo está liquidado
  if (isSettled) {
    return null;
  }

  return (
    <>
      <IconButton
        icon="calendar_month"
        tooltip="Editar fecha de registro"
        onClick={handleOpenDialog}
        variant="text"
        size="sm"
        data-test-id={`edit-date-button-${advanceId}`}
      />

      <Dialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        title="Editar fecha de registro"
        maxWidth="sm"
        data-test-id="edit-advance-date-dialog"
      >
        <div className="space-y-4">
          {producerName && (
            <p className="text-sm text-gray-600">
              Anticipo para: <span className="font-medium">{producerName}</span>
            </p>
          )}

          <UpdateBaseForm
            fields={fields}
            initialState={initialState}
            onSubmit={handleSubmit}
            onCancel={handleCloseDialog}
            submitLabel="Guardar cambios"
            cancelButton={true}
            cancelButtonText="Cancelar"
            errors={formErrors}
          />
        </div>
      </Dialog>
    </>
  );
};

export default EditDateButton;
