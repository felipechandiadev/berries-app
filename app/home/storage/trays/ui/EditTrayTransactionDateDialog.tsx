'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { Button } from '@/app/baseComponents/Button/Button';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import { updateTrayTransactionDate } from '@/app/actions/transactions';
import { formatAuditDate, toChileTime } from '@/lib/dateTimeUtils';
import { useAlert } from '@/app/state/hooks/useAlert';

interface EditTrayTransactionDateDialogProps {
  open: boolean;
  onClose: () => void;
  transactionId: string;
  currentDate: Date | string;
  onSuccess?: () => void;
}

function toDateTimeLocalValue(date: Date | string): string {
  try {
    return toChileTime(date).format('YYYY-MM-DDTHH:mm');
  } catch {
    return '';
  }
}

export default function EditTrayTransactionDateDialog({
  open,
  onClose,
  transactionId,
  currentDate,
  onSuccess,
}: EditTrayTransactionDateDialogProps) {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id as string | undefined;
  const { success, error: showError } = useAlert();

  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNewDate(toDateTimeLocalValue(currentDate));
    setReason('');
  }, [open, currentDate]);

  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  const handleSave = async () => {
    if (!newDate) {
      showError('Debe seleccionar una fecha válida');
      return;
    }
    if (!currentUserId) {
      showError('Usuario no autenticado');
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateTrayTransactionDate({
        transactionId,
        createdAt: newDate,
        reason: reason.trim() || undefined,
      });

      if (result.success) {
        success('Fecha del movimiento actualizada correctamente');
        onSuccess?.();
        onClose();
      } else {
        showError(result.error || 'Error al actualizar la fecha');
      }
    } catch (err) {
      console.error('[EditTrayTransactionDateDialog] Error:', err);
      showError('Error inesperado al actualizar la fecha');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Editar fecha del movimiento"
      size="sm"
      zIndex={60}
      data-test-id="edit-tray-transaction-date-dialog"
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="Nueva fecha y hora"
          type="datetime-local"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          required
          disabled={isSaving}
        />
        <TextField
          label="Motivo del cambio (opcional)"
          type="textarea"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explique por qué necesita cambiar la fecha..."
          rows={3}
          disabled={isSaving}
        />
        <div className="text-sm text-gray-600">
          <p>Fecha actual: {currentDate ? formatAuditDate(currentDate) : 'No disponible'}</p>
          <p className="mt-1 text-xs text-amber-600">
            Este cambio afecta el orden histórico y los comprobantes reimpresos.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outlined" onClick={handleClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
