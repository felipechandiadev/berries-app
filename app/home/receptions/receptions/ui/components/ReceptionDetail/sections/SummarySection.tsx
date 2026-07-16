'use client';

import { formatAuditDate } from '@/lib/dateTimeUtils';
import type { ReceptionDetailSummary, ReceptionDetailTotals, ReceptionDetailDocumentInfo } from '../types';

interface SummarySectionProps {
  summary: ReceptionDetailSummary;
  totals: ReceptionDetailTotals | null;
  documents: ReceptionDetailDocumentInfo;
}

const numberFormatter = new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 2,
});

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

export function SummarySection({ summary, totals, documents }: SummarySectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {/* Row 1 */}
        <div className="border border-gray-200 rounded-md p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Temporada</p>
          <p className="text-base font-medium text-gray-900">{summary.seasonName ?? '—'}</p>
        </div>
        <div className="border border-gray-200 rounded-md p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Identificador</p>
          <p className="text-lg font-semibold text-gray-900">{summary.id}</p>
          {summary.guideNumber && (
            <p className="text-sm text-gray-600 mt-1">Guía #{summary.guideNumber}</p>
          )}
        </div>
        <div className="border border-gray-200 rounded-md p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Fecha de registro</p>
          <p className="text-base font-medium text-gray-900">
            {summary.createdAt ? formatAuditDate(summary.createdAt) : '—'}
          </p>
          {summary.createdByName && (
            <p className="text-sm text-gray-600 mt-1">Registrada por {summary.createdByName}</p>
          )}
        </div>

        {/* Row 2 */}
        <div className="border border-gray-200 rounded-md p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Productor</p>
          <p className="text-base font-medium text-gray-900">{summary.producerName ?? '—'}</p>
        </div>
        <div className="border border-gray-200 rounded-md p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Variedades</p>
          <p className="text-base font-medium text-gray-900">
            {documents.varietyNames.length > 0 ? documents.varietyNames.join(', ') : '—'}
          </p>
        </div>
        <div className="border border-gray-200 rounded-md p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Formatos</p>
          <p className="text-base font-medium text-gray-900">
            {documents.formatNames.length > 0 ? documents.formatNames.join(', ') : '—'}
          </p>
        </div>

        {/* Row 3 */}
        <div className="border border-gray-200 rounded-md p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Tipos de bandeja</p>
          <p className="text-base font-medium text-gray-900">
            {documents.trayLabels.length > 0 ? documents.trayLabels.join(', ') : '—'}
          </p>
        </div>
        <div className="border border-gray-200 rounded-md p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">CLP</p>
          <p className="text-base font-medium text-gray-900">
            {currencyFormatter.format(totals?.payableCLP ?? 0)}
          </p>
        </div>
        <div className="border border-gray-200 rounded-md p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">USD</p>
          <p className="text-base font-medium text-gray-900">
            {summary.payableUSD?.toLocaleString('es-CL', { maximumFractionDigits: 2 }) ?? '—'}
          </p>
        </div>

        {/* Row 4 */}
        <div className="border border-gray-200 rounded-md p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Cambio</p>
          <p className="text-base font-medium text-gray-900">
            {summary.exchangeRate !== undefined && summary.exchangeRate !== null
              ? numberFormatter.format(summary.exchangeRate)
              : '—'}
          </p>
        </div>
        <div className="border border-gray-200 rounded-md p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Total a pagar</p>
          <p className="text-base font-semibold text-gray-900">
            {currencyFormatter.format(totals?.totalCLPToPay ?? summary.totalCLPToPay ?? summary.amount ?? 0)}
          </p>
          {summary.payableUSD && summary.payableUSD > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              Equivalente USD: {summary.payableUSD.toLocaleString('es-CL', { maximumFractionDigits: 2 })}
            </p>
          )}
        </div>
      </div>
      {summary.updatedAt && summary.updatedAt !== summary.createdAt && (
        <div className="text-xs text-gray-500">
          Última actualización {formatAuditDate(summary.updatedAt)}
        </div>
      )}
    </div>
  );
}
