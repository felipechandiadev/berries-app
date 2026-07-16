// ...existing code...

"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DetailReceptionCard from '../simple/ui/DetailReceptionCard';
import TrayDevolutionCard, { type TrayOption } from '../simple/ui/detailCardComponents/TrayDevolutionCard';
import type { ReceptionDataSnapshot } from '../simple/ui/TransactionData';
import { getVarieties } from '@/app/actions/varieties';
import { getFormats } from '@/app/actions/formats';
import { getTrays } from '@/app/actions/trays';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import { Button } from '@/app/baseComponents/Button/Button';
import ProcessedMultipackReceptionDialog from '../simple/ui/ProcessedMultipackReceptionDialog';
import PrintMultipackReceptionDialog from './ui/PrintMultipackReceptionDialog';
import { EMPTY_TOTALS } from '../simple/ui/ProcessedReceptionDialog';
import AutoComplete, { Option } from '@/app/baseComponents/AutoComplete/AutoComplete';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import { useAlert } from '@/app/state/contexts/AlertContext';
import { Currency } from '@/data/entities/Variety';

const CARDS_PER_ROW = 4;
const TRAY_CARDS_PER_ROW = 4;
const MAX_TRAY_DEVOLUTION_CARDS = 5;

const integerFormatter = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const clpFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatInteger = (value: number) => integerFormatter.format(value ?? 0);
const formatDecimal = (value: number) => decimalFormatter.format(value ?? 0);
const formatCLP = (value: number) => clpFormatter.format(value ?? 0);
const formatUSD = (value: number) => usdFormatter.format(value ?? 0);

