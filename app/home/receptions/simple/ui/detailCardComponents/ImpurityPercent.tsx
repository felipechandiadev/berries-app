import React from 'react';
import Switch from '@/app/baseComponents/Switch/Switch';
import { TextField } from '@/app/baseComponents/TextField/TextField';

interface ImpurityPercentProps {
  showImpurityWeight: boolean;
  impurityPercent: number;
  onToggle: (checked: boolean) => void;
  onImpurityChange: (percent: number) => void;
}

const ImpurityPercent: React.FC<ImpurityPercentProps> = ({
  showImpurityWeight,
  impurityPercent,
  onToggle,
  onImpurityChange,
}) => {
  return (
    <div className="flex items-center gap-4">
      <Switch label="Impurezas" checked={showImpurityWeight} onChange={onToggle} />
      {showImpurityWeight && (
        <TextField
          label="Impurezas"
          placeholder="Ingresa el porcentaje de impurezas"
          type="number"
          startAdornment="%"
          value={impurityPercent.toString()}
          onChange={(e) => {
            const parsed = Number.parseFloat(e.target.value);
            const boundedValue = Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(parsed, 100));
            const rounded = Math.round(boundedValue * 100) / 100;
            onImpurityChange(rounded);
          }}
        />
      )}
    </div>
  );
};

export default ImpurityPercent;