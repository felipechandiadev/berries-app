'use client';

import React from 'react';
import { TextField } from '../../../../baseComponents/TextField/TextField';

interface DateRangePickerProps {
  startDate?: Date;
  endDate?: Date;
  onChange: (start: Date | undefined, end: Date | undefined) => void;
}

export default function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const formatDate = (date?: Date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    onChange(value ? new Date(value) : undefined, endDate);
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    onChange(startDate, value ? new Date(value) : undefined);
  };

  return (
    <div className="space-y-3">
      <TextField
        label="Fecha de inicio"
        type="date"
        value={formatDate(startDate)}
        onChange={handleStartChange}
      />
      <TextField
        label="Fecha de fin"
        type="date"
        value={formatDate(endDate)}
        onChange={handleEndChange}
      />
    </div>
  );
}