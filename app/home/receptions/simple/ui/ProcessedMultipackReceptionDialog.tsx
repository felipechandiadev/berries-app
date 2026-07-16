"use client";
import React, { useMemo, useState } from "react";
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { Button } from '@/app/baseComponents/Button/Button';
import type { ReceptionDataSnapshot, ReceptionPackSummary } from './TransactionData';
import { Currency } from '@/data/entities/Variety';
import { processReception } from '@/app/actions/receptions';

interface ProcessedMultipackReceptionDialogProps {
  open: boolean;
  onClose: () => void;
  onSave?: (result: any) => void;
  data: ReceptionDataSnapshot | null;
}

const formatNumber = (value: number, decimals = 2) =>
  new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value ?? 0);

const formatCurrencyValue = (value: number, currency: Currency | null) => {
  if (!value) {
    return currency === Currency.CLP ? '$0' : 'US$0,00';
  }
  if (currency === Currency.USD) {
    return `US$${formatNumber(value, 2)}`;
  }
  if (currency === Currency.CLP) {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
  return formatNumber(value, 2);
};

const ProcessedMultipackReceptionDialog: React.FC<ProcessedMultipackReceptionDialogProps> = ({
  open,
  onClose,
  onSave,
  data,
}) => {
  const snapshot = data;
  const packs: ReceptionPackSummary[] = snapshot?.packs ?? [];
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const summaryTotals = useMemo(() => {
    return packs.reduce(
      (acc, pack) => {
        const trays = pack.traysQuantity || 0;
        const grossWeight = pack.grossWeight || 0;
        const netWeight = pack.netWeight || 0;
        const total = pack.totalToPay || 0;

        acc.totalTrays += trays;
        acc.totalGrossWeight += grossWeight;
        acc.totalNetWeight += netWeight;

        if (pack.currency === Currency.USD) {
          acc.totalUSD += total;
        } else {
          acc.totalCLP += total;
        }

        return acc;
      },
      { totalTrays: 0, totalGrossWeight: 0, totalNetWeight: 0, totalCLP: 0, totalUSD: 0 }
    );
  }, [packs]);

  const { totalTrays, totalGrossWeight, totalNetWeight, totalCLP, totalUSD } = summaryTotals;

  const handleSave = async () => {
    if (!packs.length) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const packInputs = packs.map((pack) => ({
        packNumber: pack.packNumber,
        varietyId: Number(pack.varietyId ?? 0),
        varietyName: pack.varietyName ?? null,
        formatId: Number(pack.formatId ?? 0),
        formatName: pack.formatName ?? null,
        trayId: pack.trayId ?? null,
        trayLabel: pack.trayLabel ?? null,
        traysQuantity: pack.traysQuantity ?? 0,
        unitTrayWeight: pack.unitTrayWeight ?? 0,
        traysTotalWeight: pack.traysTotalWeight ?? 0,
        grossWeight: pack.grossWeight ?? 0,
        netWeightBeforeImpurities: pack.netWeightBeforeImpurities ?? 0,
        netWeight: pack.netWeight ?? 0,
        impurityPercent: pack.impurityPercent ?? 0,
        price: pack.price ?? 0,
        currency: pack.currency ?? Currency.CLP,
        totalToPay: pack.totalToPay ?? 0,
        palletAssignments: (pack.palletAssignments ?? []).map((assignment) => ({
          palletId: assignment.palletId,
          traysAssigned: assignment.traysAssigned,
        })),
      }));
      // Calcular totales requeridos
      const totals = {
        totalPacks: packInputs.length,
        totalTraysInPacks: packInputs.reduce((sum, p) => sum + (p.traysQuantity || 0), 0),
        totalTraysDevolved: (snapshot?.trayDevolutions ?? []).reduce((sum, t) => sum + (t.quantity || 0), 0),
        totalGrossWeight: packInputs.reduce((sum, p) => sum + (p.grossWeight || 0), 0),
        totalNetWeight: packInputs.reduce((sum, p) => sum + (p.netWeight || 0), 0),
        totalToPayUSD: packInputs.filter(p => p.currency === Currency.USD).reduce((sum, p) => sum + (p.totalToPay || 0), 0),
        totalToPayCLP: packInputs.filter(p => p.currency === Currency.CLP).reduce((sum, p) => sum + (p.totalToPay || 0), 0),
        totalCLPToPay: packInputs.filter(p => p.currency === Currency.CLP).reduce((sum, p) => sum + (p.totalToPay || 0), 0) + packInputs.filter(p => p.currency === Currency.USD).reduce((sum, p) => sum + (p.totalToPay || 0), 0) * (snapshot?.exchangeRate || 0),
      };
      const payload = {
        producer: snapshot?.producer ? { id: snapshot.producer.id, label: snapshot.producer.label } : null,
        guide: snapshot?.guide ?? '',
        driver: snapshot?.driver ?? '',
        packs: packInputs,
        trayDevolutions: (snapshot?.trayDevolutions ?? []).map((item) => ({
          trayId: item.trayId,
          trayLabel: item.trayLabel ?? null,
          quantity: item.quantity ?? 0,
        })),
        totals,
        exchangeRate: snapshot?.exchangeRate ?? 0,
      };
      const response = await processReception(payload);
      if (!response.success) {
        throw new Error(response.error ?? 'No fue posible procesar la recepción multipack');
      }
      onSave?.({ snapshot, receptionTransactionId: response.data?.receptionTransactionId ?? null });
      onClose();
    } catch (error: any) {
      setErrorMessage(error?.message ?? 'No fue posible guardar la recepción multipack');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Resumen recepción multipack"
      size="md"
      data-test-id="processed-multipack-reception-dialog"
      scroll="paper"
    >
      <div className="space-y-6">
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Packs de la recepción</h3>
          {packs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No hay packs registrados.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {packs.map((pack, idx) => (
                <div key={pack.id || pack.packNumber} className="rounded border bg-white p-3 shadow-sm">
                  <div className="font-semibold text-sm mb-1">Pack #{pack.packNumber}</div>
                  <div className="text-xs text-muted-foreground mb-1">Variedad: <span className="text-foreground">{pack.varietyName || '-'}</span></div>
                  <div className="text-xs text-muted-foreground mb-1">Formato: <span className="text-foreground">{pack.formatName || '-'}</span></div>
                  <div className="text-xs text-muted-foreground mb-1">Bandeja: <span className="text-foreground">{pack.trayLabel || '-'}</span></div>
                  <div className="text-xs text-muted-foreground mb-1">Cantidad bandejas: <span className="text-foreground">{pack.traysQuantity}</span></div>
                  <div className="text-xs text-muted-foreground mb-1">Peso bruto: <span className="text-foreground">{formatNumber(pack.grossWeight, 2)} kg</span></div>
                  <div className="text-xs text-muted-foreground mb-1">Peso neto: <span className="text-foreground">{formatNumber(pack.netWeight, 2)} kg</span></div>
                  <div className="text-xs text-muted-foreground mb-1">Impurezas: <span className="text-foreground">{formatNumber(pack.impurityPercent, 2)}%</span></div>
                  <div className="text-xs text-muted-foreground mb-1">Precio/kg: <span className="text-foreground">{formatCurrencyValue(pack.price, pack.currency)}</span></div>
                  <div className="text-xs text-muted-foreground mb-1">Total a pagar: <span className="text-foreground">{formatCurrencyValue(pack.totalToPay, pack.currency)}</span></div>
                </div>
              ))}
            </div>
          )}
        </section>
        
        {/* Sección de devoluciones de bandejas */}
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Devoluciones de bandejas</h3>
          {(!snapshot?.trayDevolutions || snapshot.trayDevolutions.length === 0) ? (
            <p className="text-xs text-muted-foreground">No hay devoluciones de bandejas registradas.</p>
          ) : (
            <div>
              <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-orange-800">Total bandejas devueltas:</span>
                  <span className="text-sm font-bold text-orange-900">
                    {snapshot.trayDevolutions.reduce((sum, dev) => sum + (dev.quantity || 0), 0)} unidades
                  </span>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {snapshot.trayDevolutions.map((dev, idx) => (
                  <div key={dev.id || idx} className="rounded border bg-white p-3 shadow-sm">
                    <div className="text-xs text-muted-foreground mb-1">
                      Tipo: <span className="text-foreground font-medium">{dev.trayLabel || 'Sin especificar'}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Cantidad: <span className="text-foreground font-medium">{dev.quantity || 0} unidades</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
        
        {/* Resumen de totales */}
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Resumen general</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 p-4 bg-gray-50 rounded border">
            <div className="text-center">
              <div className="text-lg font-bold text-primary">{totalTrays}</div>
              <div className="text-xs text-muted-foreground">Total bandejas</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-primary">{formatNumber(totalGrossWeight, 2)} kg</div>
              <div className="text-xs text-muted-foreground">Peso bruto</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-primary">{formatNumber(totalNetWeight, 2)} kg</div>
              <div className="text-xs text-muted-foreground">Peso neto</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-primary">{formatCurrencyValue(totalCLP, Currency.CLP)}</div>
              <div className="text-xs text-muted-foreground">Total CLP</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-primary">{formatCurrencyValue(totalUSD, Currency.USD)}</div>
              <div className="text-xs text-muted-foreground">Total USD</div>
            </div>
          </div>
        </section>
        {errorMessage && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outlined" onClick={onClose}>
            Cerrar
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!packs.length || isSaving}>
            {isSaving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default ProcessedMultipackReceptionDialog;
