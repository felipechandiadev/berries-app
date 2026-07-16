'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import Select from '@/app/baseComponents/Select/Select';
import { NumberStepper } from '@/app/baseComponents/NumberStepper/NumberStepper';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import { Button } from '@/app/baseComponents/Button/Button';
import { useAlert } from '@/app/state/contexts/AlertContext';
import {
  getAvailablePalletsForTransfer,
  transferTraysBetweenPallets,
  type TransferTrayItem,
} from '@/app/actions/pallets';
import { PalletTrayAssignment } from '@/data/entities/Pallet';

interface SelectOption {
  id: string;
  label: string;
}

interface PalletOption {
  id: number;
  storageId: string | null;
  storageName: string | null;
  trayId: string | null;
  trayName: string | null;
  traysQuantity: number;
  capacity: number;
  availableSpace: number;
  status: string;
  metadata: PalletTrayAssignment[];
}

interface TransferTraysDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedSourcePalletId?: number;
}

export default function TransferTraysDialog({
  open,
  onClose,
  onSuccess,
  preselectedSourcePalletId,
}: TransferTraysDialogProps) {
  const { showAlert } = useAlert();
  
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pallets, setPallets] = useState<PalletOption[]>([]);
  
  const [sourcePalletId, setSourcePalletId] = useState<string>('');
  const [targetPalletId, setTargetPalletId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  // Cantidades a transferir por cada pack (key: `${receptionPackId}_${trayId}`)
  const [transferQuantities, setTransferQuantities] = useState<Record<string, number>>({});

  // Cargar pallets disponibles
  const loadPallets = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getAvailablePalletsForTransfer();
      if (result.success && result.data) {
        setPallets(result.data);
        // Si hay un pallet preseleccionado, establecerlo como origen
        if (preselectedSourcePalletId) {
          setSourcePalletId(String(preselectedSourcePalletId));
        }
      } else {
        showAlert({ message: result.error || 'Error al cargar pallets', type: 'error', duration: 5000 });
      }
    } catch (error) {
      console.error('[TransferTraysDialog] Error:', error);
      showAlert({ message: 'Error al cargar pallets', type: 'error', duration: 5000 });
    } finally {
      setIsLoading(false);
    }
  }, [showAlert, preselectedSourcePalletId]);

  useEffect(() => {
    if (open) {
      loadPallets();
      // Reset state
      setSourcePalletId(preselectedSourcePalletId ? String(preselectedSourcePalletId) : '');
      setTargetPalletId('');
      setNotes('');
      setTransferQuantities({});
    }
  }, [open, loadPallets, preselectedSourcePalletId]);

  // Pallet origen seleccionado
  const sourcePallet = useMemo(() => {
    const id = parseInt(sourcePalletId, 10);
    return pallets.find(p => p.id === id) ?? null;
  }, [pallets, sourcePalletId]);

  // Pallet destino seleccionado
  const targetPallet = useMemo(() => {
    const id = parseInt(targetPalletId, 10);
    return pallets.find(p => p.id === id) ?? null;
  }, [pallets, targetPalletId]);

  // Opciones para select de origen (pallets con bandejas)
  const sourcePalletOptions: SelectOption[] = useMemo(() => {
    return pallets
      .filter(p => p.traysQuantity > 0)
      .map(p => ({
        id: String(p.id),
        label: `Pallet #${p.id} - ${p.storageName || 'Sin almacén'} (${p.traysQuantity}/${p.capacity} bandejas)`,
      }));
  }, [pallets]);

  // Opciones para select de destino (excluir origen, con espacio disponible)
  const targetPalletOptions: SelectOption[] = useMemo(() => {
    const sourceId = parseInt(sourcePalletId, 10);
    return pallets
      .filter(p => p.id !== sourceId && p.availableSpace > 0)
      .map(p => ({
        id: String(p.id),
        label: `Pallet #${p.id} - ${p.storageName || 'Sin almacén'} (${p.traysQuantity}/${p.capacity} - Espacio: ${p.availableSpace})`,
      }));
  }, [pallets, sourcePalletId]);

  // Total a transferir
  const totalToTransfer = useMemo(() => {
    return Object.values(transferQuantities).reduce((sum, qty) => sum + qty, 0);
  }, [transferQuantities]);

  // Espacio disponible en destino
  const availableSpaceInTarget = targetPallet?.availableSpace ?? 0;

  // Handler para cambiar cantidad de un pack
  const handleQuantityChange = useCallback((packKey: string, newQuantity: number) => {
    setTransferQuantities(prev => ({
      ...prev,
      [packKey]: newQuantity,
    }));
  }, []);

  // Reset quantities cuando cambia el origen
  useEffect(() => {
    setTransferQuantities({});
  }, [sourcePalletId]);

  // Validación
  const canSubmit = useMemo(() => {
    if (!sourcePalletId || !targetPalletId) return false;
    if (totalToTransfer <= 0) return false;
    if (totalToTransfer > availableSpaceInTarget) return false;
    return true;
  }, [sourcePalletId, targetPalletId, totalToTransfer, availableSpaceInTarget]);

  // Submit
  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Construir array de transfers
      const traysToTransfer: TransferTrayItem[] = [];
      
      for (const [packKey, quantity] of Object.entries(transferQuantities)) {
        if (quantity <= 0) continue;
        
        const [receptionPackId, trayId] = packKey.split('_');
        traysToTransfer.push({
          receptionPackId,
          trayId,
          quantity,
        });
      }

      const result = await transferTraysBetweenPallets({
        sourcePalletId: parseInt(sourcePalletId, 10),
        targetPalletId: parseInt(targetPalletId, 10),
        traysToTransfer,
        notes: notes.trim() || undefined,
      });

      if (result.success) {
        showAlert({ 
          message: result.message || 'Transferencia exitosa', 
          type: 'success', 
          duration: 4000 
        });
        onClose();
        onSuccess?.();
      } else {
        showAlert({ 
          message: result.error || 'Error en la transferencia', 
          type: 'error', 
          duration: 5000 
        });
      }
    } catch (error: any) {
      console.error('[TransferTraysDialog] Submit error:', error);
      showAlert({ 
        message: error?.message || 'Error inesperado', 
        type: 'error', 
        duration: 5000 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Transferir Bandejas entre Pallets"
    >
      <div className="space-y-6 min-w-[500px]">
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <span className="text-gray-500">Cargando pallets...</span>
          </div>
        ) : (
          <>
            {/* Selección de Pallet Origen */}
            <div>
              <Select
                label="Pallet Origen"
                value={sourcePalletId}
                onChange={(id) => setSourcePalletId(String(id ?? ''))}
                options={sourcePalletOptions}
                placeholder="Selecciona el pallet de origen..."
                required
              />
              {sourcePalletOptions.length === 0 && (
                <p className="text-sm text-amber-600 mt-1">
                  No hay pallets con bandejas disponibles para transferir
                </p>
              )}
            </div>

            {/* Detalle de packs en el pallet origen */}
            {sourcePallet && sourcePallet.metadata && sourcePallet.metadata.length > 0 && (
              <div className="border rounded-lg p-4 bg-gray-50 dark:bg-zinc-800">
                <h4 className="font-medium text-sm mb-3 text-gray-700 dark:text-gray-300">
                  Packs en Pallet #{sourcePallet.id}
                </h4>
                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                  {sourcePallet.metadata.map((assignment, index) => {
                    const packKey = `${assignment.receptionPackId}_${assignment.trayId}`;
                    const currentQty = transferQuantities[packKey] ?? 0;
                    
                    return (
                      <div
                        key={packKey}
                        className="flex items-center justify-between gap-4 p-3 bg-white dark:bg-zinc-700 rounded border"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            Pack: {assignment.receptionPackId}
                            {(assignment.receptionNote || assignment.receptionId) && (
                              <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                                (Recepción: {assignment.receptionNote || assignment.receptionId})
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Bandeja: {assignment.trayId} • Disponibles: {assignment.quantity}
                          </p>
                        </div>
                        <div className="w-40">
                          <NumberStepper
                            value={currentQty}
                            onChange={(val) => handleQuantityChange(packKey, val)}
                            min={0}
                            max={assignment.quantity}
                            step={1}
                            allowNegative={false}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {sourcePallet && (!sourcePallet.metadata || sourcePallet.metadata.length === 0) && (
              <div className="border rounded-lg p-4 bg-amber-50 dark:bg-amber-900/20">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Este pallet no tiene packs con metadata registrada. 
                  Las bandejas pueden haber sido asignadas sin tracking de packs.
                </p>
              </div>
            )}

            {/* Selección de Pallet Destino */}
            {sourcePalletId && (
              <div>
                <Select
                  label="Pallet Destino"
                  value={targetPalletId}
                  onChange={(id) => setTargetPalletId(String(id ?? ''))}
                  options={targetPalletOptions}
                  placeholder="Selecciona el pallet de destino..."
                  required
                />
                {targetPalletOptions.length === 0 && (
                  <p className="text-sm text-amber-600 mt-1">
                    No hay pallets con espacio disponible
                  </p>
                )}
              </div>
            )}

            {/* Resumen de capacidad */}
            {targetPallet && (
              <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                <h4 className="font-medium text-sm mb-2 text-blue-700 dark:text-blue-300">
                  Resumen de Transferencia
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">A transferir:</span>
                    <span className="ml-2 font-semibold">{totalToTransfer} bandejas</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Espacio en destino:</span>
                    <span className={`ml-2 font-semibold ${totalToTransfer > availableSpaceInTarget ? 'text-red-600' : 'text-green-600'}`}>
                      {availableSpaceInTarget} bandejas
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Origen después:</span>
                    <span className="ml-2 font-semibold">
                      {(sourcePallet?.traysQuantity ?? 0) - totalToTransfer} bandejas
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Destino después:</span>
                    <span className="ml-2 font-semibold">
                      {(targetPallet?.traysQuantity ?? 0) + totalToTransfer}/{targetPallet?.capacity ?? 0}
                    </span>
                  </div>
                </div>
                {totalToTransfer > availableSpaceInTarget && (
                  <p className="text-red-600 text-sm mt-2">
                    ⚠️ La cantidad a transferir excede el espacio disponible
                  </p>
                )}
              </div>
            )}

            {/* Notas */}
            <TextField
              label="Notas (opcional)"
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setNotes(e.target.value)}
              placeholder="Agrega notas sobre esta transferencia..."
              rows={2}
            />

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                onClick={onClose}
                variant="secondary"
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                variant="primary"
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting ? 'Transfiriendo...' : `Transferir ${totalToTransfer} bandeja${totalToTransfer !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
