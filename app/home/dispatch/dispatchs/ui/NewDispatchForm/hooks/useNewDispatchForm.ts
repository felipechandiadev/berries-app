'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { ClientOption, VarietyOption, TrayOption, FormatOption, DispatchPalletForm, DispatchFormTotals } from '../types';
import { createEmptyPallet, computeNetWeight } from '../helpers';
import { getCustomersSimpleListWithLabel } from '@/app/actions/customers';
import { getVarietiesWithPriceAndCurrency } from '@/app/actions/varieties';
import { getTraysSimpleList } from '@/app/actions/trays';
import { getFormatsSimpleList } from '@/app/actions/formats';
import { createDispatch } from '../../../../../../actions/dispatches';

interface UseNewDispatchFormResult {
  clientOptions: ClientOption[];
  selectedClientId: string | null;
  selectClient: (id: string | null) => void;
  varietyOptions: VarietyOption[];
  selectedVarietyId: number | null;
  selectVariety: (id: number | null) => void;
  formatOptions: FormatOption[];
  selectedFormatId: number | null;
  selectFormat: (id: number | null) => void;
  trayOptions: TrayOption[];
  pricePerKgInput: string;
  setPricePerKgInput: (value: string) => void;
  pallets: DispatchPalletForm[];
  addPallet: () => void;
  removePallet: (id: string) => void;
  updatePallet: (id: string, changes: Partial<DispatchPalletForm>) => void;
  totals: DispatchFormTotals;
  isSubmitting: boolean;
  isSessionLoading: boolean;
  isAuthenticated: boolean;
  submit: () => Promise<{ success: boolean; message?: string; error?: string }>;
  reset: () => void;
}

function normalizeCurrencyInput(value: string): string {
  return value.replace(/[^0-9]/g, '');
}

