'use client';

import Select from '@/app/baseComponents/Select/Select';
import type { MonthFilterOption } from '@/lib/monthFilter';

interface MonthFilterProps {
  options: MonthFilterOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  'data-test-id'?: string;
}

export default function MonthFilter({ options, value, onChange, disabled = false, ...props }: MonthFilterProps) {
  return (
    <div className="min-w-[220px]">
      <Select
        label="Mes"
        options={options}
        value={value}
        onChange={(id) => onChange(id ? String(id) : options[0].id)}
        disabled={disabled}
        data-test-id={props['data-test-id']}
      />
    </div>
  );
}
