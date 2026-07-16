'use client';

import type { ReceptionDetailTotals } from '../types';

interface TotalsSectionProps {
  totals: ReceptionDetailTotals | null;
}

const numberFormatter = new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 2,
});

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

export function TotalsSection({ totals }: TotalsSectionProps) {
  if (!totals) {
    return <p className="text-sm text-gray-500">No hay indicadores calculados para esta recepción.</p>;
  }

  const metrics = [
    { label: 'Packs', value: totals.packsCount.toLocaleString('es-CL') },
    { label: 'Bandejas recibidas', value: totals.traysInPacks.toLocaleString('es-CL') },
    { label: 'Bandejas devueltas', value: totals.trayReturns.toLocaleString('es-CL') },
    { label: 'Peso bruto (kg)', value: numberFormatter.format(totals.grossWeightKg) },
    { label: 'Peso neto (kg)', value: numberFormatter.format(totals.netWeightKg) },
    { label: 'Peso bandejas (kg)', value: numberFormatter.format(totals.trayWeightKg) },
    { label: 'A pagar CLP', value: currencyFormatter.format(totals.payableCLP) },
    { label: 'A pagar USD', value: numberFormatter.format(totals.payableUSD) },
    { label: 'Total CLP a pagar', value: currencyFormatter.format(totals.totalCLPToPay) },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {metrics.map((metric) => (
        <div key={metric.label} className="border border-gray-200 rounded-md p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">{metric.label}</p>
          <p className="text-base font-semibold text-gray-900">{metric.value}</p>
        </div>
      ))}
    </div>
  );
}
