import React, { useEffect, useRef, useState } from 'react';
import { TextField } from '@/app/baseComponents/TextField/TextField';

interface GrossWeightInputProps {
  grossWeight: number;
  onGrossWeightChange: (weight: number) => void;
}

const GrossWeightInput: React.FC<GrossWeightInputProps> = ({ grossWeight, onGrossWeightChange }) => {
  const [inputValue, setInputValue] = useState<string>('');
  const isUserEditingRef = useRef(false);

  useEffect(() => {
    if (isUserEditingRef.current) {
      isUserEditingRef.current = false;
      return;
    }

    if (!Number.isFinite(grossWeight) || grossWeight <= 0) {
      setInputValue('');
      return;
    }

    const formatted = Number.parseFloat(grossWeight.toFixed(2))
      .toString()
      .replace(/(\.\d*?)0+$/, '$1')
      .replace(/\.$/, '');

    setInputValue(formatted);
  }, [grossWeight]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const rawValue = e.target.value ?? '';
    setInputValue(rawValue);
    isUserEditingRef.current = true;

    const normalized = rawValue.replace(',', '.');
    const parsed = Number.parseFloat(normalized);

    if (Number.isNaN(parsed)) {
      onGrossWeightChange(0);
      return;
    }

    const bounded = parsed < 0 ? 0 : parsed;
    const rounded = Math.round(bounded * 100) / 100;
    onGrossWeightChange(rounded);
  };

  return (
    <TextField
      label="Kg bruto"
      placeholder="Ingresa el peso bruto"
      type="text"
      value={inputValue}
      onChange={handleChange}
      data-test-id="gross-weight-input"
    />
  );
};

export default GrossWeightInput;
