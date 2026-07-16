'use client';

import React, { useCallback, useMemo } from 'react';
import Select from '@/app/baseComponents/Select/Select';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import { Button } from '@/app/baseComponents/Button/Button';
import { useAlert } from '@/app/state/hooks/useAlert';
import PalletSelector from './components/PalletSelector';
import SelectedPalletCard from './components/SelectedPalletCard';
import SummaryCard from './components/SummaryCard';
import { useDispatchWithExistingPallets } from './hooks/useDispatchWithExistingPallets';
import { currencyFormatterCLP } from './helpers';

const NewDispatchForm: React.FC = () => {
  const {
    clientOptions,
    selectedClientId,
    selectClient,
    varietyOptions,
    filterVarietyId,
    setFilterVarietyId,
    selectedVarietyId,
    setSelectedVarietyId,
    formatOptions,
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
    isSessionLoading,
    isAuthenticated,
    submit,
    refreshPallets,
  } = useDispatchWithExistingPallets();
  const { success, error: showError } = useAlert();

  const pricePerKg = useMemo(() => pricePerKgInput ? parseInt(pricePerKgInput, 10) : 0, [pricePerKgInput]);

  const handleSubmit = useCallback(async () => {
    if (isSessionLoading || !isAuthenticated) {
      showError('Sesión no cargada completamente. Por favor, espera un momento e intenta nuevamente.');
      return;
    }
    
    const response = await submit();
    if (response.success) {
      success('Despacho procesado correctamente');
    } else if (response.error) {
      showError(response.error);
    }
  }, [submit, success, showError, isSessionLoading, isAuthenticated]);

  const isProcessDisabled = useMemo(() => {
    if (isSessionLoading || !isAuthenticated) return true;
    if (!selectedClientId) return true;
    if (!selectedVarietyId) return true;
    if (!pricePerKg || pricePerKg <= 0) return true;
    if (selectedPallets.length === 0) return true;
    return selectedPallets.some((sp) => sp.grossWeight <= 0);
  }, [isSessionLoading, isAuthenticated, selectedClientId, selectedVarietyId, pricePerKg, selectedPallets]);

  const selectedPalletIds = useMemo(() => 
    selectedPallets.map(sp => sp.pallet.id), 
    [selectedPallets]
  );

  return (
    <div className="flex flex-col gap-6" data-test-id="new-dispatch-form">
      {/* Header: Cliente, Variedad y Precio */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Select
          label="Cliente"
          placeholder="Selecciona un cliente"
          options={clientOptions}
          value={selectedClientId}
          onChange={(value) => selectClient(value ? String(value) : null)}
          required
          data-test-id="dispatch-client"
          allowClear
        />
        <Select
          label="Variedad"
          placeholder="Selecciona una variedad"
          options={varietyOptions}
          value={selectedVarietyId}
          onChange={(value) => setSelectedVarietyId(value ? Number(value) : null)}
          required
          data-test-id="dispatch-variety"
          allowClear
        />
        <TextField
          label="Precio de venta (CLP/kg)"
          type="currency"
          currencySymbol="$"
          value={pricePerKgInput}
          onChange={(e) => setPricePerKgInput(e.target.value)}
          placeholder="0"
          required
          data-test-id="dispatch-price"
        />
        <Select
          label="Filtrar por variedad"
          options={varietyOptions}
          value={filterVarietyId}
          onChange={(value) => setFilterVarietyId(value ? Number(value) : null)}
          allowClear
          placeholder="Todas las variedades"
          data-test-id="dispatch-filter-variety"
        />
      </section>

      {/* Layout de dos columnas: Pallets disponibles (izq) y Seleccionados (der) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Selector de pallets disponibles - siempre visible */}
        <section className="rounded-lg border border-border bg-gray-50 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">Pallets disponibles</h3>
              <p className="text-sm text-muted-foreground">
                Selecciona los pallets que deseas despachar
              </p>
            </div>
            <Button
              variant="outlined"
              className="inline-flex items-center gap-1 rounded-full px-3 py-1"
              onClick={refreshPallets}
              data-test-id="dispatch-refresh-pallets"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Actualizar
            </Button>
          </div>
          <PalletSelector
            availablePallets={availablePallets}
            selectedPalletIds={selectedPalletIds}
            onSelect={selectPallet}
            isLoading={isLoadingPallets}
          />
        </section>

        {/* Pallets seleccionados */}
        <section className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Pallets para despacho ({selectedPallets.length})
              </h3>
              <p className="text-sm text-muted-foreground">
                {selectedPallets.length > 0 
                  ? 'Ingresa el peso bruto de cada pallet'
                  : 'Agrega pallets desde la lista de disponibles'}
              </p>
            </div>
          </div>
          {selectedPallets.length > 0 ? (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {selectedPallets.map((item, index) => (
                <SelectedPalletCard
                  key={item.pallet.id}
                  item={item}
                  index={index}
                  onGrossWeightChange={(weight) => updatePalletGrossWeight(item.pallet.id, weight)}
                  onPalletWeightChange={(weight) => updatePalletWeight(item.pallet.id, weight)}
                  onRemove={() => removePallet(item.pallet.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <span className="material-symbols-outlined text-5xl mb-3">inventory_2</span>
              <p className="text-sm">No hay pallets seleccionados</p>
              <p className="text-xs mt-1">Haz clic en un pallet disponible para agregarlo</p>
            </div>
          )}
        </section>
      </div>

      <SummaryCard totals={totals} pricePerKg={pricePerKg} />

      <div className="flex justify-end mb-12">
        <Button
          variant="primary"
          disabled={isProcessDisabled || isSubmitting}
          onClick={handleSubmit}
          data-test-id="dispatch-submit"
        >
          {isSessionLoading ? 'Cargando sesión...' : isSubmitting ? 'Procesando...' : `Procesar despacho${totals.totalAmount > 0 ? ` (${currencyFormatterCLP.format(totals.totalAmount)})` : ''}`}
        </Button>
      </div>
    </div>
  );
};

export default NewDispatchForm;
