'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { 
  ClientOption, 
  VarietyOption, 
  FormatOption, 
  AvailablePallet, 
  SelectedPalletForDispatch,
  DispatchFormTotals 
} from '../types';
import { getCustomersSimpleListWithLabel } from '@/app/actions/customers';
import { getVarietiesWithPriceAndCurrency } from '@/app/actions/varieties';
import { getFormatsSimpleList } from '@/app/actions/formats';
import { getPalletsForDispatch } from '@/app/actions/pallets';
import { createDispatch } from '@/app/actions/dispatches';

interface UseDispatchWithExistingPalletsResult {
  // Options
  clientOptions: ClientOption[];
  varietyOptions: VarietyOption[];
  formatOptions: FormatOption[];
  
  // Filters
  selectedClientId: string | null;
  selectClient: (id: string | null) => void;
  selectedVarietyId: number | null;
  setSelectedVarietyId: (id: number | null) => void;
  filterVarietyId: number | null;
  setFilterVarietyId: (id: number | null) => void;
  filterFormatId: number | null;
  setFilterFormatId: (id: number | null) => void;
  
  // Pricing
  pricePerKgInput: string;
  setPricePerKgInput: (value: string) => void;
  
  // Pallets
  availablePallets: AvailablePallet[];
  isLoadingPallets: boolean;
  selectedPallets: SelectedPalletForDispatch[];
  selectPallet: (palletId: number) => void;
  removePallet: (palletId: number) => void;
  updatePalletGrossWeight: (palletId: number, grossWeight: number) => void;
  updatePalletWeight: (palletId: number, palletWeight: number) => void;
  
  // Totals
  totals: DispatchFormTotals;
  
  // Submission
  isSubmitting: boolean;
  isSessionLoading: boolean;
  isAuthenticated: boolean;
  submit: () => Promise<{ success: boolean; message?: string; error?: string }>;
  reset: () => void;
  refreshPallets: () => void;
}

function computeNetWeightForPallet(pallet: AvailablePallet, grossWeight: number, palletWeight: number): number {
  const traysWeight = pallet.trayWeight * pallet.traysQuantity;
  return Math.max(0, grossWeight - palletWeight - traysWeight);
}

