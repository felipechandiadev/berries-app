"use client";

import React from 'react';
import Select from '@/app/baseComponents/Select/Select';
import { NumberStepper } from '@/app/baseComponents/NumberStepper/NumberStepper';
import IconButton from '@/app/baseComponents/IconButton/IconButton';

export interface TrayOption {
  id: string;
  label: string;
  stock: number;
}

interface TrayDevolutionCardProps {
  trayId: string | null;
  quantity: number;
  trayOptions: TrayOption[];
  onTrayChange: (trayId: string | null) => void;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  index?: number;
}

const TrayDevolutionCard: React.FC<TrayDevolutionCardProps> = ({
  trayId,
  quantity,
  trayOptions,
  onTrayChange,
  onQuantityChange,
  onRemove,
  index,
}) => {
  const selectedTray = trayOptions.find(o => o.id === trayId);
  const stock = selectedTray?.stock ?? 0;
  const isOverStock = quantity > stock;

  return (
    <div className={`flex flex-col gap-4 rounded-md border p-4 shadow-sm transition-colors ${isOverStock ? 'border-red-300 bg-white' : 'border-border bg-white'}`} data-test-id="tray-devolution-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <p className="text-sm font-semibold text-foreground">Bandeja a devolver{typeof index === 'number' ? ` #${index + 1}` : ''}</p>
          {selectedTray && (
            <p className={`text-xs ${isOverStock ? 'font-bold text-red-600' : 'text-gray-500'}`}>
              Stock disponible: {stock}
            </p>
          )}
        </div>
        <IconButton
          icon="delete"
          variant="basicSecondary"
          size="sm"
          ariaLabel="Eliminar registro de devolución"
          onClick={onRemove}
        />
      </div>

      <div className="flex flex-col gap-3">
        <Select
          label="Tipo de bandeja"
          options={trayOptions}
          placeholder="Tipo de bandeja"
          value={trayId}
          onChange={(value) => onTrayChange(value ? String(value) : null)}
          allowClear
          data-test-id="tray-devolution-select"
        />
        <div className="flex flex-col gap-1">
          <NumberStepper
            label="Cantidad"
            value={quantity}
            onChange={onQuantityChange}
            min={0}
            allowNegative={false}
            data-test-id="tray-devolution-quantity"
            disabled={!trayId}
          />
          {isOverStock && (
            <p className="text-[10px] font-medium text-red-600 animate-pulse">
              ⚠️ La cantidad supera el stock disponible
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrayDevolutionCard;
