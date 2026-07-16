'use client';

import React from 'react';
import { Button } from '@/app/baseComponents/Button/Button';
import Badge from '@/app/baseComponents/Badge/Badge';
import { DispatchWithRelations } from './types';
import PrintDispatchDetailButton from './PrintDispatchDetailButton';

interface HeaderProps {
  data: DispatchWithRelations;
  onClose: () => void;
}

const clpFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

export const Header: React.FC<HeaderProps> = ({ data, onClose }) => {
  const { metadata } = data;

  return (
    <header className="flex flex-col gap-4 px-6 py-4 border-b border-gray-200 bg-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col">
          <h2 className="text-xl font-semibold text-gray-900">Despacho #{String(data.id)}</h2>

          <div className="flex flex-wrap items-center gap-4 mt-4">
            <div className="flex flex-col items-center rounded-lg px-3 py-2">
              <span className="text-xs font-medium text-gray-500 mb-1 uppercase">Peso Neto Total</span>
              <Badge variant="info" className="text-sm">
                {metadata.sale?.totalNetWeight || 0} kg
              </Badge>
            </div>
            <div className="flex flex-col items-center rounded-lg px-3 py-2">
              <span className="text-xs font-medium text-gray-500 mb-1 uppercase">Total Venta</span>
              <Badge variant="success" className="text-sm">
                {clpFormatter.format(data.amount || 0)}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 self-start lg:self-auto">
          <Button variant="outlined" onClick={onClose}>
            Cerrar
          </Button>
          <PrintDispatchDetailButton data={data} />
        </div>
      </div>
    </header>
  );
};
