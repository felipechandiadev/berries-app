'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DispatchWithRelations } from '../types';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import Select from '@/app/baseComponents/Select/Select';
import { NumberStepper } from '@/app/baseComponents/NumberStepper/NumberStepper';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import { useAlert } from '@/app/state/hooks/useAlert';
import { updateDispatchPallets } from '@/app/actions/dispatches';
import { getTraysSimpleList } from '@/app/actions/trays';

interface PalletsSectionProps {
  data: DispatchWithRelations;
  onRefresh?: () => void;
}

export const PalletsSection: React.FC<PalletsSectionProps> = ({ data, onRefresh }) => {
  const router = useRouter();
  const { success, error: showError } = useAlert();
  const [editingPalletIndex, setEditingPalletIndex] = useState<number | null>(null);
  const [editedPallet, setEditedPallet] = useState<any>(null);
  const [trays, setTrays] = useState<{ id: string; label: string; weight: number }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const pallets = data.metadata.pallets || [];

  useEffect(() => {
    const fetchTrays = async () => {
      try {
        const traysList = await getTraysSimpleList();
        setTrays(traysList);
      } catch (error) {
        console.error('Error fetching trays:', error);
      }
    };
    fetchTrays();
  }, []);

  const handleEdit = (index: number, pallet: any) => {
    setEditingPalletIndex(index);
    setEditedPallet({ ...pallet });
  };

  const handleCancel = () => {
    setEditingPalletIndex(null);
    setEditedPallet(null);
  };

  const handleSave = async () => {
    if (editingPalletIndex === null || !editedPallet) return;

    setIsSaving(true);
    try {
      const newPallets = [...pallets];
      newPallets[editingPalletIndex] = editedPallet;

      // Map to match DispatchPalletInput type (convert undefined to null)
      const palletsToUpdate = newPallets.map(p => ({
        ...p,
        trayId: p.trayId || null,
        trayLabel: p.trayLabel || null,
        trayWeight: p.trayWeight || 0,
        palletWeight: p.palletWeight || 0,
      }));

      const result = await updateDispatchPallets(String(data.id), palletsToUpdate);

      if (result.success) {
        success('Pallet actualizado exitosamente');
        setEditingPalletIndex(null);
        setEditedPallet(null);
        router.refresh();
        if (onRefresh) onRefresh();
      } else {
        showError(result.error || 'Error al actualizar el pallet');
      }
    } catch (error: any) {
      showError(error.message || 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePalletChange = (field: string, value: any) => {
    setEditedPallet((prev: any) => {
      const updated = { ...prev, [field]: value };
      
      if (field === 'trayId') {
        const selectedTray = trays.find(t => t.id === value);
        if (selectedTray) {
          updated.trayLabel = selectedTray.label;
          updated.trayWeight = selectedTray.weight;
        }
      }

      const gross = Number(updated.grossWeight || 0);
      const palletW = Number(updated.palletWeight || 0);
      const trayW = Number(updated.trayWeight || 0);
      const count = Number(updated.trayCount || 0);
      const trayMass = trayW * count;
      updated.netWeight = Math.max(gross - palletW - trayMass, 0);

      return updated;
    });
  };

  const weightFormatter = new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formatTrayStepperLabel = (trayLabel: string | null | undefined, trayWeight: number | null | undefined, trayCount: number) => {
    if (!trayLabel || !trayWeight || trayCount <= 0) {
      return 'Cantidad';
    }
    const totalTrayMass = trayWeight * trayCount;
    return `${totalTrayMass.toFixed(2)} kg en bandejas`;
  };

  return (
    <div className="h-full overflow-auto">
      <h3 className="text-lg font-medium mb-4">Pallets Despachados</h3>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pallets.map((palletItem, index) => {
            const isEditing = editingPalletIndex === index;
            const pallet = isEditing ? editedPallet : palletItem;
            const trayStepperLabel = formatTrayStepperLabel(pallet.trayLabel, pallet.trayWeight, pallet.trayCount);
            
            return (
              <div key={index} className={`flex flex-col gap-4 rounded-md border ${isEditing ? 'border-primary ring-1 ring-primary' : 'border-border'} bg-white p-4 shadow-sm relative group transition-all`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Pallet #{index + 1}</p>
                    {pallet.trayLabel && (
                      <p className="text-xs text-muted-foreground">{pallet.trayLabel}</p>
                    )}
                  </div>
            
                  {!isEditing && (
                    <IconButton
                      icon="edit"
                      size="sm"
                      variant='basicSecondary'
                      onClick={() => handleEdit(index, palletItem)}
                      title="Editar pallet"
                    />
                  )}
                </div>

                <div className="flex flex-col gap-4">
                  <Select
                    label="Tipo de bandeja"
                    options={trays.map(t => ({ id: t.id, label: t.label }))}
                    placeholder="Sin bandeja"
                    value={pallet.trayId}
                    onChange={(val) => handlePalletChange('trayId', val)}
                    disabled={!isEditing}
                  />
                  <NumberStepper
                    label={trayStepperLabel}
                    value={pallet.trayCount}
                    onChange={(val) => handlePalletChange('trayCount', val)}
                    min={0}
                    disabled={!isEditing}
                  />
                  <TextField
                    label="Peso pallet (kg)"
                    type="number"
                    value={String(pallet.palletWeight || 0)}
                    onChange={(e) => handlePalletChange('palletWeight', Number(e.target.value))}
                    readOnly={!isEditing}
                  />
                  <TextField
                    label="Peso bruto (kg)"
                    type="number"
                    value={String(pallet.grossWeight || 0)}
                    onChange={(e) => handlePalletChange('grossWeight', Number(e.target.value))}
                    readOnly={!isEditing}
                  />
                  <TextField
                    label="Peso neto (kg)"
                    readOnly
                    value={pallet.netWeight ? weightFormatter.format(pallet.netWeight) : '0,00'}
                    onChange={() => {}}
                  />
                </div>
                
                {isEditing && (
                  <div className="flex justify-end gap-2 mt-2">
                    <IconButton
                      icon="close"
                      size="sm"
                      variant='basicSecondary'
                      onClick={handleCancel}
                      title="Cancelar edición"
                      disabled={isSaving}
                    />
                    <IconButton
                      icon="save"
                      size="sm"
                      variant='basicSecondary'
                      onClick={handleSave}
                      title="Guardar pallet"
                      disabled={isSaving}
                      isLoading={isSaving}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