export function useNewDispatchForm(): UseNewDispatchFormResult {
  const { data: session, status } = useSession();
  const currentUserId = (session?.user as any)?.id;
  
  const isSessionLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated' && !!currentUserId;
  
  // Add a small delay to ensure session is fully loaded
  const [sessionReady, setSessionReady] = useState(false);
  
  useEffect(() => {
    if (status === 'authenticated' && currentUserId) {
      setSessionReady(true);
    } else if (status === 'unauthenticated') {
      setSessionReady(true); // Even if unauthenticated, session is "ready"
    }
  }, [status, currentUserId]);
  
  const effectiveIsSessionLoading = isSessionLoading || !sessionReady;
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [varietyOptions, setVarietyOptions] = useState<VarietyOption[]>([]);
  const [selectedVarietyId, setSelectedVarietyId] = useState<number | null>(null);
  const [formatOptions, setFormatOptions] = useState<FormatOption[]>([]);
  const [selectedFormatId, setSelectedFormatId] = useState<number | null>(null);
  const [trayOptions, setTrayOptions] = useState<TrayOption[]>([]);
  const [pallets, setPallets] = useState<DispatchPalletForm[]>([]);
  const [pricePerKgInput, setPricePerKgInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [clients, varieties, trays, formats] = await Promise.all([
          getCustomersSimpleListWithLabel(),
          getVarietiesWithPriceAndCurrency(),
          getTraysSimpleList(),
          getFormatsSimpleList(),
        ]);

        setClientOptions(clients);
        setVarietyOptions(varieties.map((variety) => ({
          id: variety.id,
          label: variety.label,
        })));
        setFormatOptions(formats.map((format) => ({
          id: format.id,
          label: format.label,
          priceCLP: format.priceCLP,
          priceUSD: format.priceUSD,
        })));
        setTrayOptions(trays.map((tray) => ({ id: tray.id, label: `${tray.label} (${tray.weight?.toFixed(2)} kg)`, weight: tray.weight })));
      } catch (error) {
        console.error('[useNewDispatchForm] Error loading options', error);
      }
    };

    loadOptions();
  }, []);

  const selectClient = useCallback((id: string | null) => {
    setSelectedClientId(id);
  }, []);

  const selectVariety = useCallback((id: number | null) => {
    setSelectedVarietyId(id);
  }, []);

  const selectFormat = useCallback((id: number | null) => {
    setSelectedFormatId(id);
  }, []);

  const addPallet = useCallback(() => {
    setPallets((prev) => [...prev, createEmptyPallet()]);
  }, []);

  const removePallet = useCallback((id: string) => {
    setPallets((prev) => (prev.length === 1 ? prev : prev.filter((pallet) => pallet.id !== id)));
  }, []);

  const updatePallet = useCallback((id: string, changes: Partial<DispatchPalletForm>) => {
    setPallets((prev) => prev.map((pallet) => {
      if (pallet.id !== id) return pallet;
      const updated: DispatchPalletForm = { ...pallet, ...changes };
      updated.netWeight = computeNetWeight(updated);
      return updated;
    }));
  }, []);

  const totals = useMemo<DispatchFormTotals>(() => {
    const totalPallets = pallets.length;
    const totalTrays = pallets.reduce((sum, pallet) => sum + (pallet.trayCount || 0), 0);
    const totalNetWeight = pallets.reduce((sum, pallet) => sum + (pallet.netWeight || 0), 0);
    const price = pricePerKgInput ? parseInt(pricePerKgInput, 10) : 0;
    const totalAmount = totalNetWeight > 0 && price > 0 ? Math.round(totalNetWeight * price) : 0;

    return {
      totalPallets,
      totalTrays,
      totalNetWeight: Number(totalNetWeight.toFixed(2)),
      totalAmount,
    };
  }, [pallets, pricePerKgInput]);

  const reset = useCallback(() => {
    setSelectedClientId(null);
    setSelectedVarietyId(null);
    setSelectedFormatId(null);
    setPricePerKgInput('');
    setPallets([]);
  }, []);

  const submit = useCallback(async () => {
    if (effectiveIsSessionLoading) {
      return { success: false, error: 'Cargando sesión...' };
    }
    
    if (!isAuthenticated || !currentUserId) {
      console.log('[useNewDispatchForm] Session not ready or user not authenticated');
      return { success: false, error: 'Usuario no autenticado. Por favor, recarga la página e intenta nuevamente.' };
    }
    if (!selectedClientId) {
      return { success: false, error: 'Debes seleccionar un cliente' };
    }
    if (!pricePerKgInput || parseInt(pricePerKgInput, 10) <= 0) {
      return { success: false, error: 'El precio de venta debe ser mayor a 0' };
    }
    if (pallets.length === 0 || pallets.some((pallet) => !pallet.trayId || pallet.trayCount <= 0 || pallet.grossWeight <= 0)) {
      return { success: false, error: 'Completa al menos un pallet válido' };
    }
    if (!currentUserId) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    setIsSubmitting(true);
    try {
      const payload = {
        clientId: String(selectedClientId),
        varietyId: selectedVarietyId ?? undefined,
        formatId: selectedFormatId ?? undefined,
        pricePerKg: parseInt(pricePerKgInput, 10),
        pallets: pallets.map((pallet) => ({
          trayId: pallet.trayId,
          trayLabel: pallet.trayLabel,
          trayWeight: pallet.trayWeight ?? undefined,
          trayCount: pallet.trayCount,
          palletWeight: pallet.palletWeight,
          grossWeight: pallet.grossWeight,
          netWeight: pallet.netWeight,
        })),
      };

      const response = await createDispatch(payload);
      if (response.success) {
        reset();
      }
      return response;
    } catch (error: any) {
      console.error('[useNewDispatchForm] Error submitting dispatch', error);
      return { success: false, error: error?.message || 'No fue posible registrar el despacho' };
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedClientId, selectedVarietyId, pricePerKgInput, pallets, currentUserId, reset]);

  return {
    clientOptions,
    selectedClientId,
    selectClient,
    varietyOptions,
    selectedVarietyId,
    selectVariety,
    formatOptions,
    selectedFormatId,
    selectFormat,
    trayOptions,
    pricePerKgInput,
    setPricePerKgInput,
    pallets,
    addPallet,
    removePallet,
    updatePallet,
    totals,
    isSubmitting,
    isSessionLoading: effectiveIsSessionLoading,
    isAuthenticated,
    submit,
    reset,
  };
}
