"use client";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DialogToPrint from '@/app/baseComponents/Dialog/DialogToPrint';
import type { ReceptionDataSnapshot, ReceptionTotals, ReceptionPackSummary } from '../../simple/ui/TransactionData';
import type { TrayDevolutionItem } from '../../simple/ui/TrayDevolutionContainer';
import { Currency } from '@/data/entities/Variety';
import {
  aggregatePalletLines,
  buildMultipackReceptionTicketEscPos,
  getDefaultReceptionPrintOptions,
  loadReceptionPrintOptions,
  printRaw,
  resolveReceptionTicketDate,
  resolveTicketHeaderParties,
  saveReceptionPrintOptions,
  type ReceptionPrintOptions,
} from '@/lib/printing';
import PrintOptionsPanel from '@/app/home/receptions/receptions/ui/PrintOptionsPanel';

interface PrintMultipackReceptionDialogProps {
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

const PrintMultipackReceptionDialog: React.FC<PrintMultipackReceptionDialogProps> = ({
  open,
  onClose,
  snapshot,
  receptionTransactionId,
}) => {
  const data = snapshot ?? EMPTY_SNAPSHOT;
  const packs: ReceptionPackSummary[] = data.packs ?? [];
  const trayDevolutions: TrayDevolutionItem[] = data.trayDevolutions ?? [];
  const [printOptions, setPrintOptions] = useState<ReceptionPrintOptions>(
    getDefaultReceptionPrintOptions
  );

  useEffect(() => {
    if (!open) return;
    setPrintOptions(loadReceptionPrintOptions());
  }, [open]);

  const handlePrintOptionsChange = useCallback((next: ReceptionPrintOptions) => {
    setPrintOptions(next);
    saveReceptionPrintOptions(next);
  }, []);

  const palletLines = useMemo(() => aggregatePalletLines(packs), [packs]);

  const receptionDate = useMemo(
    () => resolveReceptionTicketDate(data?.createdAt),
    [data?.createdAt, open, receptionTransactionId],
  );
  const formattedDate = useMemo(
    () => new Intl.DateTimeFormat('es-CL', { dateStyle: 'short' }).format(receptionDate),
    [receptionDate],
  );
  const formattedTime = useMemo(
    () => new Intl.DateTimeFormat('es-CL', { timeStyle: 'short', hour12: false }).format(receptionDate),
    [receptionDate],
  );

  const ticketParties = useMemo(
    () =>
      resolveTicketHeaderParties({
        producer: data?.producer
          ? {
              label: data.producer.label,
              productiveUnitId: data.producer.productiveUnitId,
              productiveUnitName: data.producer.productiveUnitName,
            }
          : null,
        driver: data?.driver,
      }),
    [data?.producer, data?.driver]
  );

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
        value: receptionMetadata.varieties.length > 1 
          ? `${receptionMetadata.varieties.length} variedades`
          : receptionMetadata.varieties[0] || '—',
      },
      {
        key: 'formats',
        label: 'Formato',
        value: receptionMetadata.formats.length > 1 
          ? `${receptionMetadata.formats.length} formatos`
          : receptionMetadata.formats[0] || '—',
      },
      {
        key: 'trayTypes',
        label: 'Tipo bandeja',
        value: receptionMetadata.trayTypes.length > 1 
          ? `${receptionMetadata.trayTypes.length} tipos`
          : receptionMetadata.trayTypes[0] || '—',
      },
      {
        key: 'packs',
        label: 'Packs',
        value: packs.length.toString(),
      },
      {
        key: 'trays',
        label: 'Bandejas',
        value: packs.reduce((sum, p) => sum + (p.traysQuantity ?? 0), 0).toString(),
      },
      {
        key: 'grossWeight',
        label: 'Peso bruto',
        value: `${formatNumber(packs.reduce((sum, p) => sum + (p.grossWeight ?? 0), 0))} kg`,
      },
      {
        key: 'traysWeight',
        label: 'Peso bandejas',
        value: `${formatNumber(receptionMetadata.traysWeightKg)} kg`,
      },
      {
        key: 'netWeightBeforeImpurities',
        label: 'Peso neto c/impurezas',
        value: `${formatNumber(packs.reduce((sum, p) => sum + (p.netWeightBeforeImpurities ?? 0), 0))} kg`,
      },
      {
        key: 'impurities',
        label: 'Impurezas',
        value: `${formatNumber(receptionMetadata.totalImpurities)} kg`,
      },
      {
        key: 'netWeight',
        label: 'Peso neto',
        value: `${formatNumber(packs.reduce((sum, p) => sum + (p.netWeight ?? 0), 0))} kg`,
      },
      {
        key: 'traysReturned',
        label: 'Bandejas devueltas',
        value: totalTraysReturned.toString(),
      }
    ];

    return rows;
  }, [packs, receptionMetadata, totalTraysReturned]);

  const totalToPayByCurrency = useMemo(() => {
    const clpTotal = packs
      .filter(p => p.currency === Currency.CLP)
      .reduce((sum, p) => sum + (p.totalToPay ?? 0), 0);
    
    const usdTotal = packs
      .filter(p => p.currency === Currency.USD)
      .reduce((sum, p) => sum + (p.totalToPay ?? 0), 0);

    return { clpTotal, usdTotal };
  }, [packs]);

  const multipackSections = [
    {
      title: 'Información General',
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium text-gray-700">Productor:</span>
              <div className="text-gray-900">{ticketParties.displayProducerName}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">RUT:</span>
              <div className="text-gray-900">{ticketParties.displayProducerDni}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium text-gray-700">Guía:</span>
              <div className="text-gray-900">{data.guide || '—'}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Entregada por:</span>
              <div className="text-gray-900">{ticketParties.deliveredBy || '—'}</div>
            </div>
          </div>
          <div>
            <span className="font-medium text-gray-700">ID Transacción:</span>
            <div className="text-gray-900 font-mono">{receptionTransactionId || '—'}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Resumen de Recepción Multipack',
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            {receptionOverviewRows.map((row) => (
              <div key={row.key} className="flex justify-between">
                <span className="font-medium text-gray-700">{row.label}:</span>
                <span className="text-gray-900">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: `Detalle de Packs (${packs.length})`,
      content: (
        <div className="space-y-4">
          {packs.map((pack, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="font-medium text-gray-900 mb-3">Pack #{pack.packNumber || index + 1}</div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Variedad:</span>
                  <span className="text-gray-900">{pack.varietyName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Formato:</span>
                  <span className="text-gray-900">{pack.formatName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Bandeja:</span>
                  <span className="text-gray-900">{pack.trayLabel || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Cantidad:</span>
                  <span className="text-gray-900">{pack.traysQuantity || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Peso bruto:</span>
                  <span className="text-gray-900">{formatNumber(pack.grossWeight ?? 0)} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Peso neto:</span>
                  <span className="text-gray-900">{formatNumber(pack.netWeight ?? 0)} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Precio:</span>
                  <span className="text-gray-900">{formatCurrency(pack.price ?? 0, pack.currency)}/kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Total a pagar:</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(pack.totalToPay ?? 0, pack.currency)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: `Devolución de Bandejas (${totalTraysReturned})`,
      content: (
        <div className="space-y-3">
          {trayDevolutions.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {trayDevolutions.map((devolution, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <span className="text-gray-700">{devolution.trayLabel || `Bandeja ${devolution.trayId}`}:</span>
                  <span className="text-gray-900 font-medium">{devolution.quantity || 0} unidades</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 italic">No hay devolución de bandejas</div>
          )}
        </div>
      ),
    },
    {
      title: 'Totales a Pagar',
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            {totalToPayByCurrency.clpTotal > 0 && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700 font-medium">Total CLP:</span>
                <span className="text-gray-900 text-lg font-semibold">{formatCurrency(totalToPayByCurrency.clpTotal, Currency.CLP)}</span>
              </div>
            )}
            {totalToPayByCurrency.usdTotal > 0 && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700 font-medium">Total USD:</span>
                <span className="text-gray-900 text-lg font-semibold">{formatCurrency(totalToPayByCurrency.usdTotal, Currency.USD)}</span>
              </div>
            )}
            {data.exchangeRate > 0 && totalToPayByCurrency.usdTotal > 0 && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700 text-sm">Tipo de cambio:</span>
                <span className="text-gray-900 text-sm">{formatNumber(data.exchangeRate, 0)} CLP/USD</span>
              </div>
            )}
          </div>
        </div>
      ),
    },
  ];

  const handlePrintTicket = useCallback(async () => {
    const bytes = await buildMultipackReceptionTicketEscPos(
      data,
      receptionTransactionId,
      new Date(),
      printOptions
    );
    await printRaw(bytes, { requestIfMissing: true });
  }, [data, receptionTransactionId, printOptions]);

  return (
    <DialogToPrint
      open={open}
      onClose={onClose}
      title="Recepción Multipack"
      size="sm"
      contentClassName="bg-white"
      printLabel="Imprimir recepción"
      onPrintTicket={handlePrintTicket}
      ticketLabel="Ticket USB"
      controls={
        <PrintOptionsPanel options={printOptions} onChange={handlePrintOptionsChange} />
      }
    >
      <div 
        className="flex flex-col gap-1 text-[13px] leading-tight text-foreground"
        style={{ width: '76mm', maxWidth: '76mm', padding: '0' }}
      >
        <header className="flex flex-col items-center gap-1 text-center">
          <p className="text-[13px]">Recepción multipack</p>
          {printOptions.showLogo ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logoPrint.png"
                alt="Zeniz"
                className="h-auto w-[14mm] object-contain"
              />
            </>
          ) : null}
          <p className="text-[18px] font-bold tracking-wide">ZENIZ</p>
        </header>

        {/* Información General */}
        <section className="flex flex-col border-t border-dashed border-border pt-1">
          <h4 className="text-right text-[13px] font-semibold uppercase">Info General</h4>
          <div className="text-[13px]">
            <div><span>Folio: </span><span>#{receptionTransactionId ?? '—'}</span></div>
            <div><span>Productor: </span><span>{ticketParties.displayProducerName}</span></div>
            <div><span>RUT: </span><span>{ticketParties.displayProducerDni}</span></div>
            <div><span>Fecha: </span><span>{formattedDate}</span></div>
            <div><span>Hora: </span><span>{formattedTime}</span></div>
            {printOptions.showGuideDriver && data.guide ? (
              <div><span>Guía: </span><span>{data.guide}</span></div>
            ) : null}
            {ticketParties.hasProductiveUnit && ticketParties.deliveredBy ? (
              <div><span>Entregada por: </span><span>{ticketParties.deliveredBy}</span></div>
            ) : printOptions.showGuideDriver && ticketParties.deliveredBy ? (
              <div><span>Entregada por: </span><span>{ticketParties.deliveredBy}</span></div>
            ) : null}
          </div>
        </section>

        {/* Resumen Multipack */}
        <section className="border-t border-dashed border-border pt-1">
          <h4 className="text-right text-[13px] font-semibold uppercase">Resumen</h4>
          <div className="text-[13px]">
            {receptionOverviewRows.map((row) => (
              <div key={row.key} className="text-left">
                <span>{row.label}: </span>
                <span>{row.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Detalle de Packs */}
        {printOptions.showPackDetails ? (
          <section className="border-t border-dashed border-border pt-1">
            <h4 className="text-right text-[13px] font-semibold uppercase">Packs ({packs.length})</h4>
            {packs.map((pack, index) => (
              <div key={index} className="text-[12px] mb-1 border-b border-dotted border-border pb-1">
                <div className="font-medium">Pack #{pack.packNumber || index + 1}</div>
                <div><span>Variedad: </span><span>{pack.varietyName || '—'}</span></div>
                <div><span>Formato: </span><span>{pack.formatName || '—'}</span></div>
                <div><span>Bandeja: </span><span>{pack.trayLabel || '—'}</span></div>
                <div><span>Cant: </span><span>{pack.traysQuantity || 0} uds</span></div>
                <div><span>P.Bruto: </span><span>{formatNumber(pack.grossWeight ?? 0)} kg</span></div>
                <div><span>P.Neto: </span><span>{formatNumber(pack.netWeight ?? 0)} kg</span></div>
                {printOptions.showPrices ? (
                  <>
                    <div><span>Precio: </span><span>{formatCurrency(pack.price ?? 0, pack.currency)}/kg</span></div>
                    <div><span>Total: </span><span className="font-medium">{formatCurrency(pack.totalToPay ?? 0, pack.currency)}</span></div>
                  </>
                ) : null}
              </div>
            ))}
          </section>
        ) : null}

        {printOptions.showPallets ? (
          <section className="border-t border-dashed border-border pt-1">
            <h4 className="text-right text-[13px] font-semibold uppercase">Pallets</h4>
            <div className="text-[13px]">
              {palletLines.length > 0 ? (
                palletLines.map((line) => (
                  <div key={line.palletId} className="text-left">
                    <span>Pallet #{line.palletId}: </span>
                    <span>
                      {formatNumber(line.traysAssigned, 0)} ban.
                      {line.grossWeightKg > 0
                        ? ` · ${formatNumber(line.grossWeightKg, 2)} kg`
                        : ''}
                      {line.packNumbers.length
                        ? ` (pack ${line.packNumbers.join(',')})`
                        : ''}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-left text-muted-foreground">Sin asignación a pallets</div>
              )}
            </div>
          </section>
        ) : null}

        {/* Devolución de Bandejas */}
        {printOptions.showTrayDevolutions && trayDevolutions.length > 0 && (
          <section className="border-t border-dashed border-border pt-1">
            <h4 className="text-right text-[13px] font-semibold uppercase">Bandejas Dev ({totalTraysReturned})</h4>
            <div className="text-[13px]">
              {trayDevolutions.map((devolution, index) => (
                <div key={index} className="text-left">
                  <span>{devolution.trayLabel || `Bandeja ${devolution.trayId}`}: </span>
                  <span>{devolution.quantity || 0} uds</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Totales */}
        {printOptions.showPrices ? (
          <section className="border-t border-dashed border-border pt-1">
            <h4 className="text-right text-[13px] font-semibold uppercase">Totales</h4>
            <div className="text-[13px]">
              {totalToPayByCurrency.clpTotal > 0 && (
                <div className="text-left">
                  <span>Total CLP: </span>
                  <span className="font-medium">{formatCurrency(totalToPayByCurrency.clpTotal, Currency.CLP)}</span>
                </div>
              )}
              {totalToPayByCurrency.usdTotal > 0 && (
                <div className="text-left">
                  <span>Total USD: </span>
                  <span className="font-medium">{formatCurrency(totalToPayByCurrency.usdTotal, Currency.USD)}</span>
                </div>
              )}
              {data.exchangeRate > 0 && totalToPayByCurrency.usdTotal > 0 && (
                <div className="text-left text-[12px]">
                  <span>T.Cambio: </span>
                  <span>{formatNumber(data.exchangeRate, 0)} CLP/USD</span>
                </div>
              )}
            </div>
          </section>
        ) : null}

      </div>
    </DialogToPrint>
  );
};

export default PrintMultipackReceptionDialog;