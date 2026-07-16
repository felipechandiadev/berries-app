'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { Button } from '@/app/baseComponents/Button/Button';
import { useAlert } from '@/app/state/hooks/useAlert';
import { removeReceptionPack, type RemoveReceptionPackHandlingMode } from '@/app/actions/receptions';

interface DeletePackDialogProps {
  open: boolean;
  onClose: () => void;
  receptionId: string;
  packId: string;
  summary?: {
    packNumber?: number | null;
    trayLabel?: string | null;
    traysQuantity: number;
    grossWeightKg: number;
    netWeightKg: number;
    totalToPay: number;
    currency: string;
  };
  onSuccess?: () => void;
  dataTestId?: string;
}

const HANDLING_MODE_OPTIONS: Array<{ value: RemoveReceptionPackHandlingMode; title: string; description: string; icon: string; }> = [
  {
    value: 'adjust',
    title: 'Ajustar stock interno',
    description: 'Descuenta las bandejas del inventario interno sin registrar devolución al productor.',
    icon: 'inventory_2',
  },
  {
    value: 'return',
    title: 'Devolver al productor',
    description: 'Registra la salida de bandejas al productor como devolución asociada a esta recepción.',
    icon: 'u_turn_left',
  },
];

export function DeletePackDialog({
  open,
  onClose,
  receptionId,
  packId,
  summary,
  onSuccess,
  dataTestId,
}: DeletePackDialogProps) {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const { success, error } = useAlert();

  const [handlingMode, setHandlingMode] = useState<RemoveReceptionPackHandlingMode>('adjust');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setHandlingMode('adjust');
      setReason('');
      setNotes('');
      setIsSubmitting(false);
      setErrors([]);
    }
  }, [open]);

  const packSummary = useMemo(() => {
    return {
      packNumber: summary?.packNumber ?? null,
      trayLabel: summary?.trayLabel ?? 'Sin bandeja definida',
      traysQuantity: summary?.traysQuantity ?? 0,
      grossWeightKg: summary?.grossWeightKg ?? 0,
      netWeightKg: summary?.netWeightKg ?? 0,
      totalToPay: summary?.totalToPay ?? 0,
      currency: summary?.currency ?? 'CLP',
    };
  }, [summary]);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setErrors(['Debes indicar un motivo para eliminar el pack.']);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      const result = await removeReceptionPack({
        receptionTransactionId: receptionId,
        packId,
        handlingMode,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        userId: currentUserId,
      });

      if (result.success) {
        success('Pack eliminado correctamente.');
        onClose();
        onSuccess?.();
      } else {
        const message = result.error ?? 'Error al eliminar el pack.';
        error(message);
        setErrors([message]);
      }
    } catch (submitError: any) {
      console.error('[DeletePackDialog] Error al eliminar el pack:', submitError);
      const message = submitError?.message ?? 'Error inesperado al eliminar el pack.';
      error(message);
      setErrors([message]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Eliminar pack de la recepción"
      size="custom"
      maxWidth={960}
      minWidth={640}
      zIndex={150}
      data-test-id={dataTestId ?? 'delete-pack-dialog'}
    >
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-6">
            <section className="bg-orange-50 border border-orange-200 rounded-md p-4 text-sm text-orange-900">
              <p className="font-semibold mb-1">Resumen del pack</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Pack ID: <span className="font-medium">{packId}</span>
                  {packSummary.packNumber !== null ? ` · Nº ${packSummary.packNumber}` : null}
                </li>
                <li>
                  Bandejas: <span className="font-medium">{packSummary.traysQuantity.toLocaleString('es-CL')}</span>
                </li>
                <li>
                  Bandeja: <span className="font-medium">{packSummary.trayLabel}</span>
                </li>
                <li>
                  Peso neto: <span className="font-medium">{packSummary.netWeightKg.toLocaleString('es-CL', { maximumFractionDigits: 2 })} kg</span>
                </li>
                <li>
                  Importe: <span className="font-medium">{packSummary.totalToPay.toLocaleString('es-CL', { maximumFractionDigits: 0 })} {packSummary.currency}</span>
                </li>
              </ul>
            </section>

            <section className="space-y-4">
              <p className="text-sm font-semibold text-gray-700">¿Qué deseas hacer con las bandejas de este pack?</p>
              <div className="space-y-3">
                {HANDLING_MODE_OPTIONS.map((option) => {
                  const selected = handlingMode === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition ${selected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}
                    >
                      <input
                        type="radio"
                        name="pack-handling-mode"
                        value={option.value}
                        checked={selected}
                        onChange={() => setHandlingMode(option.value)}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                          <span className="material-symbols-rounded text-base" aria-hidden>{option.icon}</span>
                          {option.title}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">{option.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="space-y-4">
              <div>
                <label htmlFor="delete-pack-reason" className="block text-sm font-semibold text-gray-700 mb-1">
                  Motivo <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="delete-pack-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Describe por qué eliminas este pack"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label htmlFor="delete-pack-notes" className="block text-sm font-semibold text-gray-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  id="delete-pack-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Notas internas (opcional)"
                  disabled={isSubmitting}
                />
              </div>
            </section>

            {errors.length > 0 && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outlined"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Eliminando…' : 'Eliminar pack'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
