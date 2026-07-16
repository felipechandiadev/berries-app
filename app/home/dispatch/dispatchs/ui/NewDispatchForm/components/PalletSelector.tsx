'use client';

import React, { useState, useMemo } from 'react';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import type { AvailablePallet } from '../types';

interface PalletSelectorProps {
  availablePallets: AvailablePallet[];
  selectedPalletIds: number[];
  onSelect: (palletId: number) => void;
  isLoading?: boolean;
}

const statusTranslations: Record<string, string> = {
  'AVAILABLE': 'Disponible',
  'IN_USE': 'En uso',
  'FULL': 'Lleno',
  'CLOSED': 'Cerrado',
};

function translateStatus(status: string): string {
  return statusTranslations[status] || status;
}

const PalletSelector: React.FC<PalletSelectorProps> = ({
  availablePallets,
  selectedPalletIds,
  onSelect,
  isLoading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPallets = useMemo(() => {
    if (!searchTerm.trim()) return availablePallets;
    
    const term = searchTerm.toLowerCase();
    return availablePallets.filter(pallet => 
      String(pallet.id).includes(term) ||
      pallet.storageName?.toLowerCase().includes(term) ||
      pallet.trayName?.toLowerCase().includes(term) ||
      pallet.varietyName?.toLowerCase().includes(term) ||
      pallet.formatName?.toLowerCase().includes(term)
    );
  }, [availablePallets, searchTerm]);

  // Separar pallets seleccionados de no seleccionados
  const unselectedPallets = useMemo(() => 
    filteredPallets.filter(p => !selectedPalletIds.includes(p.id)),
    [filteredPallets, selectedPalletIds]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500">
        <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
        Cargando pallets disponibles...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <TextField
          label=""
          placeholder="Buscar por ID, almacenamiento, bandeja, variedad..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <span className="text-sm text-gray-500">
          {unselectedPallets.length} pallets disponibles
        </span>
      </div>

      {unselectedPallets.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border border-dashed rounded-lg">
          <span className="material-symbols-outlined text-4xl mb-2 block">inventory_2</span>
          <p>
            {searchTerm 
              ? 'No se encontraron pallets con ese criterio' 
              : 'No hay pallets disponibles para despacho'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2">
          {unselectedPallets.map((pallet) => {
            const fillPercent = pallet.capacity > 0 
              ? Math.min(100, Math.round((pallet.traysQuantity / pallet.capacity) * 100))
              : 0;

            return (
              <button
                key={pallet.id}
                type="button"
                onClick={() => onSelect(pallet.id)}
                className="w-full text-left p-4 rounded-lg border border-border bg-white hover:border-primary hover:shadow-md transition-all duration-150"
                data-test-id={`pallet-selector-item-${pallet.id}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-foreground">Pallet #{pallet.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {pallet.storageName || 'Sin ubicación'}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    pallet.status === 'FULL' 
                      ? 'bg-amber-100 text-amber-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {translateStatus(pallet.status)}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bandeja:</span>
                    <span className="font-medium">{pallet.trayName || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cantidad:</span>
                    <span className="font-medium">{pallet.traysQuantity} bandejas</span>
                  </div>
                  {pallet.varietyName && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Variedad:</span>
                      <span className="font-medium text-primary">{pallet.varietyName}</span>
                    </div>
                  )}
                  {pallet.formatName && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Formato:</span>
                      <span className="font-medium">{pallet.formatName}</span>
                    </div>
                  )}
                </div>

                {/* Barra de capacidad */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Capacidad</span>
                    <span>{fillPercent}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-full rounded-full transition-all ${
                        fillPercent >= 100 ? 'bg-red-500' :
                        fillPercent >= 80 ? 'bg-amber-500' :
                        fillPercent >= 50 ? 'bg-blue-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${fillPercent}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-center text-primary text-sm font-medium">
                  <span className="material-symbols-outlined text-sm mr-1">add_circle</span>
                  Agregar al despacho
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PalletSelector;
