'use client';

import { useCallback, useEffect, useState } from 'react';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { useAlert } from '@/app/state/contexts/AlertContext';
import { getPalletDetail, type PalletPackDetail } from '@/app/actions/pallets';
import type { PalletRow } from './types';

interface PalletDetailButtonProps {
  pallet: PalletRow;
}

interface PackCardProps {
  pack: PalletPackDetail;
}

// Traducción de estados
const statusTranslations: Record<string, string> = {
  'AVAILABLE': 'Disponible',
  'IN_USE': 'En uso',
  'FULL': 'Lleno',
  'CLOSED': 'Cerrado',
  'DISPATCHED': 'Despachado',
};

function translateStatus(status: string): string {
  return statusTranslations[status] || status;
}

function PackCard({ pack }: PackCardProps) {
  return (
    <div className="w-full border rounded-lg p-4 bg-white dark:bg-zinc-800 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate">
            Pack #{pack.receptionPackId}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {pack.varietyName} - {pack.formatName}
          </p>
        </div>
        <span className="text-lg font-bold text-primary ml-2 flex-shrink-0">
          {pack.quantity}
        </span>
      </div>
      
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Bandeja:</span>
          <span className="font-medium truncate ml-2">{pack.trayName || pack.trayId}</span>
        </div>
        
        {pack.producerName && (
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Productor:</span>
            <span className="font-medium truncate ml-2">{pack.producerName}</span>
          </div>
        )}
        
        {pack.productiveUnitName && (
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Unidad Productiva:</span>
            <span className="font-medium text-blue-600 dark:text-blue-400 truncate ml-2">
              {pack.productiveUnitName}
            </span>
          </div>
        )}
        
        {pack.netWeight > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Peso neto:</span>
            <span className="font-medium ml-2">{Number(pack.netWeight).toFixed(2)} kg</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PalletDetailButton({ pallet }: PalletDetailButtonProps) {
  const { showAlert } = useAlert();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [detail, setDetail] = useState<{
    id: number;
    storageName: string | null;
    trayName: string | null;
    traysQuantity: number;
    capacity: number;
    status: string;
    packs: PalletPackDetail[];
  } | null>(null);

  const loadDetail = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getPalletDetail(pallet.id);
      if (result.success && result.data) {
        setDetail(result.data);
      } else {
        showAlert({ message: result.error || 'Error al cargar detalle', type: 'error', duration: 5000 });
      }
    } catch (error) {
      console.error('[PalletDetailButton] Error:', error);
      showAlert({ message: 'Error al cargar detalle del pallet', type: 'error', duration: 5000 });
    } finally {
      setIsLoading(false);
    }
  }, [pallet.id, showAlert]);

  useEffect(() => {
    if (open) {
      loadDetail();
    }
  }, [open, loadDetail]);

  const handleClose = () => {
    setOpen(false);
    setDetail(null);
  };

  // Calcular porcentaje de llenado
  const fillPercentage = detail 
    ? Math.min(100, Math.round((detail.traysQuantity / detail.capacity) * 100))
    : Math.min(100, Math.round((pallet.traysQuantity / pallet.capacity) * 100));

  // Color de la barra según el porcentaje
  const getProgressColor = (percent: number) => {
    if (percent >= 100) return 'bg-red-500';
    if (percent >= 80) return 'bg-amber-500';
    if (percent >= 50) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <>
      <IconButton
        icon="info"
        onClick={() => setOpen(true)}
        title="Ver detalle del pallet"
        variant="basicSecondary"
        size="sm"
      />

      <Dialog
        open={open}
        onClose={handleClose}
        title={`Detalle Pallet #${pallet.id}`}
      >
        <div className="w-full max-w-4xl">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <span className="text-gray-500">Cargando detalle...</span>
            </div>
          ) : detail ? (
            <div className="space-y-6">
              {/* Información general */}
              <div className="bg-gray-50 dark:bg-zinc-900 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Almacenamiento:</span>
                    <p className="font-medium">{detail.storageName || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Tipo de Bandeja:</span>
                    <p className="font-medium">{detail.trayName || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Estado:</span>
                    <p className="font-medium">{translateStatus(detail.status)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Packs:</span>
                    <p className="font-medium">{detail.packs.length}</p>
                  </div>
                </div>

                {/* Progress bar de llenado */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Capacidad</span>
                    <span className="font-semibold">
                      {detail.traysQuantity} / {detail.capacity} bandejas ({fillPercentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-4 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${getProgressColor(fillPercentage)}`}
                      style={{ width: `${fillPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Lista de packs */}
              {detail.packs.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Packs en este pallet ({detail.packs.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
                    {detail.packs.map((pack, index) => (
                      <PackCard key={`${pack.receptionPackId}_${pack.trayId}_${index}`} pack={pack} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <span className="material-symbols-outlined text-4xl mb-2 block">inventory_2</span>
                  <p>Este pallet no tiene packs asignados</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No se pudo cargar el detalle
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
}
