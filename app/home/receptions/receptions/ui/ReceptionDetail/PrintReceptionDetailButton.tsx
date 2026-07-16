"use client";

import { useMemo, useState } from "react";
import DialogToPrint from "@/app/baseComponents/Dialog/DialogToPrint";
import IconButton from "@/app/baseComponents/IconButton/IconButton";
import { Currency } from "@/data/entities/Variety";
import type { ReceptionDetailData } from "./types";

const printStyles = `
@page {
  size: Letter;
  margin: 5mm;
}
@media print {
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  /* Forzar fondo de headers */
  thead th, tfoot td {
    background-color: #f3f4f6 !important; /* bg-gray-100 */
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
`;

interface PrintReceptionDetailButtonProps {
  data: ReceptionDetailData;
}

const numberFormatter = new Intl.NumberFormat("es-CL", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat("es-CL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const clpFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const usdFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function normalizeCurrency(value: string | null | undefined): Currency {
  return String(value ?? "CLP").toUpperCase() === Currency.USD ? Currency.USD : Currency.CLP;
}

function formatNumber(value: number | null | undefined, decimals: 0 | 2 = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return decimals === 0 ? integerFormatter.format(value) : numberFormatter.format(value);
}

function formatCurrency(value: number | null | undefined, currency: Currency): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return currency === Currency.USD ? usdFormatter.format(value) : clpFormatter.format(value);
}

function calculateTotals(data: ReceptionDetailData) {
  const exchangeRateRaw = Number(data.summary.exchangeRate ?? 0);
  const exchangeRate = Number.isFinite(exchangeRateRaw) && exchangeRateRaw > 0 ? exchangeRateRaw : 0;

  const fallback = data.packs.reduce(
    (acc, pack) => {
      const amountRaw = typeof pack.totalToPay === "number" ? pack.totalToPay : Number(pack.totalToPay ?? 0);
      const amount = Number.isFinite(amountRaw) ? Math.max(0, amountRaw) : 0;
      const currencyCode = String(pack.currency ?? Currency.CLP).toUpperCase();
      if (currencyCode === Currency.USD) {
        acc.usd += amount;
      } else {
        acc.clp += amount;
      }
      return acc;
    },
    { clp: 0, usd: 0 }
  );

  const clpCandidates = [
    Number(data.totals?.payableCLP ?? 0),
    data.summary.unit === "CLP" ? Number(data.summary.amount ?? 0) : 0,
    fallback.clp,
  ].filter((value) => Number.isFinite(value) && value > 0);

  const usdCandidates = [
    Number(data.totals?.payableUSD ?? 0),
    Number(data.summary.payableUSD ?? 0),
    data.summary.unit === "USD" ? Number(data.summary.amount ?? 0) : 0,
    fallback.usd,
  ].filter((value) => Number.isFinite(value) && value > 0);

  const totalCandidates = [
    Number(data.totals?.totalCLPToPay ?? 0),
    Number(data.summary.totalCLPToPay ?? 0),
  ].filter((value) => Number.isFinite(value) && value > 0);

  const clp = clpCandidates.length ? Math.max(...clpCandidates) : 0;
  const usd = usdCandidates.length ? Math.max(...usdCandidates) : 0;

  let total = totalCandidates.length ? Math.max(...totalCandidates) : clp + usd * exchangeRate;
  if (!(total > 0)) {
    total = clp + usd * exchangeRate;
  }

  let normalizedCLP = clp;
  if (!(normalizedCLP > 0) && total > 0) {
    const difference = total - usd * exchangeRate;
    normalizedCLP = difference > 0 ? difference : 0;
  }

  return {
    clp: normalizedCLP,
    usd,
    exchangeRate,
    total,
  };
}

