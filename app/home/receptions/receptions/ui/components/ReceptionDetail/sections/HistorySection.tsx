'use client';

import { formatAuditDate } from '@/lib/dateTimeUtils';
import type { ReceptionDetailHistoryItem } from '../types';

interface HistorySectionProps {
  history: ReceptionDetailHistoryItem[];
}

export function HistorySection({ history }: HistorySectionProps) {
  if (!history.length) {
    return <p className="text-sm text-gray-500">No se registró historial de cambios para esta recepción.</p>;
  }

  return (
    <ul className="space-y-4">
      {history.map((entry, index) => (
        <li key={`${entry.changedAt ?? 'history'}-${index}`} className="border border-gray-200 rounded-md p-3">
          <div className="flex flex-wrap justify-between gap-2 mb-2 text-sm text-gray-600">
            <span className="font-medium text-gray-800">{entry.summary ?? 'Cambio registrado'}</span>
            <span>
              {entry.changedAt ? formatAuditDate(entry.changedAt) : 'Fecha desconocida'}
            </span>
          </div>
          <div className="text-xs text-gray-500 mb-2">
            {entry.changedByName
              ? `Por ${entry.changedByName}${entry.changedBy ? ` (${entry.changedBy})` : ''}`
              : entry.changedBy || 'Autor desconocido'}
          </div>
          {entry.details && entry.details.length > 0 && (
            <div className="bg-gray-50 border border-gray-100 rounded-md p-2 text-xs text-gray-700 space-y-1">
              {entry.details.map((detail, detailIndex) => (
                <div key={`${detail.field ?? 'field'}-${detailIndex}`}>
                  <span className="font-semibold">{detail.field ?? 'campo'}</span>:&nbsp;
                  <span className="text-gray-600">
                    {String(detail.previousValue ?? '—')} → {String(detail.newValue ?? '—')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
