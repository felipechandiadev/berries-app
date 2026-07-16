'use client';

import { useMemo } from 'react';
import { formatAuditDate } from '@/lib/dateTimeUtils';
import type { PendingReceptionRow } from '@/app/actions/settlements';
import Switch from '@/app/baseComponents/Switch/Switch';

interface PendingReceptionsTableProps {
  rows: PendingReceptionRow[];
  selectedIds: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
}

const currencyFormatter = new Intl.NumberFormat('es-CL', {
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

const exchangeFormatter = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const weightFormatter = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function PendingReceptionsTable({ rows, selectedIds, onToggle }: PendingReceptionsTableProps) {
  const computeRowTotals = (row: PendingReceptionRow) => {
    const clpPortion = Number.isFinite(row.totalToPayCLP) ? row.totalToPayCLP : 0;
    const usdPortion = Number.isFinite(row.totalToPayUSD) ? row.totalToPayUSD : 0;
    const rate = Number.isFinite(row.exchangeRate) ? row.exchangeRate : 0;
    const fallbackTotal = Number.isFinite(row.totalCLPToPay) ? row.totalCLPToPay : 0;

    const totalFromBreakdown = clpPortion + usdPortion * rate;
    const total = totalFromBreakdown > 0 ? totalFromBreakdown : fallbackTotal;
    const resolvedClp = clpPortion > 0 ? clpPortion : Math.max(total - usdPortion * rate, 0);

    return {
      clp: resolvedClp,
      usd: usdPortion,
      rate,
      total,
    };
  };

  const totalSelected = useMemo(() => {
    return rows.reduce((total, row) => {
      if (!selectedIds.has(row.transactionId)) {
        return total;
      }
      const rowTotals = computeRowTotals(row);
      return total + rowTotals.total;
    }, 0);
  }, [rows, selectedIds]);

  if (!rows.length) {
    return null;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wide text-foreground">
          <tr>
            <th scope="col" className="px-3 py-3 text-left" aria-label="Seleccionar recepción"></th>
            <th scope="col" className="px-4 py-3 text-left">Folio</th>
            <th scope="col" className="px-4 py-3 text-left">Fecha</th>
            <th scope="col" className="px-4 py-3 text-right">Kilos netos</th>
            <th scope="col" className="px-4 py-3 text-right">Total CLP</th>
            <th scope="col" className="px-4 py-3 text-right">Total USD</th>
            <th scope="col" className="px-4 py-3 text-right">Cambio</th>
            <th scope="col" className="px-4 py-3 text-right">Total a pagar</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-background">
          {rows.map((row) => {
            const isChecked = selectedIds.has(row.transactionId);
            const rowTotals = computeRowTotals(row);
            return (
              <tr key={row.transactionId} className="transition-colors hover:bg-muted/30">
                <td className="px-3 py-3 align-middle">
                  <Switch
                    checked={isChecked}
                    onChange={(value) => onToggle(row.transactionId, value)}
                    data-test-id="pending-reception-switch"
                  />
                </td>
                <td className="px-4 py-3 font-mono text-xs text-foreground">{row.transactionId}</td>
                <td className="px-4 py-3 text-sm font-medium text-foreground">
                  {formatAuditDate(row.createdAt)}
                </td>
                <td className="px-4 py-3 text-right text-sm text-foreground">
                  {weightFormatter.format(row.netWeightKg)}
                </td>
                <td className="px-4 py-3 text-right text-sm text-foreground">
                  {currencyFormatter.format(rowTotals.clp)}
                </td>
                <td className="px-4 py-3 text-right text-sm text-foreground">
                  {usdFormatter.format(rowTotals.usd)}
                </td>
                <td className="px-4 py-3 text-right text-sm text-foreground">
                  {exchangeFormatter.format(rowTotals.rate)}
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-primary">
                  {currencyFormatter.format(rowTotals.total)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-muted/30 text-sm font-semibold text-foreground">
          <tr>
            <td colSpan={7} className="px-4 py-3 text-right uppercase tracking-wide">Total recepciones</td>
            <td className="px-4 py-3 text-right text-primary">{currencyFormatter.format(totalSelected)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