const MultiPackReception: React.FC = () => {
  const router = useRouter();
  const { showAlert } = useAlert();
  
  // Opciones para los DetailReceptionCard
  const [varietyOptions, setVarietyOptions] = useState<any[]>([]);
  const [formatOptions, setFormatOptions] = useState<any[]>([]);
  const [trayOptions, setTrayOptions] = useState<any[]>([]);


  // Estado de los packs (slots vacíos al inicio)
  const [packs, setPacks] = useState<any[]>([]);
  
  // Estado de las devoluciones de bandejas
  const [trayDevolutions, setTrayDevolutions] = useState<Array<{
    id: string;
    trayId: string | null;
    quantity: number;
    trayLabel?: string | null;
  }>>([]);

  // Calcular resumen de recepción multipack
  const resumen = React.useMemo(() => {
    let totalBandejas = 0;
    let totalPesoBruto = 0;
    let totalPesoNeto = 0;
    let totalCLP = 0;
    let totalUSD = 0;
    let totalBandejasDevueltas = 0;
    
    packs.forEach((pack: any) => {
      totalBandejas += pack.traysQuantity || 0;
      totalPesoBruto += pack.grossWeight || 0;
      totalPesoNeto += pack.netWeight || 0;
      const amount = typeof pack.totalToPay === 'number' && Number.isFinite(pack.totalToPay) ? pack.totalToPay : 0;
      const currency = String(pack.currency ?? Currency.CLP).toUpperCase();
      if (currency === Currency.USD) {
        totalUSD += amount;
      } else {
        totalCLP += amount;
      }
    });
    
    trayDevolutions.forEach((dev) => {
      totalBandejasDevueltas += dev.quantity || 0;
    });
    
    return {
      totalBandejas,
      totalPesoBruto,
      totalPesoNeto,
      totalCLP,
      totalUSD,
      totalBandejasDevueltas,
    };
  }, [packs, trayDevolutions]);

  // Estado de los campos superiores
  const [producer, setProducer] = useState<Option | null>(null);
  const [producerOptions, setProducerOptions] = useState<Option[]>([]);
  const [guide, setGuide] = useState("");
  const [deliverer, setDeliverer] = useState("");

  // Cargar opciones de productores desde la base de datos
  useEffect(() => {
    (async () => {
      try {
        const { getProducersGridData } = await import('@/app/actions/producers');
        const res = await getProducersGridData({ page: 1, limit: 100, sortBy: 'name', sortOrder: 'ASC' });
        if (res.success && Array.isArray(res.data)) {
          setProducerOptions(res.data.map((prod: any) => ({ id: prod.id, label: prod.name })));
        } else {
          setProducerOptions([]);
        }
      } catch (e) {
        setProducerOptions([]);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const v = await getVarieties();
      setVarietyOptions(Array.isArray(v.data) ? v.data.map((item: any) => ({ id: item.id, label: item.name })) : []);
      const f = await getFormats();
      setFormatOptions(Array.isArray(f.data) ? f.data.map((item: any) => ({ id: item.id, label: item.name, priceCLP: item.priceCLP, priceUSD: item.priceUSD })) : []);
      const t = await getTrays();
      setTrayOptions(Array.isArray(t.data) ? t.data.map((item: any) => ({ id: item.id, label: item.name, weight: item.weight })) : []);
    })();
  }, []);

  // Handler para agregar un nuevo pack
  const handleAddPack = () => {
    setPacks(prev => [...prev, { id: Date.now() }]);
  };

  // Handler para eliminar un pack
  const handleRemovePack = (id: number) => {
    setPacks(prev => prev.filter(pack => pack.id !== id));
  };

  // Handler para actualizar los datos de un pack
  const handlePackChange = (idx: number, details: any) => {
    setPacks(prev => prev.map((pack, i) => i === idx ? { ...pack, ...details } : pack));
  };

  // Handlers para devoluciones de bandejas
  const handleAddTrayDevolution = () => {
    const newDevolution = {
      id: `tray-dev-${Date.now()}-${Math.random()}`,
      trayId: null,
      quantity: 0,
      trayLabel: null,
    };
    setTrayDevolutions(current => [...current, newDevolution]);
  };

  const handleRemoveTrayDevolution = (devolutionId: string) => {
    setTrayDevolutions(current => current.filter(dev => dev.id !== devolutionId));
  };

  const handleTrayDevolutionChange = (id: string, trayId: string | null) => {
    const selectedTray = trayOptions.find(option => option.id === trayId);
    setTrayDevolutions(current => 
      current.map(dev => 
        dev.id === id 
          ? { 
              ...dev, 
              trayId, 
              trayLabel: selectedTray?.label || null,
              quantity: trayId ? dev.quantity : 0 
            }
          : dev
      )
    );
  };

  const handleTrayQuantityChange = (id: string, quantity: number) => {
    setTrayDevolutions(current => 
      current.map(dev => dev.id === id ? { ...dev, quantity } : dev)
    );
  };

  // Estado para el dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSnapshot, setDialogSnapshot] = useState<ReceptionDataSnapshot | null>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [processedReception, setProcessedReception] = useState<ReceptionDataSnapshot | null>(null);
  const [processedReceptionId, setProcessedReceptionId] = useState<string | null>(null);

  // Validación para habilitar el botón de procesar
  const canProcessReception = producer && packs.length > 0;

  // Manejar guardado exitoso de la recepción multipack
  const handleSaveReception = useCallback(({ snapshot, receptionTransactionId }: { snapshot: ReceptionDataSnapshot; receptionTransactionId: string | null }) => {
    setDialogOpen(false);
    setProcessedReception(snapshot);
    setProcessedReceptionId(receptionTransactionId ?? null);
    setIsPrintDialogOpen(true);
    setDialogSnapshot(null);
  }, []);
  
  // Manejar cierre del diálogo de impresión
  const handlePrintDialogClose = useCallback(() => {
    setIsPrintDialogOpen(false);
    setDialogOpen(false);
    setProcessedReception(null);
    setProcessedReceptionId(null);
    setDialogSnapshot(null);
    
    // Mostrar mensaje de éxito
    showAlert({
      message: 'Recepción multipack procesada exitosamente',
      type: 'success'
    });
    
    // Limpiar formulario
    setProducer(null);
    setGuide('');
    setDeliverer('');
    setPacks([]);
    setTrayDevolutions([]);
    
    // Redirigir a la página de recepciones
    router.push('/home/receptions/receptions');
  }, [router, showAlert]);
  
  // Procesar recepción multipack
  const handleProcessReception = () => {
    // Armar el snapshot con los datos actuales
    const packsSummary = packs.map((pack, idx) => ({
      ...pack,
      packNumber: idx + 1,
    }));
    
    // Mapear devoluciones de bandejas al formato esperado
    const trayDevolutionsSummary = trayDevolutions.map((dev, idx) => ({
      id: idx + 1, // TrayDevolutionItem expects number id
      trayId: dev.trayId,
      trayLabel: dev.trayLabel || trayOptions.find(t => t.id === dev.trayId)?.label || null,
      quantity: dev.quantity, // quantity instead of quantityReturned
    }));
    
    const snapshot = {
      producer,
      guide,
      driver: deliverer,
      packs: packsSummary,
      trayDevolutions: trayDevolutionsSummary,
      trayOptions,
      totals: EMPTY_TOTALS,
      exchangeRate: 0,
    };
    setDialogSnapshot(snapshot);
    setDialogOpen(true);
  };

  // Layout
  return (
    <div className="p-6 space-y-8">
      {/* Fila superior: productor, guía, entregador */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Productor</label>
          <AutoComplete
            options={producerOptions}
            value={producer}
            onChange={setProducer}
            placeholder="Selecciona productor"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Guía</label>
          <TextField
            label="Guía"
            value={guide}
            onChange={e => setGuide(e.target.value)}
            placeholder="N° guía"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Entregado por</label>
          <TextField
            label="Entregado por"
            value={deliverer}
            onChange={e => setDeliverer(e.target.value)}
            placeholder="Nombre entregador"
          />
        </div>
      </div>

      {/* Fila intermedia: grid de tarjetas de detalle de recepción */}
      <div className="w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Packs</h3>
          <IconButton
            variant="basicSecondary"
            aria-label="Agregar pack"
            onClick={handleAddPack}
            icon="add"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {(() => {
            // Siempre mostrar múltiplos de 4 slots (vacíos o con card)
            const total = packs.length;
            const slots = total === 0 ? CARDS_PER_ROW : (total % CARDS_PER_ROW === 0 ? total : total + (CARDS_PER_ROW - (total % CARDS_PER_ROW)));
            return Array.from({ length: slots }).map((_, idx) => {
              const pack = packs[idx];
              return (
                <div key={pack?.id || `slot-${idx}`} className="min-h-[200px] flex items-stretch justify-stretch">
                  {pack ? (
                    <DetailReceptionCard
                      packNumber={idx + 1}
                      isMultipack={true}
                      varietyOptions={varietyOptions}
                      formatOptions={formatOptions}
                      trayOptions={trayOptions}
                      showRemoveButton={true}
                      onRemove={() => handleRemovePack(pack.id)}
                      onChange={details => handlePackChange(idx, details)}
                    />
                  ) : (
                    <div className="border-2 border-dashed rounded h-full w-full flex items-center justify-center text-gray-300" />
                  )}
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Resumen de la recepción multipack */}
      <div className="mt-6 p-4 rounded-lg border bg-gray-50 shadow-sm">
        <h3 className="font-semibold mb-3 text-primary">Resumen de recepción</h3>
        
        {/* Totales principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <div>
            <div className="text-xs text-gray-500">Total bandejas</div>
            <div className="text-lg font-bold">{formatInteger(resumen.totalBandejas)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Peso bruto (kg)</div>
            <div className="text-lg font-bold">{formatDecimal(resumen.totalPesoBruto)} kg</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Peso neto (kg)</div>
            <div className="text-lg font-bold">{formatDecimal(resumen.totalPesoNeto)} kg</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Total CLP</div>
            <div className="text-lg font-bold text-primary">{formatCLP(resumen.totalCLP)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Total USD</div>
            <div className="text-lg font-bold text-primary">{formatUSD(resumen.totalUSD)}</div>
          </div>
        </div>
        
        {/* Sección de devoluciones */}
        <div className="border-t pt-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-700">Devoluciones de bandejas</h4>
            <div className="text-sm font-bold text-orange-600">
              Total devueltas: {resumen.totalBandejasDevueltas}
            </div>
          </div>
          {trayDevolutions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {trayDevolutions.map((dev, index) => {
                const trayLabel = dev.trayLabel || trayOptions.find(t => t.id === dev.trayId)?.label || 'Sin tipo';
                return (
                  <div key={dev.id} className="text-xs bg-white rounded px-2 py-1 border">
                    <span className="font-medium">{trayLabel}:</span> {dev.quantity} ud.
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-gray-400 italic">No hay devoluciones de bandejas</div>
          )}
        </div>
      </div>

      {/* Fila inferior: devolución de bandejas */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Devolución de bandejas</h3>
          <IconButton
            variant="basicSecondary"
            aria-label="Agregar devolución de bandejas"
            onClick={handleAddTrayDevolution}
            icon="add"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {(() => {
            // Mostrar slots estéticos fijos (4) y cards reales dinámicas
            const totalCards = trayDevolutions.length;
            const minSlots = 4; // Siempre mostrar al menos 4 slots estéticos
            const totalSlots = Math.max(totalCards, minSlots);
            
            return Array.from({ length: totalSlots }).map((_, idx) => {
              const devolution = trayDevolutions[idx];
              return (
                <div key={devolution?.id || `tray-slot-${idx}`} className="min-h-[200px] flex items-stretch justify-stretch">
                  {devolution ? (
                    <TrayDevolutionCard
                      trayId={devolution.trayId}
                      quantity={devolution.quantity}
                      trayOptions={trayOptions.map(t => ({ ...t, stock: 100 }))}
                      onTrayChange={(trayId) => handleTrayDevolutionChange(devolution.id, trayId)}
                      onQuantityChange={(quantity) => handleTrayQuantityChange(devolution.id, quantity)}
                      onRemove={() => handleRemoveTrayDevolution(devolution.id)}
                      index={idx}
                    />
                  ) : (
                    <div className="border-2 border-dashed rounded h-full w-full flex items-center justify-center text-gray-300" />
                  )}
                </div>
              );
            });
          })()}
        </div>
      </div>
      {/* Botón para procesar recepción */}
      <div className="flex justify-end mt-8">
        <Button 
          variant="primary" 
          onClick={handleProcessReception}
          disabled={!canProcessReception}
        >
          Procesar recepción
        </Button>
      </div>

      {/* Dialog resumen recepción multipack */}
      <ProcessedMultipackReceptionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        data={dialogSnapshot}
        onSave={handleSaveReception}
      />
      
      {/* Dialog impresión recepción multipack */}
      <PrintMultipackReceptionDialog
        open={isPrintDialogOpen}
        onClose={handlePrintDialogClose}
        snapshot={processedReception}
        receptionTransactionId={processedReceptionId}
      />
    </div>
  );
};

export default MultiPackReception;
