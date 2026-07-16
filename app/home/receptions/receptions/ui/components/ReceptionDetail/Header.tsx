'use client';

import { Button } from '@/app/baseComponents/Button/Button';
import { formatAuditDate } from '@/lib/dateTimeUtils';
import type { ReceptionDetailSummary, ReceptionDetailTotals } from './types';

interface ReceptionDetailHeaderProps {
  summary: ReceptionDetailSummary;
  totals?: ReceptionDetailTotals | null;
  onClose: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

export function ReceptionDetailHeader({ summary, totals, onClose, onRefresh, refreshing = false }: ReceptionDetailHeaderProps) {
  const creationInfoParts: string[] = [];

  if (summary.createdAt) {
    creationInfoParts.push(`Registrada el ${formatAuditDate(summary.createdAt)}`);
  }

  if (summary.createdByName) {
    creationInfoParts.push(`Por ${summary.createdByName}`);
  }

  if (summary.seasonName) {
    creationInfoParts.push(`Temporada ${summary.seasonName}`);
  }

  const payLabel = totals?.totalCLPToPay ?? summary.totalCLPToPay ?? summary.amount;
  const formattedPayLabel = currencyFormatter.format(payLabel || 0);

  return (
    <header className="flex flex-col gap-4 border-b border-gray-200 pb-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-gray-900">
            Recepción #{summary.id}
          </h2>
          <div className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
            {summary.guideNumber && (
              <span className="font-medium text-gray-600">Guía {summary.guideNumber}</span>
            )}
            {summary.producerName && (
              <span>Productor {summary.producerName}</span>
            )}
            {creationInfoParts.map((part) => (
              <span key={part}>{part}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              variant="outlined"
              onClick={() => onRefresh()}
              disabled={refreshing}
            >
              {refreshing ? 'Actualizando…' : 'Actualizar'}
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
          Total a pagar: {formattedPayLabel}
        </span>
        {summary.exchangeRate !== undefined && summary.exchangeRate !== null && (
          <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600">
            Tipo de cambio: {summary.exchangeRate ?? 0}
          </span>
        )}
        {summary.payableUSD && summary.payableUSD > 0 && (
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600">
            USD a pagar: {summary.payableUSD.toLocaleString('es-CL', { maximumFractionDigits: 2 })}
          </span>
        )}
      </div>
    </header>
  );
}
