import React from 'react';
import Select from '@/app/baseComponents/Select/Select';

interface VarietySelectorProps {
  varietyId: number | null;
  onVarietyChange: (id: number | null) => void;
  dataTestIdPrefix?: string;
  varietyOptions: { id: number; label: string }[];
}

const VarietySelector: React.FC<VarietySelectorProps> = ({ 
  varietyId, 
  onVarietyChange, 
  dataTestIdPrefix,
  varietyOptions
}) => {
  return (
    <div className="w-full">
      <Select
        label="Variedad"
        options={varietyOptions.map((v) => ({ id: v.id, label: v.label }))}
        placeholder="Selecciona una variedad"
        value={varietyId || null}
        onChange={(value) => {
          const selectedId = value ? parseInt(value.toString(), 10) : null;
          onVarietyChange(selectedId);
        }}
        allowClear
        data-test-id={dataTestIdPrefix ? `${dataTestIdPrefix}-variety-select` : 'variety-select'}
      />
    </div>
  );
};

export default VarietySelector;