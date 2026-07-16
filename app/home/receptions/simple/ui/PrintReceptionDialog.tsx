"use client";
import React, { useMemo } from 'react';
import DialogToPrint from '@/app/baseComponents/Dialog/DialogToPrint';
import type { ReceptionDataSnapshot, ReceptionTotals, ReceptionPackSummary } from './TransactionData';
import type { TrayDevolutionItem } from './TrayDevolutionContainer';
import { Currency } from '@/data/entities/Variety';

interface PrintReceptionDialogProps {
  open: boolean;
  onClose: () => void;
  snapshot: ReceptionDataSnapshot | null;
  receptionTransactionId?: string | null;
}

const EMPTY_TOTALS: ReceptionTotals = {
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

const formatCurrency = (value: number, currency: Currency | null) => {
  if (!value) {
    return currency === Currency.CLP ? '$0' : 'US$0.00';
  }

  if (currency === Currency.USD) {
    return new Intl.NumberFormat('es-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
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

const PrintReceptionDialog: React.FC<PrintReceptionDialogProps> = ({
  open,
  onClose,
  snapshot,
  receptionTransactionId,
}) => {
  const data = snapshot ?? EMPTY_SNAPSHOT;
  const totals = data?.totals ?? EMPTY_TOTALS;
  const packs: ReceptionPackSummary[] = Array.isArray(data?.packs) ? data.packs : [];
  const trayDevolutions: TrayDevolutionItem[] = Array.isArray(data?.trayDevolutions)
    ? data.trayDevolutions
    : [];
  const currencyBreakdown = useMemo(() => {
    const clpFromTotals = Math.max(0, totals?.totalToPayCLP ?? 0);
    const usdFromTotals = Math.max(0, totals?.totalToPayUSD ?? 0);
    const exchangeRateRaw = typeof data?.exchangeRate === 'number' ? data.exchangeRate : 0;
    const exchangeRate = exchangeRateRaw && Number.isFinite(exchangeRateRaw)
      ? Math.max(0, exchangeRateRaw)
      : 0;

    const clpFromPacks = packs.reduce((sum, pack) => {
      const rawTotal = typeof pack.totalToPay === 'number'
        ? pack.totalToPay
        : Number(pack.totalToPay ?? 0);
      const normalizedTotal = Number.isFinite(rawTotal) ? Math.max(0, rawTotal) : 0;
      const currencyCode = String(pack.currency ?? Currency.CLP).toUpperCase();
      if (currencyCode === Currency.USD) {
        return sum;
      }
      return sum + normalizedTotal;
    }, 0);

    const usdFromPacks = packs.reduce((sum, pack) => {
      const rawTotal = typeof pack.totalToPay === 'number'
        ? pack.totalToPay
        : Number(pack.totalToPay ?? 0);
      const normalizedTotal = Number.isFinite(rawTotal) ? Math.max(0, rawTotal) : 0;
      const currencyCode = String(pack.currency ?? Currency.CLP).toUpperCase();
      if (currencyCode === Currency.USD) {
        return sum + normalizedTotal;
      }
      return sum;
    }, 0);

    const resolvedCLP = clpFromTotals > 0 ? clpFromTotals : clpFromPacks;
    const resolvedUSD = usdFromTotals > 0 ? usdFromTotals : usdFromPacks;
    const combinedFromTotals = Math.max(0, totals?.totalCLPToPay ?? 0);

    let totalToPay = resolvedCLP + resolvedUSD * exchangeRate;
    if (!(totalToPay > 0) && combinedFromTotals > 0) {
      totalToPay = combinedFromTotals;
    }

    let normalizedCLP = resolvedCLP;
    if (!(normalizedCLP > 0) && totalToPay > 0) {
      const difference = totalToPay - resolvedUSD * exchangeRate;
      normalizedCLP = difference > 0 ? difference : 0;
    }

    return {
      clp: normalizedCLP,
      usd: resolvedUSD,
      exchangeRate,
      total: totalToPay,
    };
  }, [data?.exchangeRate, packs, totals]);

  const printedAt = useMemo(() => new Date(), [open, receptionTransactionId]);

  const formattedDate = useMemo(() => (
    new Intl.DateTimeFormat('es-CL', { dateStyle: 'short' }).format(printedAt)
  ), [printedAt]);

  const formattedTime = useMemo(() => (
    new Intl.DateTimeFormat('es-CL', { 
      timeStyle: 'short',
      hour12: false 
    }).format(printedAt)
  ), [printedAt]);

  const producerInfo = useMemo(() => {
    const label = data?.producer?.label ?? '';
    if (!label) return { name: '—', dni: '—' };
    
    const parts = label.split(' - ');
    return {
      name: parts[0] || '—',
      dni: parts[1] || '—',
    };
  }, [data?.producer?.label]);

  const totalTraysReturned = useMemo(() => (
    trayDevolutions.reduce((sum, item) => sum + (item.quantity ?? 0), 0)
  ), [trayDevolutions]);

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

    rows.push({
      key: 'totalClp',
      label: 'Total CLP',
      value: formatCurrency(currencyBreakdown.clp, Currency.CLP),
    });

    rows.push({
      key: 'totalUsd',
      label: 'Total USD',
      value: formatCurrency(currencyBreakdown.usd, Currency.USD),
    });

    // rows.push({
    //   key: 'exchangeRate',
    //   label: 'Cambio',
    //   value: currencyBreakdown.exchangeRate > 0
    //     ? `${formatNumber(currencyBreakdown.exchangeRate, 2)} CLP/USD`
    //     : '—',
    // });

    // rows.push({
    //   key: 'totalToPay',
    //   label: 'Total a pagar',
    //   value: formatCurrency(currencyBreakdown.total, Currency.CLP),
    // });

    if (totalTraysReturned > 0) {
      rows.push({
        key: 'returnedTrays',
        label: 'Bandejas devueltas',
        value: formatNumber(totalTraysReturned, 0),
      });
    }

    return rows;
  }, [receptionMetadata, totals, totalTraysReturned]);

  // Estilos específicos para impresión en papel térmico de 80mm
  const thermalPrintStyles = `
    @page {
      size: 80mm auto;
      margin: 0;
    }
    @media print {
      html, body {
        width: 80mm !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      #print-root {
        width: 80mm !important;
        padding: 2mm !important;
        margin: 0 !important;
      }
    }
  `;

  return (
    <DialogToPrint
      open={open}
      onClose={onClose}
      title="Recibo de recepción"
      size="xs"
      contentClassName="bg-white"
      printLabel="Imprimir recibo"
      onBeforePrint={onClose}
      printStyles={thermalPrintStyles}
    >
      <div
        className="flex flex-col gap-1 text-[13px] leading-tight text-foreground"
        style={{ width: '76mm', maxWidth: '76mm', padding: '0' }}
      >
        <header className="text-left">
          <h1 className="text-xl font-semibold uppercase">ZENIZ</h1>
          <p className="text-[13px]">Comprobante recepción</p>
        </header>

        <section className="flex flex-col border-t border-dashed border-border pt-1">
          <div className="text-[13px] uppercase">
            <span className="font-semibold">Recepción: </span>
            <span>#{receptionTransactionId ?? '—'}</span>
          </div>
          <div className="text-[13px]">
            <span>Fecha: </span>
            <span>{formattedDate}</span>
          </div>
          <div className="text-[13px]">
            <span>Hora: </span>
            <span>{formattedTime}</span>
          </div>
          <div className="text-[13px]">
            <span>Productor: </span>
            <span>{producerInfo.name}</span>
          </div>
          <div className="text-[13px]">
            <span>RUT: </span>
            <span>{producerInfo.dni}</span>
          </div>
        </section>

        <section className="border-t border-dashed border-border pt-1">
          <h4 className="text-left text-[13px] font-semibold uppercase">Resumen</h4>
          <div className="flex flex-col text-[13px]">
            {receptionOverviewRows.map((row) => (
              <div key={row.key} className="text-left">
                <span>{row.label}: </span>
                <span>{row.value}</span>
              </div>
            ))}
          </div>
        </section>

        {trayDevolutions.length > 0 ? (
          <section className="border-t border-dashed border-border pt-1">
            <h4 className="text-left text-[13px] font-semibold uppercase">Devolución de bandejas</h4>
            <div className="flex flex-col text-[13px]">
              {trayDevolutions.map((item, index) => (
                <div key={`${item.trayId ?? 'tray'}-${index}`} className="text-left">
                  <span>{item.trayLabel ?? item.trayId ?? 'Bandeja'}: </span>
                  <span>{formatNumber(item.quantity ?? 0, 0)}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <footer className="border-t border-dashed border-border pt-1 text-left text-[13px] text-muted-foreground">
          <p>Gracias por su entrega.</p>
          <p>Conserve este comprobante.</p>
        </footer>
      </div>
    </DialogToPrint>
  );
};

export default PrintReceptionDialog;
