'use client';

import { useMemo } from 'react';
import { formatAuditDate } from '@/lib/dateTimeUtils';
import type { PendingAdvanceRow } from '@/app/actions/settlements';
import Switch from '@/app/baseComponents/Switch/Switch';

interface PendingAdvancesTableProps {
  rows: PendingAdvanceRow[];
  selectedIds: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
}

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CHECK: 'Cheque',
};

function formatPaymentMethod(value: string | undefined): string {
  if (!value) return '—';
  return paymentMethodLabels[value] ?? value;
}

export default function PendingAdvancesTable({ rows, selectedIds, onToggle }: PendingAdvancesTableProps) {
  const totalSelected = useMemo(() => {
    return rows.reduce((total, row) => {
      if (!selectedIds.has(row.transactionId)) {
        return total;
      }
      return total + row.availableAmount;
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
            <th scope="col" className="px-3 py-3 text-left" aria-label="Seleccionar anticipo"></th>
            <th scope="col" className="px-4 py-3 text-left">Folio</th>
            <th scope="col" className="px-4 py-3 text-left">Fecha</th>
            <th scope="col" className="px-4 py-3 text-left">Método</th>
            <th scope="col" className="px-4 py-3 text-right">Monto disponible</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-background">
          {rows.map((row) => {
            const isChecked = selectedIds.has(row.transactionId);
            return (
              <tr key={row.transactionId} className="transition-colors hover:bg-muted/30">
                <td className="px-3 py-3 align-middle">
                  <Switch
                    checked={isChecked}
                    onChange={(value) => onToggle(row.transactionId, value)}
                    data-test-id="pending-advance-switch"
                  />
                </td>
                <td className="px-4 py-3 font-mono text-xs text-foreground">{row.transactionId}</td>
                <td className="px-4 py-3 text-sm font-medium text-foreground">{formatAuditDate(row.createdAt)}</td>
                <td className="px-4 py-3 text-sm text-foreground">{formatPaymentMethod(row.paymentMethod)}</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-primary">
                  {currencyFormatter.format(row.availableAmount)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-muted/30 text-sm font-semibold text-foreground">
          <tr>
            <td colSpan={4} className="px-4 py-3 text-right uppercase tracking-wide">Total anticipos</td>
            <td className="px-4 py-3 text-right text-primary">{currencyFormatter.format(totalSelected)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
