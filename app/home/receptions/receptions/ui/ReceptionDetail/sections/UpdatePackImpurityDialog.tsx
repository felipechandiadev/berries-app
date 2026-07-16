'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { Button } from '@/app/baseComponents/Button/Button';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import DotProgress from '@/app/baseComponents/DotProgress/DotProgress';
import { useAlert } from '@/app/state/hooks/useAlert';
import { updatePackImpurity } from '@/app/actions/receptions';
import type { ReceptionDetailPack } from '../types';

interface UpdatePackImpurityDialogProps {
  open: boolean;
  onClose: () => void;
  receptionId: string;
  pack: ReceptionDetailPack;
  onSuccess?: () => void;
  dataTestId?: string;
}

const numberFormatter = new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 2,
});

const clpCurrencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const usdCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

export function UpdatePackImpurityDialog({
  open,
  onClose,
  receptionId,
  pack,
  onSuccess,
  dataTestId,
}: UpdatePackImpurityDialogProps) {
  const { success, error } = useAlert();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [impurityPercent, setImpurityPercent] = useState(pack.impurityPercent.toString());
  const [reason, setReason] = useState('');

  const currencyFormatter = pack.currency === 'USD' ? usdCurrencyFormatter : clpCurrencyFormatter;

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setImpurityPercent(pack.impurityPercent.toString());
      setReason('');
    }
  }, [open, pack.impurityPercent]);

  // Calculate projected values
  const projectedValues = useMemo(() => {
    const currentImpurity = parseFloat(impurityPercent) || 0;
    const netWeightBeforeImpurities = pack.netWeightBeforeImpuritiesKg;
    const pricePerKg = pack.pricePerKg;

    const newNetWeight = netWeightBeforeImpurities * (1 - currentImpurity / 100);
    const newTotalToPay = newNetWeight * pricePerKg;

    return {
      currentNetWeight: pack.netWeightKg,
      currentTotalToPay: pack.totalToPay,
      projectedNetWeight: newNetWeight,
      projectedTotalToPay: newTotalToPay,
    };
  }, [pack, impurityPercent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const impurityValue = parseFloat(impurityPercent);
      if (isNaN(impurityValue) || impurityValue < 0 || impurityValue > 100) {
        error('El porcentaje de impureza debe ser un número entre 0 y 100');
        return;
      }

      const result = await updatePackImpurity({
        receptionId,
        packId: pack.packId,
        newImpurityPercent: impurityValue,
        reason: reason.trim(),
        userId: currentUserId,
      });

      if (result.success) {
        success('Impureza del pack actualizada exitosamente');
        onClose();
        onSuccess?.();
      } else {
        error(result.error || 'Error al actualizar la impureza del pack');
      }
    } catch (err: any) {
      error('Error inesperado al actualizar la impureza del pack');
      console.error('Update pack impurity error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = impurityPercent.trim() !== '' && reason.trim() !== '' && !isNaN(parseFloat(impurityPercent));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Editar impureza - Pack ${pack.packId}`}
      maxWidth="md"
      data-test-id={dataTestId}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Current values */}
        <div className="rounded-lg bg-neutral-50 p-4">
          <h3 className="text-sm font-medium text-neutral-900 mb-3">Valores actuales</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-neutral-600">Impureza:</span>
              <span className="ml-2 font-medium">{numberFormatter.format(pack.impurityPercent)}%</span>
            </div>
            <div>
              <span className="text-neutral-600">Peso neto:</span>
              <span className="ml-2 font-medium">{numberFormatter.format(pack.netWeightKg)} kg</span>
            </div>
            <div className="col-span-2">
              <span className="text-neutral-600">Total a pagar:</span>
              <span className="ml-2 font-medium">
                {currencyFormatter.format(pack.totalToPay)} {pack.currency}
              </span>
            </div>
          </div>
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          <TextField
            label="Porcentaje de impureza (%)"
            type="number"
            value={impurityPercent}
            onChange={(e) => setImpurityPercent(e.target.value)}
            required
            className="w-full"
          />

          <TextField
            label="Motivo del cambio"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
            className="w-full"
          />
        </div>

        {/* Impact preview */}
        <div className="rounded-lg bg-blue-50 p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-3">Vista previa del impacto</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-700">Nuevo peso neto:</span>
              <span className="ml-2 font-medium text-blue-900">
                {numberFormatter.format(projectedValues.projectedNetWeight)} kg
              </span>
            </div>
            <div>
              <span className="text-blue-700">Nuevo total:</span>
              <span className="ml-2 font-medium text-blue-900">
                {currencyFormatter.format(projectedValues.projectedTotalToPay)} {pack.currency}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          {isSubmitting ? (
            <Button variant="primary" type="submit" disabled>
              <div className="flex items-center justify-center min-h-[20px]">
                <DotProgress size={12} />
              </div>
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !isFormValid}
            >
              <div className="flex items-center justify-center min-h-[20px]">
                Actualizar Impureza
              </div>
            </Button>
          )}
        </div>
      </form>
    </Dialog>
  );
}