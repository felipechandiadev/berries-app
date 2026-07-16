'use client';

import moment from 'moment-timezone';
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
              {entry.changedAt
                ? moment(entry.changedAt).tz('America/Santiago').format('YYYY-MM-DD HH:mm')
                : 'Fecha desconocida'}
            </span>
          </div>
          <div className="text-xs text-gray-500 mb-2">
            {entry.changedByName ? `Por ${entry.changedByName}` : 'Autor desconocido'}
          </div>
          {entry.details && entry.details.length > 0 && !entry.summary?.toLowerCase().includes('registro inicial') && (
            <div className="bg-gray-50 border border-gray-100 rounded-md p-2 text-xs text-gray-700 space-y-1">
              {entry.details.map((detail, detailIndex) => (
                <div key={`${detail.field ?? 'field'}-${detailIndex}`}>
                  <span className="font-semibold">{detail.field ?? 'campo'}</span>:&nbsp;
                  {detail.field?.toLowerCase().includes('fecha') ? (
                    <span className="text-gray-600">
                      {detail.previousValue
                        ? moment(detail.previousValue).tz('America/Santiago').format('YYYY-MM-DD HH:mm')
                        : '—'}
                      &nbsp;→&nbsp;
                      {detail.newValue
                        ? moment(detail.newValue).tz('America/Santiago').format('YYYY-MM-DD HH:mm')
                        : '—'}
                    </span>
                  ) : (
                    <span className="text-gray-600">
                      {String(detail.previousValue ?? '—')} → {String(detail.newValue ?? '—')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
