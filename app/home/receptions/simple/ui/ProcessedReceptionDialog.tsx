"use client";
import React, { useMemo, useState } from 'react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { Button } from '@/app/baseComponents/Button/Button';
import type { ReceptionDataSnapshot, ReceptionTotals, ReceptionPackSummary } from './TransactionData';
import type { TrayDevolutionItem } from './TrayDevolutionContainer';
import { Currency } from '@/data/entities/Variety';
import { processReception, type ProcessReceptionInput } from '@/app/actions/receptions';

interface ProcessedReceptionDialogProps {
  open: boolean;
  onClose: () => void;
  onSave?: (result: ProcessedReceptionResult) => void;
  data: ReceptionDataSnapshot | null;
}

export interface ProcessedReceptionResult {
  snapshot: ReceptionDataSnapshot;
  receptionTransactionId: string | null;
}

export const EMPTY_TOTALS: ReceptionTotals = {
  totalPacks: 0,
  totalTraysInPacks: 0,
  totalTraysDevolved: 0,
  totalGrossWeight: 0,
  totalNetWeight: 0,
  totalToPayUSD: 0,
  totalToPayCLP: 0,
  totalCLPToPay: 0,
};

const EMPTY_SNAPSHOT: ReceptionDataSnapshot = {
  producer: null,
  guide: '',
  driver: '',
  packs: [],
  trayDevolutions: [],
  trayOptions: [],
  totals: EMPTY_TOTALS,
  exchangeRate: 0,
};

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

