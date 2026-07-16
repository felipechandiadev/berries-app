'use client';

import { useMemo, useState } from 'react';
import { formatAuditDate } from '@/lib/dateTimeUtils';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { Button } from '@/app/baseComponents/Button/Button';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import { updateReceptionDate } from '@/app/actions/receptions';
import { useAlert } from '@/app/state/hooks/useAlert';
import { useSession } from 'next-auth/react';
import { usePermissions } from '@/app/state/hooks/usePermissions';
import type {
  ReceptionDetailSummary,
  ReceptionDetailDocumentInfo,
  ReceptionDetailProducerInfo,
  ReceptionDetailPack,
} from '../types';

interface GeneralInfoSectionProps {
  summary: ReceptionDetailSummary;
  documents: ReceptionDetailDocumentInfo;
  producer: ReceptionDetailProducerInfo | null;
  packs: ReceptionDetailPack[];
  onRefresh?: () => void;
  isSettled?: boolean;
}

export function GeneralInfoSection({ summary, documents, producer, packs, onRefresh, isSettled = false }: GeneralInfoSectionProps) {
  const [isEditDateDialogOpen, setIsEditDateDialogOpen] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const { success, error: showError } = useAlert();
  const { has } = usePermissions();

  const canEditDate = has('RECEPTIONS_UPDATE_DATE') && !isSettled;

  const generalInfoRows = useMemo(() => {
    const dni = producer?.dni ?? producer?.personDni ?? '—';
    return [
      {
        key: 'producer',
        label: 'Productor',
        value: producer?.name ?? summary.producerName ?? '—',
      },
      {
        key: 'rut',
        label: 'RUT',
        value: dni && dni.trim().length > 0 ? dni : '—',
      },
      {
        key: 'guide',
        label: 'Guía',
        value: documents.guideNumber ?? summary.guideNumber ?? '—',
      },
      {
        key: 'driver',
        label: 'Entregado por',
        value: summary.driver && summary.driver.trim().length > 0 ? summary.driver : '—',
      },
      {
        key: 'season',
        label: 'Temporada',
        value: summary.seasonName ?? '—',
      },
      {
        key: 'registeredBy',
        label: 'Registrada por',
        value: summary.createdByName ?? '—',
      },
    ];
  }, [documents.guideNumber, producer, summary.createdByName, summary.driver, summary.guideNumber, summary.producerName, summary.seasonName]);

  const hasMultiplePacks = packs.length > 1;

  const handleEditDate = () => {
    const currentDate = summary.createdAt ? new Date(summary.createdAt).toISOString().slice(0, 16) : '';
    setNewDate(currentDate);
    setReason('');
    setIsEditDateDialogOpen(true);
  };

  const handleSaveDate = async () => {
    if (!reason.trim()) {
      showError('Debe proporcionar un motivo para el cambio de fecha');
      return;
    }

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
      const result = await updateReceptionDate({
        receptionId: summary.id,
        newDate,
        reason: reason.trim(),
        userId: currentUserId,
      });

      if (result.success) {
        success('Fecha de recepción actualizada correctamente');
        setIsEditDateDialogOpen(false);
        onRefresh?.();
      } else {
        showError(result.error || 'Error al actualizar la fecha');
      }
    } catch (err: any) {
      console.error('Error updating reception date:', err);
      showError('Error inesperado al actualizar la fecha');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <section className="space-y-3">
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-md">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wide text-gray-500">Recepción</p>
              <p className="text-xl font-semibold text-gray-900">#{summary.id}</p>
              {hasMultiplePacks ? (
                <p className="mt-1 text-xs text-amber-600">⚠️ Esta recepción contiene más de un conjunto de datos internos.</p>
              ) : null}
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-gray-500">Fecha de registro</p>
              <div className="text-sm font-medium text-gray-900">
                {summary.createdAt ? formatAuditDate(summary.createdAt) : '—'}
              </div>
              {summary.updatedAt && summary.updatedAt !== summary.createdAt ? (
                <p className="mt-1 text-xs text-gray-500">Actualizada {formatAuditDate(summary.updatedAt)}</p>
              ) : null}
            </div>

            {has('RECEPTIONS_UPDATE_DATE') && (
              <div className="flex items-center">
                <IconButton
                  icon="edit"
                  variant="basicSecondary"
                  size="sm"
                  title={isSettled ? "No se puede editar fecha: recepción liquidada" : "Editar fecha de registro"}
                  onClick={handleEditDate}
                  disabled={!canEditDate}
                />
              </div>
            )}
          </div>

          <hr className="border-gray-100" />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {generalInfoRows.map((row) => (
              <div key={row.key} className="flex flex-col">
                <span className="text-xs uppercase tracking-wide text-gray-500">{row.label}</span>
                <span className="text-sm font-medium text-gray-900">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Dialog
        open={isEditDateDialogOpen}
        onClose={() => !isSaving && setIsEditDateDialogOpen(false)}
        title="Editar fecha y hora de recepción"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div>
            <TextField
              label="Nueva fecha y hora"
              type="datetime-local"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              required
              disabled={isSaving}
            />
          </div>
          <div>
            <TextField
              label="Motivo del cambio"
              type="textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explique por qué necesita cambiar la fecha..."
              rows={3}
              required
              disabled={isSaving}
            />
          </div>
          <div className="text-sm text-gray-600">
            <p>Fecha actual: {summary.createdAt ? formatAuditDate(summary.createdAt) : 'No disponible'}</p>
            <p className="text-xs mt-1 text-amber-600">
              ⚠️ Este cambio afectará reportes históricos y auditoría
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outlined"
              onClick={() => setIsEditDateDialogOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveDate}
              disabled={isSaving}
            >
              {isSaving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
