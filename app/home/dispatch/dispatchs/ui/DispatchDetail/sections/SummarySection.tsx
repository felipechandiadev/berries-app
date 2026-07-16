'use client';

import React, { useState } from 'react';
import { DispatchWithRelations } from '../types';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import UpdatePricePerKgDialog from './UpdatePricePerKgDialog';

interface SummarySectionProps {
  data: DispatchWithRelations;
  onRefresh?: () => void;
}

export const SummarySection: React.FC<SummarySectionProps> = ({ data, onRefresh }) => {
  const { metadata, amount } = data;
  const sale = metadata.sale;
  const [isPriceDialogOpen, setIsPriceDialogOpen] = useState(false);

  const clpFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  });

  return (
    <div className="h-full overflow-auto">
      <h3 className="text-lg font-medium mb-4">Resumen de Despacho</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Venta</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{clpFormatter.format(amount)}</p>
        </div>
        <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Peso Neto Total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{sale?.totalNetWeight || 0} kg</p>
        </div>
        <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm relative group">
          <div className="absolute top-2 right-2 ">
            <IconButton
              icon="edit"
              variant="basicSecondary"
              size="sm"
              onClick={() => setIsPriceDialogOpen(true)}
              title="Editar precio por Kg"
            />
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Precio por Kg</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{clpFormatter.format(sale?.pricePerKg || 0)}</p>
        </div>
        <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Pallets</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{metadata.pallets?.length || 0}</p>
        </div>

        {metadata.notes && (
          <div className="col-span-full bg-amber-50 p-4 rounded-md border border-amber-100">
            <p className="text-xs font-medium text-amber-800 uppercase tracking-wider">Notas</p>
            <p className="text-sm text-amber-900 mt-1">{metadata.notes}</p>
          </div>
        )}
      </div>

      <UpdatePricePerKgDialog
        dispatch={data}
        open={isPriceDialogOpen}
        onClose={() => setIsPriceDialogOpen(false)}
        onSuccess={onRefresh}
      />
    </div>
  );
};