export function useDispatchWithExistingPallets(): UseDispatchWithExistingPalletsResult {
  const { data: session, status } = useSession();
  const currentUserId = (session?.user as any)?.id;
  
  const isSessionLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated' && !!currentUserId;
  
  const [sessionReady, setSessionReady] = useState(false);
  
  useEffect(() => {
    if (status === 'authenticated' && currentUserId) {
      setSessionReady(true);
    } else if (status === 'unauthenticated') {
      setSessionReady(true);
    }
  }, [status, currentUserId]);
  
  const effectiveIsSessionLoading = isSessionLoading || !sessionReady;
  
  // Options state
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [varietyOptions, setVarietyOptions] = useState<VarietyOption[]>([]);
  const [formatOptions, setFormatOptions] = useState<FormatOption[]>([]);
  
  // Filter/selection state
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedVarietyId, setSelectedVarietyId] = useState<number | null>(null);
  const [filterVarietyId, setFilterVarietyId] = useState<number | null>(null);
  const [filterFormatId, setFilterFormatId] = useState<number | null>(null);
  const [pricePerKgInput, setPricePerKgInput] = useState('');
  
  // Pallets state
  const [availablePallets, setAvailablePallets] = useState<AvailablePallet[]>([]);
  const [isLoadingPallets, setIsLoadingPallets] = useState(false);
  const [selectedPallets, setSelectedPallets] = useState<SelectedPalletForDispatch[]>([]);
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load initial options
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [clients, varieties, formats] = await Promise.all([
          getCustomersSimpleListWithLabel(),
          getVarietiesWithPriceAndCurrency(),
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
      } catch (error) {
        console.error('[useDispatchWithExistingPallets] Error loading options', error);
      }
    };

    loadOptions();
  }, []);

  // Load pallets when filters change
  useEffect(() => {
    const loadPallets = async () => {
      setIsLoadingPallets(true);
      try {
        const response = await getPalletsForDispatch({
          varietyId: filterVarietyId,
          formatId: filterFormatId,
        });
        
        if (response.success && response.data) {
          setAvailablePallets(response.data);
        } else {
          console.error('[useDispatchWithExistingPallets] Error loading pallets:', response.error);
          setAvailablePallets([]);
        }
      } catch (error) {
        console.error('[useDispatchWithExistingPallets] Error loading pallets', error);
        setAvailablePallets([]);
      } finally {
        setIsLoadingPallets(false);
      }
    };

    loadPallets();
  }, [filterVarietyId, filterFormatId, refreshTrigger]);

  const selectClient = useCallback((id: string | null) => {
    setSelectedClientId(id);
  }, []);

  const selectPallet = useCallback((palletId: number) => {
    const pallet = availablePallets.find(p => p.id === palletId);
    if (!pallet) return;
    
    // Check if already selected
    if (selectedPallets.some(sp => sp.pallet.id === palletId)) return;
    
    setSelectedPallets(prev => [...prev, {
      pallet,
      grossWeight: 0,
      palletWeight: 0,
      netWeight: 0,
    }]);
  }, [availablePallets, selectedPallets]);

  const removePallet = useCallback((palletId: number) => {
    setSelectedPallets(prev => prev.filter(sp => sp.pallet.id !== palletId));
  }, []);

  const updatePalletGrossWeight = useCallback((palletId: number, grossWeight: number) => {
    setSelectedPallets(prev => prev.map(sp => {
      if (sp.pallet.id !== palletId) return sp;
      const netWeight = computeNetWeightForPallet(sp.pallet, grossWeight, sp.palletWeight);
      return { ...sp, grossWeight, netWeight };
    }));
  }, []);

  const updatePalletWeight = useCallback((palletId: number, palletWeight: number) => {
    setSelectedPallets(prev => prev.map(sp => {
      if (sp.pallet.id !== palletId) return sp;
      const netWeight = computeNetWeightForPallet(sp.pallet, sp.grossWeight, palletWeight);
      return { ...sp, palletWeight, netWeight };
    }));
  }, []);

  const totals = useMemo<DispatchFormTotals>(() => {
    const totalPallets = selectedPallets.length;
    const totalTrays = selectedPallets.reduce((sum, sp) => sum + sp.pallet.traysQuantity, 0);
    const totalNetWeight = selectedPallets.reduce((sum, sp) => sum + sp.netWeight, 0);
    const price = pricePerKgInput ? parseInt(pricePerKgInput, 10) : 0;
    const totalAmount = totalNetWeight > 0 && price > 0 ? Math.round(totalNetWeight * price) : 0;

    return {
      totalPallets,
      totalTrays,
      totalNetWeight: Number(totalNetWeight.toFixed(2)),
      totalAmount,
    };
  }, [selectedPallets, pricePerKgInput]);

  const reset = useCallback(() => {
    setSelectedClientId(null);
    setSelectedVarietyId(null);
    setFilterVarietyId(null);
    setFilterFormatId(null);
    setPricePerKgInput('');
    setSelectedPallets([]);
  }, []);

  const refreshPallets = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const submit = useCallback(async () => {
    if (effectiveIsSessionLoading) {
      return { success: false, error: 'Cargando sesión...' };
    }
    
    if (!isAuthenticated || !currentUserId) {
      return { success: false, error: 'Usuario no autenticado. Por favor, recarga la página e intenta nuevamente.' };
    }
    if (!selectedClientId) {
      return { success: false, error: 'Debes seleccionar un cliente' };
    }
    if (!pricePerKgInput || parseInt(pricePerKgInput, 10) <= 0) {
      return { success: false, error: 'El precio de venta debe ser mayor a 0' };
    }
    if (selectedPallets.length === 0) {
      return { success: false, error: 'Debes seleccionar al menos un pallet' };
    }
    
    const invalidPallets = selectedPallets.filter(sp => sp.grossWeight <= 0);
    if (invalidPallets.length > 0) {
      return { success: false, error: 'Todos los pallets deben tener un peso bruto mayor a 0' };
    }

    setIsSubmitting(true);
    try {
      const payload = {
        clientId: String(selectedClientId),
        varietyId: filterVarietyId ?? undefined,
        formatId: filterFormatId ?? undefined,
        pricePerKg: parseInt(pricePerKgInput, 10),
        pallets: selectedPallets.map((sp) => ({
          palletId: sp.pallet.id,
          trayId: sp.pallet.trayId,
          trayLabel: sp.pallet.trayName,
          trayWeight: sp.pallet.trayWeight,
          trayCount: sp.pallet.traysQuantity,
          palletWeight: sp.palletWeight,
          grossWeight: sp.grossWeight,
          netWeight: sp.netWeight,
        })),
      };

      const response = await createDispatch(payload);
      if (response.success) {
        reset();
        refreshPallets();
      }
      return response;
    } catch (error: any) {
      console.error('[useDispatchWithExistingPallets] Error submitting dispatch', error);
      return { success: false, error: error?.message || 'No fue posible registrar el despacho' };
    } finally {
      setIsSubmitting(false);
    }
  }, [
    effectiveIsSessionLoading, 
    isAuthenticated, 
    currentUserId, 
    selectedClientId, 
    filterVarietyId, 
    filterFormatId, 
    pricePerKgInput, 
    selectedPallets, 
    reset,
    refreshPallets,
  ]);

  return {
    clientOptions,
    varietyOptions,
    formatOptions,
    selectedClientId,
    selectClient,
    selectedVarietyId,
    setSelectedVarietyId,
    filterVarietyId,
    setFilterVarietyId,
    filterFormatId,
    setFilterFormatId,
    pricePerKgInput,
    setPricePerKgInput,
    availablePallets,
    isLoadingPallets,
    selectedPallets,
    selectPallet,
    removePallet,
    updatePalletGrossWeight,
    updatePalletWeight,
    totals,
    isSubmitting,
    isSessionLoading: effectiveIsSessionLoading,
    isAuthenticated,
    submit,
    reset,
    refreshPallets,
  };
}