export function PrintReceptionDetailButton({ data }: PrintReceptionDetailButtonProps) {
  const [open, setOpen] = useState(false);

  const printedAt = useMemo(() => new Date(), [open]);
  const formattedPrintedDate = useMemo(
    () => new Intl.DateTimeFormat("es-CL", { dateStyle: "long" }).format(printedAt),
    [printedAt]
  );
  const formattedPrintedTime = useMemo(
    () =>
      new Intl.DateTimeFormat("es-CL", {
        timeStyle: "short",
        hour12: false,
      }).format(printedAt),
    [printedAt]
  );

  const aggregatedTotals = useMemo(() => {
    if (data.totals) {
      return {
        traysInPacks: data.totals.traysInPacks ?? 0,
        trayWeightKg: data.totals.trayWeightKg ?? 0,
        grossWeightKg: data.totals.grossWeightKg ?? 0,
        netWeightKg: data.totals.netWeightKg ?? 0,
        payableCLP: data.totals.payableCLP ?? 0,
        payableUSD: data.totals.payableUSD ?? 0,
        trayReturns: data.totals.trayReturns ?? 0,
        totalCLPToPay: data.totals.totalCLPToPay ?? data.summary.totalCLPToPay ?? data.summary.amount ?? 0,
      };
    }

    const fallback = data.packs.reduce(
      (acc, pack) => {
        const currency = normalizeCurrency(pack.currency);
        acc.traysInPacks += pack.traysQuantity ?? 0;
        acc.trayWeightKg += pack.traysTotalWeightKg ?? 0;
        acc.grossWeightKg += pack.grossWeightKg ?? 0;
        acc.netWeightKg += pack.netWeightKg ?? 0;
        if (currency === Currency.CLP) {
          acc.payableCLP += pack.totalToPay ?? 0;
        } else {
          acc.payableUSD += pack.totalToPay ?? 0;
        }
        return acc;
      },
      {
        traysInPacks: 0,
        trayWeightKg: 0,
        grossWeightKg: 0,
        netWeightKg: 0,
        payableCLP: 0,
        payableUSD: 0,
        trayReturns: data.trayReturns.reduce((sum, item) => sum + (item.quantityReturned ?? 0), 0),
        totalCLPToPay: data.summary.totalCLPToPay ?? data.summary.amount ?? 0,
      }
    );

    return fallback;
  }, [data]);

  const impuritiesKg = useMemo(
    () =>
      data.packs.reduce((sum, pack) => {
        const before = pack.netWeightBeforeImpuritiesKg ?? 0;
        const after = pack.netWeightKg ?? 0;
        return sum + Math.max(before - after, 0);
      }, 0),
    [data.packs]
  );

  const metadata = useMemo(() => {
    const varieties = new Set<string>();
    const formats = new Set<string>();
    const trayTypes = new Set<string>();

    data.packs.forEach((pack) => {
      if (pack.varietyName) varieties.add(pack.varietyName);
      if (pack.formatName) formats.add(pack.formatName);
      if (pack.trayLabel) trayTypes.add(pack.trayLabel);
    });

    return {
      varieties: Array.from(varieties),
      formats: Array.from(formats),
      trayTypes: Array.from(trayTypes),
    };
  }, [data.packs]);

  const isSettled = useMemo(
    () =>
      data.relatedMovements.some(
        (group) => group.relationType === "RECEPTION_TO_SETTLEMENT" && group.items.length > 0
      ),
    [data.relatedMovements]
  );

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const totalsForDisplay = useMemo(() => calculateTotals(data), [data]);

  return (
    <>
      <IconButton
        icon="print"
        variant="text"
        size="md"
        onClick={handleOpen}
        title="Imprimir recepción"
      />
      <DialogToPrint
        open={open}
        onClose={handleClose}
        title={'Vista de impresión'}
        size="xl"
        contentClassName="bg-white"
        printLabel="Imprimir"
        onBeforePrint={handleClose}
        zIndex={80}
        preferBrowserPrint
        printStyles={printStyles}
      >
        <div className="flex flex-col gap-4 p-1">
          <div className="border-b border-gray-200 pb-0.5 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">Recepción #{data.summary.id}</h2>
            <p className="text-sm text-gray-500">{formattedPrintedDate} {formattedPrintedTime}</p>
          </div>

          {/* Producer Info */}
          <section className="rounded-lg border border-gray-200 bg-gray-50 p-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs uppercase text-gray-500">Productor</p>
                <p className="font-medium text-gray-900">{data.producer?.name ?? data.summary.producerName ?? "—"}</p>
                <p className="text-sm text-gray-600">{data.producer?.dni ?? data.producer?.personDni ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Temporada</p>
                <p className="font-medium text-gray-900">{data.summary.seasonName ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Guía</p>
                <p className="font-medium text-gray-900">{data.documents.guideNumber ?? data.summary.guideNumber ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Entregado por</p>
                <p className="font-medium text-gray-900">{data.summary.driver ?? "—"}</p>
              </div>
            </div>
          </section>

          {/* Summary Boxes */}
          <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <div className="rounded-lg border border-gray-200 p-2">
              <p className="text-xs font-medium uppercase text-gray-500">Total Bandejas</p>
              <p className="mt-1 text-sm font-bold text-gray-900">{formatNumber(aggregatedTotals.traysInPacks, 0)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-2">
              <p className="text-xs font-medium uppercase text-gray-500">Kg Neto</p>
              <p className="mt-1 text-sm font-bold text-gray-900">{formatNumber(aggregatedTotals.netWeightKg)} kg</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-2">
              <p className="text-xs font-medium uppercase text-gray-500">Total CLP</p>
              <p className="mt-1 text-sm font-bold text-gray-900">{formatCurrency(totalsForDisplay.clp, Currency.CLP)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-2">
              <p className="text-xs font-medium uppercase text-gray-500">Total USD</p>
              <p className="mt-1 text-sm font-bold text-gray-900">{formatCurrency(totalsForDisplay.usd, Currency.USD)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-2">
              <p className="text-xs font-medium uppercase text-gray-500">Cambio</p>
              <p className="mt-1 text-sm font-bold text-gray-900">
                {totalsForDisplay.exchangeRate > 0 ? `${formatNumber(totalsForDisplay.exchangeRate, 2)} CLP/USD` : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-2">
              <p className="text-xs font-medium uppercase text-gray-500">Total a pagar</p>
              <p className="mt-1 text-sm font-bold text-gray-900">{formatCurrency(totalsForDisplay.total, Currency.CLP)}</p>
            </div>
          </div>

          {/* Reception Details Table */}
          <section>
            <h3 className="mb-1 font-semibold text-gray-900">Detalle de Recepción</h3>
            <div className="overflow-hidden border border-gray-200">
              <table className="w-full text-[9px] text-left">
                <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-1">Folio</th>
                    <th className="px-4 py-1">Variedad</th>
                    <th className="px-4 py-1">Formato</th>
                    <th className="px-4 py-1">Bandejas</th>
                    <th className="px-4 py-1">Kg Bruto</th>
                    <th className="px-4 py-1">Kg Neto</th>
                    <th className="px-4 py-1">Precio</th>
                    <th className="px-4 py-1">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {data.packs.map((pack) => (
                    <tr key={pack.packId} className="border-b border-gray-200">
                      <td className="px-4 py-1">{pack.packNumber ?? pack.packId}</td>
                      <td className="px-4 py-1">{pack.varietyName ?? "—"}</td>
                      <td className="px-4 py-1">{pack.formatName ?? "—"}</td>
                      <td className="px-4 py-1">{formatNumber(pack.traysQuantity, 0)}</td>
                      <td className="px-4 py-1">{formatNumber(pack.grossWeightKg)} kg</td>
                      <td className="px-4 py-1">{formatNumber(pack.netWeightKg)} kg</td>
                      <td className="px-4 py-1">{formatCurrency(pack.pricePerKg, normalizeCurrency(pack.currency))}</td>
                      <td className="px-4 py-1">{formatCurrency(pack.totalToPay, normalizeCurrency(pack.currency))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Tray Returns Table */}
          {data.trayReturns.length > 0 && (
            <section>
              <h3 className="mb-1 font-semibold text-gray-900">Devolución de Bandejas</h3>
              <div className="overflow-hidden border border-gray-200">
                <table className="w-full text-[9px] text-left">
                  <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-1">Bandeja</th>
                      <th className="px-4 py-1">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {data.trayReturns.map((item, index) => (
                      <tr key={`${item.trayId ?? index}`} className="border-b border-gray-200">
                        <td className="px-4 py-1">{item.trayLabel ?? "—"}</td>
                        <td className="px-4 py-1">{formatNumber(item.quantityReturned, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100">
                    <tr>
                      <td className="px-4 py-1 font-medium text-gray-900">Total</td>
                      <td className="px-4 py-1 font-bold text-gray-900">{formatNumber(aggregatedTotals.trayReturns, 0)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}

          {/* Status Section */}
          <section className="rounded-lg border border-gray-200 bg-gray-50 p-2">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Estado</h3>
              <p className={`text-sm font-bold ${isSettled ? 'text-emerald-700' : 'text-amber-700'}`}>
                {isSettled ? 'LIQUIDADA' : 'PENDIENTE'}
              </p>
            </div>
          </section>
        </div>
      </DialogToPrint>
    </>
  );
}

export default PrintReceptionDetailButton;
