'use client';
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import VarietySelector from './detailCardComponents/VarietySelector';
import FormatSelector from './detailCardComponents/FormatSelector';
import TraySelector from './detailCardComponents/TraySelector';
import TraysQuantityStepper from './detailCardComponents/TraysQuantityStepper';
import GrossWeightInput from './detailCardComponents/GrossWeightInput';
import ImpurityPercent from './detailCardComponents/ImpurityPercent';
import { Currency } from '@/data/entities/Variety';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import PalletPicker, { type PalletPickerSelection } from './PalletPicker';
import CreatePalletDialog from './detailCardComponents/CreatePalletDialog';

type ReceptionDetailsState = {
  varietyId: number | null;
  formatId: number | null;
  trayId: string | null;
  trayLabel: string | null;
  traysQuantity: number;
  impurityPercent: number;
  price: number;
  currency: Currency;
  grossWeight: number;
  palletAssignments: Array<{ palletId: number; traysAssigned: number }>;
};
type DetailReceptionSummary = ReceptionDetailsState & {
  unitTrayWeight: number;
  traysTotalWeight: number;
  netWeightBeforeImpurities: number;
  netWeight: number;
  totalToPay: number;
  varietyName: string | null;
  formatName: string | null;
};

export type { DetailReceptionSummary };


interface DetailReceptionCardProps {
  packNumber?: number;
  isMultipack?: boolean; // Nueva prop para distinguir el contexto
  onRemove?: () => void;
  onChange?: (details: DetailReceptionSummary) => void;
  varietyOptions: { id: number; label: string }[];
  formatOptions: { id: number; label: string; priceCLP: number; priceUSD: number }[];
  trayOptions: { id: string; label: string; weight: number }[];
  showRemoveButton?: boolean; // Nuevo: por defecto oculto
}

