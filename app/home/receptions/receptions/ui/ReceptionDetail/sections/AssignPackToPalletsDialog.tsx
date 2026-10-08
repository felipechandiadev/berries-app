'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { Button } from '@/app/baseComponents/Button/Button';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import DotProgress from '@/app/baseComponents/DotProgress/DotProgress';
import { useAlert } from '@/app/state/hooks/useAlert';
import { assignPackToPallets } from '@/app/actions/receptions';
import PalletPicker, { type PalletPickerSelection } from '@/app/home/receptions/simple/ui/PalletPicker';
import type { ReceptionDetailPack } from '../types';

interface AssignPackToPalletsDialogProps {
  open: boolean;
  onClose: () => void;
  receptionId: string;
  pack: ReceptionDetailPack;
  onSuccess?: () => void;
  dataTestId?: string;
}

const numberFormatter = new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 0,
});

const kgFormatter = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function AssignPackToPalletsDialog({
  open,
  onClose,
  receptionId,
  pack,
  onSuccess,
  dataTestId,
}: AssignPackToPalletsDialogProps) {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const { success, error } = useAlert();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState('');
  const [palletAssignments, setPalletAssignments] = useState<PalletPickerSelection>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const totalAssignedTrays = useMemo(() => {
    return palletAssignments.reduce((acc, item) => acc + item.traysToAssign, 0);
  }, [palletAssignments]);

  const totalAssignedGross = useMemo(() => {
    return palletAssignments.reduce((acc, item) => acc + (item.grossWeightKg || 0), 0);
  }, [palletAssignments]);

  const handlePalletSelectionChange = useCallback((selection: PalletPickerSelection) => {
    setPalletAssignments(selection);
  }, []);

  const handleReset = () => {
    setReason('');
    setPalletAssignments([]);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!currentUserId) {
        error('Usuario no autenticado');
        return;
      }

      if (palletAssignments.length === 0) {
        error('Debe seleccionar al menos un pallet para asignar');
        return;
      }

      if (totalAssignedTrays > pack.traysQuantity) {
        error(
          `No se pueden asignar ${totalAssignedTrays} bandejas cuando el pack solo tiene ${pack.traysQuantity}`
        );
        return;
      }

      if (totalAssignedGross > pack.grossWeightKg + 0.01) {
        error(
          `No se pueden asignar ${kgFormatter.format(totalAssignedGross)} kg cuando el pack solo tiene ${kgFormatter.format(pack.grossWeightKg)} kg`
        );
        return;
      }

      const missingGross = palletAssignments.some(
        (item) => !(item.grossWeightKg > 0) || !(item.traysToAssign > 0)
      );
      if (missingGross) {
        error('Cada pallet debe tener bandejas y kg brutos mayores a 0');
        return;
      }

      if (!reason.trim()) {
        error('Debe proporcionar un motivo para la asignación');
        return;
      }

      const assignments = palletAssignments.map((selection) => ({
        palletId: selection.pallet.id,
        traysAssigned: selection.traysToAssign,
        grossWeightKg: selection.grossWeightKg,
      }));

      const result = await assignPackToPallets({
        receptionId,
        packId: pack.packId,
        palletAssignments: assignments,
        reason: reason.trim(),
        userId: currentUserId,
      });

      if (result.success) {
        success('Pack asignado a pallets exitosamente');
        handleReset();
        onSuccess?.();
        onClose();
      } else {
        error(result.error || 'Error al asignar el pack a los pallets');
      }
    } catch (err: any) {
      error('Error inesperado al asignar el pack a los pallets');
      console.error('Assign pack to pallets error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    palletAssignments.length > 0 &&
    totalAssignedTrays > 0 &&
    totalAssignedTrays <= pack.traysQuantity &&
    totalAssignedGross > 0 &&
    totalAssignedGross <= pack.grossWeightKg + 0.01 &&
    palletAssignments.every((item) => item.traysToAssign > 0 && item.grossWeightKg > 0) &&
    reason.trim() !== '';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Asignar Pack a Pallets"
      size="lg"
      data-test-id={dataTestId}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg bg-gray-50 p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Información del Pack</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Pack:</span>
              <span className="ml-2 font-medium">{pack.packId}</span>
            </div>
            <div>
              <span className="text-gray-600">Tipo de bandeja:</span>
              <span className="ml-2 font-medium">{pack.trayLabel || 'Sin tipo'}</span>
            </div>
            <div>
              <span className="text-gray-600">Total bandejas:</span>
              <span className="ml-2 font-medium">{numberFormatter.format(pack.traysQuantity)}</span>
            </div>
            <div>
              <span className="text-gray-600">Kg brutos:</span>
              <span className="ml-2 font-medium">{kgFormatter.format(pack.grossWeightKg)} kg</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Seleccionar Pallets</h3>
            <p className="text-xs text-gray-600 mt-1">
              Indica bandejas y kg brutos por pallet (no se prorratean automáticamente)
            </p>
          </div>
          <PalletPicker
            expectedTrays={pack.traysQuantity}
            onSelectionChange={handlePalletSelectionChange}
            trayId={pack.trayId}
            refreshTrigger={refreshTrigger}
            captureGrossWeight
          />
        </div>

        {palletAssignments.length > 0 && (
          <div className="rounded-lg bg-blue-50 p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-3">Resumen de Asignación</h3>
            <div className="space-y-2 text-sm">
              {palletAssignments.map(({ pallet, traysToAssign, grossWeightKg }) => (
                <div key={pallet.id} className="flex justify-between gap-2">
                  <span className="text-blue-700">Pallet #{pallet.id}:</span>
                  <span className="font-medium text-blue-900 text-right">
                    {numberFormatter.format(traysToAssign)} ban. ·{' '}
                    {kgFormatter.format(grossWeightKg || 0)} kg
                  </span>
                </div>
              ))}
              <div className="border-t border-blue-200 pt-2 flex justify-between font-semibold">
                <span className="text-blue-700">Total:</span>
                <span
                  className={`${
                    totalAssignedTrays > pack.traysQuantity ||
                    totalAssignedGross > pack.grossWeightKg + 0.01
                      ? 'text-red-700'
                      : 'text-blue-900'
                  }`}
                >
                  {numberFormatter.format(totalAssignedTrays)} /{' '}
                  {numberFormatter.format(pack.traysQuantity)} ban. ·{' '}
                  {kgFormatter.format(totalAssignedGross)} /{' '}
                  {kgFormatter.format(pack.grossWeightKg)} kg
                </span>
              </div>
            </div>
          </div>
        )}

        <TextField
          label="Motivo de la asignación"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          required
          className="w-full"
          placeholder="Explique el motivo de esta asignación de pallets..."
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          {isSubmitting ? (
            <Button variant="primary" type="submit" disabled>
              <div className="flex items-center justify-center min-h-[20px]">
                <DotProgress size={12} />
              </div>
            </Button>
          ) : (
            <Button type="submit" variant="primary" disabled={isSubmitting || !isFormValid}>
              <div className="flex items-center justify-center min-h-[20px]">Asignar a Pallets</div>
            </Button>
          )}
        </div>
      </form>
    </Dialog>
  );
}