const ProcessedReceptionDialog: React.FC<ProcessedReceptionDialogProps> = ({
  open,
  onClose,
  onSave,
  data,
}) => {
  const snapshot = data ?? EMPTY_SNAPSHOT;
  const totals = snapshot?.totals ?? EMPTY_TOTALS;
  const packs: ReceptionPackSummary[] = snapshot?.packs ?? [];
  const trayDevolutions: TrayDevolutionItem[] = snapshot?.trayDevolutions ?? [];
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const receptionMetadata = useMemo(() => {
    const varieties = new Set<string>();
    const formats = new Set<string>();
    const trayTypes = new Set<string>();
    let traysWeightKg = 0;
    let totalImpurities = 0;

    packs.forEach((pack) => {
      if (pack.varietyName) {
        varieties.add(pack.varietyName);
      }
      if (pack.formatName) {
        formats.add(pack.formatName);
      }
      if (pack.trayLabel) {
        trayTypes.add(pack.trayLabel);
      }

      traysWeightKg += pack.traysTotalWeight ?? 0;

      const netBeforeImpurities = pack.netWeightBeforeImpurities ?? 0;
      const netWeight = pack.netWeight ?? 0;
      const impurityWeight = Math.max(netBeforeImpurities - netWeight, 0);
      totalImpurities += impurityWeight;
    });

    return {
      varieties: Array.from(varieties),
      formats: Array.from(formats),
      trayTypes: Array.from(trayTypes),
      traysWeightKg,
      totalImpurities,
    };
  }, [packs]);

  const receptionOverviewRows = useMemo(() => {
    const rows: Array<{ key: string; label: string; value: string }> = [
      {
        key: 'producer',
        label: 'Productor',
        value: snapshot.producer?.label ?? '—',
      },
      {
        key: 'guide',
        label: 'Guía',
        value: snapshot.guide || '—',
      },
      {
        key: 'driver',
        label: 'Entregado por',
        value: snapshot.driver || '—',
      },
      {
        key: 'varieties',
        label: 'Variedad',
        value: receptionMetadata.varieties.length
          ? receptionMetadata.varieties.join(', ')
          : '—',
      },
      // {
      //   key: 'formats',
      //   label: 'Formato',
      //   value: receptionMetadata.formats.length
      //     ? receptionMetadata.formats.join(', ')
      //     : '—',
      // },
      {
        key: 'trayTypes',
        label: 'Tipo de bandeja',
        value: receptionMetadata.trayTypes.length
          ? receptionMetadata.trayTypes.join(', ')
          : '—',
      },
      {
        key: 'totalTrays',
        label: 'Total bandejas',
        value: formatNumber(totals.totalTraysInPacks ?? 0, 0),
      },
      {
        key: 'traysKg',
        label: 'Kg bandejas',
        value: `${formatNumber(receptionMetadata.traysWeightKg ?? 0, 2)} kg`,
      },
      {
        key: 'gross',
        label: 'kg bruto',
        value: `${formatNumber(totals.totalGrossWeight ?? 0, 2)} kg`,
      },
      {
        key: 'net',
        label: 'kg neto',
        value: `${formatNumber(totals.totalNetWeight ?? 0, 2)} kg`,
      },
    ];

    if (receptionMetadata.totalImpurities > 0) {
      rows.push({
        key: 'impurities',
        label: 'Kg impurezas',
        value: `${formatNumber(receptionMetadata.totalImpurities, 2)} kg`,
      });
    }

    if (totals.totalToPayCLP > 0) {
      rows.push({
        key: 'payClp',
        label: 'Total a pagar clp',
        value: formatCurrencyValue(totals.totalToPayCLP, Currency.CLP),
      });
    }

    if (totals.totalToPayUSD > 0) {
      rows.push({
        key: 'payUsd',
        label: 'Total a pagar usd',
        value: formatCurrencyValue(totals.totalToPayUSD, Currency.USD),
      });
    }

    if ((snapshot.exchangeRate ?? 0) > 0 && totals.totalToPayUSD > 0) {
      rows.push({
        key: 'totalClpToPay',
        label: 'Total a pagar (CLP con cambio)',
        value: formatCurrencyValue(totals.totalCLPToPay ?? 0, Currency.CLP),
      });

      rows.push({
        key: 'exchangeRate',
        label: 'Cambio aplicado (CLP por USD)',
        value: formatNumber(snapshot.exchangeRate ?? 0, 2),
      });
    }

    if ((snapshot.exchangeRate ?? 0) <= 0 && totals.totalToPayUSD > 0) {
      rows.push({
        key: 'pendingExchangeRate',
        label: 'Cambio pendiente',
        value: 'Se definirá en la actualización de recepción',
      });
    }

    return rows;
  }, [snapshot.producer, snapshot.guide, snapshot.exchangeRate, receptionMetadata, totals]);

  const groupedTrayDevolutions = useMemo(() => {
    const map = new Map<string, { label: string; quantity: number }>();

    trayDevolutions.forEach((item) => {
      const key = item.trayId ?? item.trayLabel ?? String(item.id);
      const label = item.trayLabel ?? item.trayId ?? 'Bandeja';
      const quantity = item.quantity ?? 0;
      const existing = map.get(key);

      if (existing) {
        existing.quantity += quantity;
      } else {
        map.set(key, { label, quantity });
      }
    });

    return Array.from(map.values());
  }, [trayDevolutions]);

  const totalDevolvedTrays = useMemo(() => (
    groupedTrayDevolutions.reduce((sum, item) => sum + (item.quantity ?? 0), 0)
  ), [groupedTrayDevolutions]);

  const handleSave = async () => {
    if (!packs.length) {
      setErrorMessage('Debes agregar al menos un pack para procesar la recepción.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const packInputs = packs.map((pack) => {
        if (!pack.varietyId) {
          throw new Error(`El pack #${pack.packNumber} debe tener una variedad seleccionada.`);
        }

        if (!pack.formatId) {
          throw new Error(`El pack #${pack.packNumber} debe tener un formato seleccionado.`);
        }

        return {
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
        };
      });

      const payload: ProcessReceptionInput = {
        producer: snapshot.producer ? { id: snapshot.producer.id, label: snapshot.producer.label } : null,
        guide: snapshot.guide ?? '',
        driver: snapshot.driver ?? '',
        packs: packInputs,
        trayDevolutions: (snapshot.trayDevolutions ?? []).map((item) => ({
          trayId: item.trayId,
          trayLabel: item.trayLabel ?? null,
          quantity: item.quantity ?? 0,
        })),
        totals: {
          totalPacks: totals.totalPacks,
          totalTraysInPacks: totals.totalTraysInPacks,
          totalTraysDevolved: totals.totalTraysDevolved,
          totalGrossWeight: totals.totalGrossWeight,
          totalNetWeight: totals.totalNetWeight,
          totalToPayUSD: totals.totalToPayUSD,
          totalToPayCLP: totals.totalToPayCLP,
          totalCLPToPay: totals.totalCLPToPay,
        },
        exchangeRate: snapshot.exchangeRate ?? 0,
      };

      const response = await processReception(payload);

      if (!response.success) {
        throw new Error(response.error ?? 'No fue posible procesar la recepción');
      }

      const receptionId = response.data?.receptionTransactionId ?? null;
      onSave?.({ snapshot, receptionTransactionId: receptionId });
      onClose();
    } catch (error: any) {
      console.error('[ProcessedReceptionDialog] Error guardando recepción:', error);
      setErrorMessage(error?.message ?? 'No fue posible guardar la recepción');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Resumen recepción"
      size="sm"
      data-test-id="processed-reception-dialog"
      scroll="paper"
    >
      <div className="space-y-6" data-test-id="processed-reception-content">
        {errorMessage ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Recepción</h3>
          <div className="space-y-2 rounded-lg border border-border bg-gray-50 p-4 text-xs text-foreground">
            {receptionOverviewRows.map((row) => (
              <div key={row.key} className="flex items-baseline justify-between gap-3 text-left">
                <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">{row.label}</span>
                <span className="text-right text-foreground">{row.value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Devolución de bandejas</h3>
          {groupedTrayDevolutions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No se registraron bandejas devueltas.</p>
          ) : (
            <div className="space-y-2 rounded-lg border border-border bg-white p-3 text-xs shadow-sm">
              {groupedTrayDevolutions.map((item, index) => (
                <p key={`${item.label}-${index}`} className="text-sm text-foreground">
                  <span className="font-semibold">{formatNumber(item.quantity ?? 0, 0)}</span> {item.label}
                </p>
              ))}
              <div className="my-2 h-px bg-border" />
              <p className="text-xs font-semibold text-foreground">
                Total: {formatNumber(totalDevolvedTrays, 0)}
              </p>
            </div>
          )}
        </section>

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

export default ProcessedReceptionDialog;
