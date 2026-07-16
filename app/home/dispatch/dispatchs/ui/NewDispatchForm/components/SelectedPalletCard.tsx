'use client';

import React, { useMemo } from 'react';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import type { SelectedPalletForDispatch } from '../types';
import { weightFormatter } from '../helpers';

interface SelectedPalletCardProps {
  item: SelectedPalletForDispatch;
  index: number;
  onGrossWeightChange: (grossWeight: number) => void;
  onPalletWeightChange: (palletWeight: number) => void;
  onRemove: () => void;
}

const SelectedPalletCard: React.FC<SelectedPalletCardProps> = ({
  item,
  index,
  onGrossWeightChange,
  onPalletWeightChange,
  onRemove,
}) => {
  const { pallet, grossWeight, palletWeight, netWeight } = item;

  const traysWeight = useMemo(() => 
    pallet.trayWeight * pallet.traysQuantity, 
    [pallet.trayWeight, pallet.traysQuantity]
  );

  const fillPercent = pallet.capacity > 0 
    ? Math.min(100, Math.round((pallet.traysQuantity / pallet.capacity) * 100))
    : 0;

  const handleGrossWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    onGrossWeightChange(isNaN(value) ? 0 : value);
  };

  const handlePalletWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    onPalletWeightChange(isNaN(value) ? 0 : value);
  };

  return (
    <div 
      className="rounded-lg border border-primary/30 bg-primary/5 p-4 shadow-sm"
      data-test-id={`selected-pallet-card-${pallet.id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">#{index + 1}</span>
            <p className="font-semibold text-foreground">Pallet #{pallet.id}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {pallet.storageName || 'Sin ubicación'}
          </p>
        </div>
        <IconButton
          icon="close"
          variant="basicSecondary"
          size="sm"
          ariaLabel="Quitar pallet"
          onClick={onRemove}
        />
      </div>

      {/* Info del pallet (readonly) */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4 bg-white/50 rounded-md p-3">
        <div>
          <span className="text-gray-500 text-xs">Tipo de bandeja</span>
          <p className="font-medium">{pallet.trayName || '-'}</p>
        </div>
        <div>
          <span className="text-gray-500 text-xs">Cantidad</span>
          <p className="font-medium">{pallet.traysQuantity} bandejas</p>
        </div>
        <div>
          <span className="text-gray-500 text-xs">Peso unitario</span>
          <p className="font-medium">{pallet.trayWeight.toFixed(2)} kg</p>
        </div>
        <div>
          <span className="text-gray-500 text-xs">Peso total bandejas</span>
          <p className="font-medium">{traysWeight.toFixed(2)} kg</p>
        </div>
        {pallet.varietyName && (
          <div>
            <span className="text-gray-500 text-xs">Variedad</span>
            <p className="font-medium text-primary">{pallet.varietyName}</p>
          </div>
        )}
        {pallet.formatName && (
          <div>
            <span className="text-gray-500 text-xs">Formato</span>
            <p className="font-medium">{pallet.formatName}</p>
          </div>
        )}
      </div>

      {/* Barra de capacidad */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500">Capacidad del pallet</span>
          <span>{pallet.traysQuantity} / {pallet.capacity} ({fillPercent}%)</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-full rounded-full transition-all ${
              fillPercent >= 100 ? 'bg-red-500' :
              fillPercent >= 80 ? 'bg-amber-500' :
              fillPercent >= 50 ? 'bg-blue-500' : 'bg-green-500'
            }`}
            style={{ width: `${fillPercent}%` }}
          />
        </div>
      </div>

      {/* Campos editables */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <TextField
          label="Peso pallet (kg)"
          type="number"
          value={palletWeight ? String(palletWeight) : ''}
          onChange={handlePalletWeightChange as any}
          placeholder="0"
          data-test-id={`selected-pallet-${pallet.id}-pallet-weight`}
        />
        <TextField
          label="Peso bruto (kg)"
          type="number"
          value={grossWeight ? String(grossWeight) : ''}
          onChange={handleGrossWeightChange as any}
          placeholder="0"
          required
          data-test-id={`selected-pallet-${pallet.id}-gross-weight`}
        />
      </div>

      {/* Peso neto calculado */}
      <div className="p-3 bg-white rounded-md border">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Peso neto calculado</span>
          <span className="text-lg font-bold text-primary">
            {netWeight > 0 ? weightFormatter.format(netWeight) : '0'} kg
          </span>
        </div>
        {grossWeight > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            = {weightFormatter.format(grossWeight)} (bruto) 
            - {weightFormatter.format(palletWeight)} (pallet) 
            - {weightFormatter.format(traysWeight)} (bandejas)
          </p>
        )}
      </div>
    </div>
  );
};

export default SelectedPalletCard;
