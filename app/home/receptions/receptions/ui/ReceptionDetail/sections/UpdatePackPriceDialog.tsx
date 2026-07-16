'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { Button } from '@/app/baseComponents/Button/Button';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import Select from '@/app/baseComponents/Select/Select';
import DotProgress from '@/app/baseComponents/DotProgress/DotProgress';
import { useAlert } from '@/app/state/hooks/useAlert';
import { updatePackPrice } from '@/app/actions/receptions';
import type { ReceptionDetailPack } from '../types';
import { Currency } from '@/data/entities/Variety';

interface UpdatePackPriceDialogProps {
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

const currencyOptions = [
  { id: Currency.CLP, label: 'CLP' },
  { id: Currency.USD, label: 'USD' },
];

function normalizeCurrency(value: string | Currency | null | undefined): Currency {
  if (value === Currency.USD || value === 'USD') {
    return Currency.USD;
  }
  return Currency.CLP;
}

function formatPriceInput(value: number | null | undefined, currency: Currency): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '';
  }

  if (currency === Currency.USD) {
    const fixedValue = value.toFixed(2);
    const [integerPart, decimalPart = '00'] = fixedValue.split('.');
    return `${integerPart},${decimalPart}`;
  }

  return Math.trunc(value).toString();
}

function parsePriceInput(input: string): number {
  if (!input.trim()) {
    return Number.NaN;
  }

  const normalized = input.replace(/\./g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

export function UpdatePackPriceDialog({
  open,
  onClose,
  receptionId,
  pack,
  onSuccess,
  dataTestId,
}: UpdatePackPriceDialogProps) {
  const { success, error } = useAlert();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const resolvedPackCurrency = normalizeCurrency(pack.currency);
  const [currency, setCurrency] = useState<Currency>(() => resolvedPackCurrency);
  const [priceInput, setPriceInput] = useState<string>(() =>
    formatPriceInput(pack.pricePerKg, resolvedPackCurrency)
  );
  const [reason, setReason] = useState('');
  const isUserEditingPriceRef = useRef(false);
  const priceValue = useMemo(() => parsePriceInput(priceInput), [priceInput]);
  const allowDecimalComma = currency === Currency.USD;
  const currencySymbol = currency === Currency.USD ? 'US$' : '$';
  const currentCurrencyFormatter =
    resolvedPackCurrency === Currency.USD ? usdCurrencyFormatter : clpCurrencyFormatter;
  const newCurrencyFormatter = currency === Currency.USD ? usdCurrencyFormatter : clpCurrencyFormatter;

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCurrency(resolvedPackCurrency);
      setPriceInput(formatPriceInput(pack.pricePerKg, resolvedPackCurrency));
      setReason('');
      isUserEditingPriceRef.current = false;
    }
  }, [open, pack.pricePerKg, resolvedPackCurrency]);

  useEffect(() => {
    setPriceInput((prev) => {
      const parsed = parsePriceInput(prev);
      if (Number.isNaN(parsed)) {
        return prev;
      }
      return formatPriceInput(parsed, currency);
    });
    isUserEditingPriceRef.current = false;
  }, [currency]);

  // Calculate projected values
  const projectedValues = useMemo(() => {
    const effectivePrice = Number.isNaN(priceValue) ? 0 : priceValue;
    const netWeight = pack.netWeightKg;

    const newTotalToPay = netWeight * effectivePrice;

    return {
      currentPricePerKg: pack.pricePerKg,
      currentTotalToPay: pack.totalToPay,
      currentCurrency: resolvedPackCurrency,
      projectedPricePerKg: effectivePrice,
      projectedTotalToPay: newTotalToPay,
      projectedCurrency: currency,
    };
  }, [pack, priceValue, currency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const parsedPrice = parsePriceInput(priceInput);
      if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
        error('El precio por kg debe ser un número mayor o igual a 0');
        return;
      }

      const result = await updatePackPrice({
        receptionId,
        packId: pack.packId,
        newPricePerKg: parsedPrice,
        newCurrency: currency,
        reason: reason.trim(),
        userId: currentUserId,
      });

      if (result.success) {
        success('Precio del pack actualizado exitosamente');
        onClose();
        onSuccess?.();
      } else {
        error(result.error || 'Error al actualizar el precio del pack');
      }
    } catch (err: any) {
      error('Error inesperado al actualizar el precio del pack');
      console.error('Update pack price error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    priceInput.trim() !== '' &&
    reason.trim() !== '' &&
    !Number.isNaN(priceValue) &&
    priceValue >= 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Editar precio - Pack ${pack.packId}`}
      maxWidth="md"
      data-test-id={dataTestId}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Current values */}
        <div className="rounded-lg bg-neutral-50 p-4">
          <h3 className="text-sm font-medium text-neutral-900 mb-3">Valores actuales</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-neutral-600">Precio por kg:</span>
              <span className="ml-2 font-medium">{currentCurrencyFormatter.format(pack.pricePerKg)} {pack.currency}</span>
            </div>
            <div>
              <span className="text-neutral-600">Peso neto:</span>
              <span className="ml-2 font-medium">{numberFormatter.format(pack.netWeightKg)} kg</span>
            </div>
            <div className="col-span-2">
              <span className="text-neutral-600">Total a pagar:</span>
              <span className="ml-2 font-medium">
                {currentCurrencyFormatter.format(pack.totalToPay)} {pack.currency}
              </span>
            </div>
          </div>
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <Select
              label="Moneda"
              options={currencyOptions}
              value={currency}
              onChange={(value) => {
                if (value) {
                  setCurrency(normalizeCurrency(value as Currency));
                }
              }}
              required
              data-test-id="price-currency-select"
            />

            <TextField
              label={`Precio por kg (${currency})`}
              type="currency"
              currencySymbol={currencySymbol}
              value={priceInput}
              onChange={(e) => {
                const rawValue = e.target.value;
                isUserEditingPriceRef.current = true;
                setPriceInput(rawValue);
              }}
              allowDecimalComma={allowDecimalComma}
              required
              className="w-full"
            />
          </div>

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
          <div className="grid grid-cols-1 gap-4 text-sm">
            <div>
              <span className="text-blue-700">Nuevo precio por kg:</span>
              <span className="ml-2 font-medium text-blue-900">
                {newCurrencyFormatter.format(projectedValues.projectedPricePerKg)} {currency}
              </span>
            </div>
            <div>
              <span className="text-blue-700">Nuevo total a pagar:</span>
              <span className="ml-2 font-medium text-blue-900">
                {newCurrencyFormatter.format(projectedValues.projectedTotalToPay)} {currency}
              </span>
            </div>
            {projectedValues.currentCurrency !== projectedValues.projectedCurrency && (
              <div className="text-xs text-blue-600 mt-2 p-2 bg-blue-100 rounded">
                ⚠️ Cambiando moneda de {projectedValues.currentCurrency} a {projectedValues.projectedCurrency}
              </div>
            )}
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
                Actualizar Precio
              </div>
            </Button>
          )}
        </div>
      </form>
    </Dialog>
  );
}