const DetailReceptionCard: React.FC<DetailReceptionCardProps> = ({ packNumber, isMultipack = false, onRemove, onChange, varietyOptions, formatOptions, trayOptions, showRemoveButton = false }) => {
  const [receptionDetails, setReceptionDetails] = useState<ReceptionDetailsState>({
    varietyId: null as number | null,
    formatId: null as number | null,
    trayId: null as string | null,
    trayLabel: null,
    traysQuantity: 0,
    impurityPercent: 0,
    price: 0, // Add price to receptionDetails
    currency: Currency.CLP, // Default to CLP currency
    grossWeight: 0,
    palletAssignments: [] as Array<{ palletId: number; traysAssigned: number }>,
  });
  const [unitTrayWeight, setUnitTrayWeight] = useState(0);
  const [showImpurityWeight, setShowImpurityWeight] = useState(false);
  const [palletAssignments, setPalletAssignments] = useState<PalletPickerSelection>([]);
  const [isPalletPickerOpen, setIsPalletPickerOpen] = useState(false);
  const [createPalletDialogOpen, setCreatePalletDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const varietyName = useMemo(() => {
    if (receptionDetails.varietyId === null) return null;
    const option = varietyOptions.find((option) => option.id === receptionDetails.varietyId);
    return option?.label ?? null;
  }, [receptionDetails.varietyId, varietyOptions]);

  const formatName = useMemo(() => {
    if (receptionDetails.formatId === null) return null;
    const option = formatOptions.find((option) => option.id === receptionDetails.formatId);
    return option?.label ?? null;
  }, [receptionDetails.formatId, formatOptions]);

  const prevSummaryRef = useRef<string>('');

  useEffect(() => {
    if (!onChange) {
      return;
    }

    const traysTotalWeightCalculated = unitTrayWeight > 0 && receptionDetails.traysQuantity > 0
      ? unitTrayWeight * receptionDetails.traysQuantity
      : 0;

    const grossWeightValue = receptionDetails.grossWeight > 0 ? receptionDetails.grossWeight : 0;
    const netWeightBeforeImpuritiesValue = Math.max(grossWeightValue - traysTotalWeightCalculated, 0);
    const impurityFractionValue = receptionDetails.impurityPercent > 0 ? receptionDetails.impurityPercent / 100 : 0;
    const netWeightValue = Math.max(netWeightBeforeImpuritiesValue - netWeightBeforeImpuritiesValue * impurityFractionValue, 0);
    const totalToPayValue = receptionDetails.price > 0 && netWeightValue > 0
      ? netWeightValue * receptionDetails.price
      : 0;

    const newSummary: DetailReceptionSummary = {
      ...receptionDetails,
      unitTrayWeight,
      traysTotalWeight: traysTotalWeightCalculated,
      netWeightBeforeImpurities: netWeightBeforeImpuritiesValue,
      netWeight: netWeightValue,
      totalToPay: totalToPayValue,
      varietyName,
      formatName,
    };

    const summaryString = JSON.stringify(newSummary);
    if (summaryString !== prevSummaryRef.current) {
      prevSummaryRef.current = summaryString;
      onChange(newSummary);
    }
  }, [receptionDetails, unitTrayWeight, onChange, varietyName, formatName]);

  const handleVarietyChange = (id: number | null) => {
    setReceptionDetails((prev) => ({
      ...prev,
      varietyId: id,
    }));
  };

  const handleFormatChange = (id: number | null, price: number, currency: Currency | null) => {
    setReceptionDetails((prev) => ({
      ...prev,
      formatId: id,
      price: price,
      currency: currency || Currency.CLP, // Default to CLP if currency is null
    }));
  };


  const handleTrayChange = (id: string | null, weight: number, label: string | null) => {
    setUnitTrayWeight(weight);
    setReceptionDetails((prev) => ({
      ...prev,
      trayId: id,
      trayLabel: label,
      palletAssignments: [],
    }));
    setPalletAssignments([]);
    setIsPalletPickerOpen(false);
  };

  const handlePalletSelectionChange = useCallback((selection: PalletPickerSelection) => {
    setPalletAssignments(selection);

    setReceptionDetails((prev) => {
      const normalized = selection.map(({ pallet, traysToAssign }) => ({
        palletId: pallet.id,
        traysAssigned: traysToAssign,
      }));

      const unchanged =
        prev.palletAssignments.length === normalized.length &&
        prev.palletAssignments.every((item, index) => {
          const nextItem = normalized[index];
          return (
            nextItem !== undefined &&
            item.palletId === nextItem.palletId &&
            item.traysAssigned === nextItem.traysAssigned
          );
        });

      if (unchanged) {
        return prev;
      }

      return {
        ...prev,
        palletAssignments: normalized,
      };
    });
  }, []);

  const handleQuantityChange = (quantity: number) => {
    setReceptionDetails((prev) => ({ ...prev, traysQuantity: quantity }));
  };

  const handleImpurityToggle = (checked: boolean) => {
    setShowImpurityWeight(checked);
  };

  const handleImpurityChange = (percent: number) => {
    setReceptionDetails((prev) => ({ ...prev, impurityPercent: percent }));
  };

  const handleGrossWeightChange = (weight: number) => {
    setReceptionDetails((prev) => ({ ...prev, grossWeight: weight }));
  };

  const traysTotalWeight = unitTrayWeight > 0 && receptionDetails.traysQuantity > 0
    ? unitTrayWeight * receptionDetails.traysQuantity
    : 0;

  const grossWeight = receptionDetails.grossWeight > 0 ? receptionDetails.grossWeight : 0;
  const netWeightBeforeImpurities = Math.max(grossWeight - traysTotalWeight, 0);
  const impurityFraction = receptionDetails.impurityPercent > 0 ? receptionDetails.impurityPercent / 100 : 0;
  const netWeight = Math.max(netWeightBeforeImpurities - netWeightBeforeImpurities * impurityFraction, 0);
  const totalToPay = receptionDetails.price > 0 && netWeight > 0
    ? netWeight * receptionDetails.price
    : 0;

  const currencySymbol = receptionDetails.currency === Currency.USD ? 'US$' : '$';

  const totalAssignedToPallets = useMemo(() => (
    palletAssignments.reduce((acc, item) => acc + item.traysToAssign, 0)
  ), [palletAssignments]);

  const formatNumber = (value: number, decimals = 2) =>
    new Intl.NumberFormat('es-CL', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);

  const formatTotal = (value: number) => {
    if (receptionDetails.currency === Currency.CLP) {
      return new Intl.NumberFormat('es-CL', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }

    return formatNumber(value, 2);
  };

  return (
    <div className="p-5 rounded-lg bg-white w-full" data-test-id="reception-pack-card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {isMultipack && packNumber !== undefined ? `Pack ${packNumber}` : 'Detalle de Recepción'}
        </h3>
        {onRemove && (
          <IconButton
            icon="delete"
            onClick={onRemove}
            variant="text"
            className="text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
            title="Eliminar pack"
          />
        )}
      </div>

      <div className="flex flex-col gap-1 w-full">
        <div className="space-y-2 w-full">
          <VarietySelector
            varietyId={receptionDetails.varietyId}
            onVarietyChange={handleVarietyChange}
            dataTestIdPrefix="pack"
            varietyOptions={varietyOptions}
          />

          <FormatSelector
            formatId={receptionDetails.formatId}
            onFormatChange={handleFormatChange}
            onPriceChange={(price) => setReceptionDetails((prev) => ({ ...prev, price }))}
            onCurrencyChange={(currency) => setReceptionDetails((prev) => ({ ...prev, currency }))}
            currentPrice={receptionDetails.price}
            currentCurrency={receptionDetails.currency}
            dataTestIdPrefix="pack"
            formatOptions={formatOptions}
          />

          <TraySelector
            trayId={receptionDetails.trayId}
            onTrayChange={handleTrayChange}
            dataTestIdPrefix="pack"
            trayOptions={trayOptions}
          />

          <div className="mt-4">
            <TraysQuantityStepper
              traysQuantity={receptionDetails.traysQuantity}
              unitTrayWeight={unitTrayWeight}
              onQuantityChange={handleQuantityChange}
            />
          </div>

          {/* Pallet Section - bajo la sección de bandejas */}
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setIsPalletPickerOpen((prev) => !prev)}
              disabled={!receptionDetails.trayId || receptionDetails.traysQuantity === 0}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-transform transition-colors duration-150 ${
                !receptionDetails.trayId || receptionDetails.traysQuantity === 0
                  ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                  : 'border-primary text-primary hover:bg-primary/10 hover:-translate-y-0.5 hover:shadow-sm'
              }`}
              data-test-id="pack-pallet-toggle"
            >
              <span className="material-symbols-outlined text-base">category</span>
              <span>Pallet</span>
              {palletAssignments.length > 0 ? (
                <span className="text-xs text-gray-500">
                  {palletAssignments.length === 1
                    ? `#${palletAssignments[0].pallet.id} · ${formatNumber(palletAssignments[0].traysToAssign, 0)} bandejas`
                    : `${palletAssignments.length} pallets · ${formatNumber(totalAssignedToPallets, 0)} bandejas`}
                </span>
              ) : null}
            </button>
            <IconButton
              icon="add"
              variant="text"
              onClick={() => setCreatePalletDialogOpen(true)}
              disabled={!receptionDetails.trayId}
              className="transition-transform duration-150 hover:-translate-y-0.5"
              title="Crear pallet"
            />
          </div>

          {isPalletPickerOpen ? (
            <PalletPicker
              expectedTrays={receptionDetails.traysQuantity}
              onSelectionChange={handlePalletSelectionChange}
              disabled={!receptionDetails.trayId || receptionDetails.traysQuantity === 0}
              trayId={receptionDetails.trayId}
              onClose={() => setIsPalletPickerOpen(false)}
              refreshTrigger={refreshTrigger}
            />
          ) : null}

          {palletAssignments.length > 0 && !isPalletPickerOpen ? (
            <div className="rounded-md border bg-gray-50 p-3 text-xs text-gray-500">
              <p className="font-semibold text-gray-700">Distribución de pallets</p>
              <ul className="mt-2 space-y-1">
                {palletAssignments.map(({ pallet, traysToAssign }) => (
                  <li key={pallet.id}>Pallet #{pallet.id}: {formatNumber(traysToAssign, 0)} bandejas</li>
                ))}
              </ul>
              <p className="mt-2 text-gray-600">
                Total asignado: {formatNumber(totalAssignedToPallets, 0)} / {formatNumber(receptionDetails.traysQuantity, 0)} bandejas
              </p>
            </div>
          ) : null}
        </div>

        <div className="space-y-1">
          <GrossWeightInput
            grossWeight={receptionDetails.grossWeight}
            onGrossWeightChange={handleGrossWeightChange}
          />

          <div className="pt-2">
            <ImpurityPercent
              showImpurityWeight={showImpurityWeight}
              impurityPercent={receptionDetails.impurityPercent}
              onToggle={handleImpurityToggle}
              onImpurityChange={handleImpurityChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-1 mt-1">
            <div className="p-3 border rounded-lg bg-gray-50/50">
              <h3 className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1">Peso neto</h3>
              <p className="text-lg font-bold text-gray-900">{formatNumber(netWeight)} kg</p>
            </div>

            <div className="p-3 border rounded-lg bg-primary/5 border-primary/10">
              <h3 className="text-[10px] uppercase tracking-wider font-bold text-primary/70 mb-1">Total a pagar</h3>
              <p className="text-lg font-bold text-primary">{currencySymbol} {formatTotal(totalToPay)}</p>
            </div>
          </div>
        </div>
      </div>

      <CreatePalletDialog
        open={createPalletDialogOpen}
        onClose={() => setCreatePalletDialogOpen(false)}
        trayId={receptionDetails.trayId!}
        onSuccess={() => setRefreshTrigger(prev => prev + 1)}
      />
      {/* Botón para eliminar la card (solo si showRemoveButton) */}
      {showRemoveButton && (
        <div className="absolute top-2 right-2 z-10">
          <IconButton
            icon="close"
            variant="basicSecondary"
            aria-label="Eliminar detalle"
            onClick={onRemove}
          />
        </div>
      )}
    </div>
  );
};

export default DetailReceptionCard;