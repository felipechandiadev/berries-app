'use client';

import React from 'react';
import { ProductiveUnitDetailData } from './types';
import { Button } from '@/app/baseComponents/Button/Button';

interface HeaderProps {
  data: ProductiveUnitDetailData;
  onClose: () => void;
}

export const Header: React.FC<HeaderProps> = ({ data, onClose }) => {
  const { unit } = data;

  return (
    <header className="flex flex-col gap-4 px-6 py-4 border-b border-gray-200 bg-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col">
          <h2 className="text-xl font-semibold text-gray-900">{unit.name}</h2>
          {unit.location && (
            <div className="text-sm text-gray-500 mt-1">
              <span className="font-medium">Ubicación:</span> {unit.location}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <Button variant="outlined" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </header>
  );
};
