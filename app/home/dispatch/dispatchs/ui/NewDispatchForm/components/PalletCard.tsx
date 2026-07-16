'use client';

import React, { useMemo } from 'react';
import Select from '@/app/baseComponents/Select/Select';
import { NumberStepper } from '@/app/baseComponents/NumberStepper/NumberStepper';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import type { DispatchPalletForm, TrayOption } from '../types';
import { formatTrayStepperLabel, weightFormatter } from '../helpers';

interface PalletCardProps {
  index: number;
  pallet: DispatchPalletForm;
  trayOptions: TrayOption[];
  onTrayChange: (trayId: string | null) => void;
  onChange: (changes: Partial<DispatchPalletForm>) => void;
  onRemove: () => void;
  disableRemove?: boolean;
}

const PalletCard: React.FC<PalletCardProps> = ({
  index,
  pallet,
  trayOptions,
  onTrayChange,
  onChange,
  onRemove,
  disableRemove,
}) => {
  const trayStepperLabel = useMemo(() => (
    formatTrayStepperLabel(pallet.trayLabel, pallet.trayWeight, pallet.trayCount)
  ), [pallet.trayLabel, pallet.trayWeight, pallet.trayCount]);

  const handleNumericFieldChange = (field: keyof Pick<DispatchPalletForm, 'palletWeight' | 'grossWeight'>, value: string) => {
    const parsed = parseFloat(value);
    onChange({ [field]: isNaN(parsed) ? 0 : parsed });
  };

  const numericValueToString = (value: number): string => (
    value || value === 0 ? String(value) : ''
  );

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border bg-white p-4 shadow-sm" data-test-id="dispatch-pallet-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Pallet #{index + 1}</p>
          {pallet.trayLabel && (
            <p className="text-xs text-muted-foreground">{pallet.trayLabel}</p>
          )}
        </div>
        <IconButton
          icon="delete"
          variant="basicSecondary"
          size="sm"
          ariaLabel="Eliminar pallet"
          onClick={onRemove}
          disabled={disableRemove}
        />
      </div>

      <div className="flex flex-col gap-4">
        <Select
          label="Tipo de bandeja"
          options={trayOptions}
          placeholder="Selecciona una bandeja"
          value={pallet.trayId}
          onChange={(value) => onTrayChange(value ? String(value) : null)}
          allowClear
          data-test-id="dispatch-pallet-tray"
        />
        <NumberStepper
          label={trayStepperLabel}
          value={pallet.trayCount}
          onChange={(value) => onChange({ trayCount: value })}
          min={0}
          allowNegative={false}
          disabled={!pallet.trayId}
          allowFloat={false}
          data-test-id="dispatch-pallet-tray-count"
        />
        <TextField
          label="Peso pallet (kg)"
          type="number"
          value={numericValueToString(pallet.palletWeight)}
          onChange={(e) => handleNumericFieldChange('palletWeight', e.target.value)}
          placeholder="0"
          data-test-id="dispatch-pallet-weight"
        />
        <TextField
          label="Peso bruto (kg)"
          type="number"
          value={numericValueToString(pallet.grossWeight)}
          onChange={(e) => handleNumericFieldChange('grossWeight', e.target.value)}
          placeholder="0"
          data-test-id="dispatch-pallet-gross"
        />
        <TextField
          label="Peso neto (kg)"
          readOnly
          value={pallet.netWeight ? weightFormatter.format(pallet.netWeight) : ''}
          onChange={() => {}}
          placeholder="0"
          data-test-id="dispatch-pallet-net"
        />
      </div>
    </div>
  );
};

export default PalletCard;
