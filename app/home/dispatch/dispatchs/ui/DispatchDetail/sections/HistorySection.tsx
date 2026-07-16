'use client';

import React from 'react';
import { DispatchWithRelations } from '../types';
import { formatAuditDate } from '@/lib/dateTimeUtils';

interface HistorySectionProps {
  data: DispatchWithRelations;
}

export const HistorySection: React.FC<HistorySectionProps> = ({ data }) => {
  // Create a copy and reverse to show newest first
  const history = [...(data.metadata.history || [])].reverse();

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <span className="material-symbols-outlined text-4xl mb-2">history</span>
        <p>No hay historial de cambios para este despacho.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto px-1">
      <h3 className="text-lg font-medium mb-4">Historial de Cambios</h3>
      <ul className="space-y-4">
        {history.map((entry, index) => (
          <li key={`${entry.date}-${index}`} className="border border-gray-200 rounded-md p-3">
            <div className="flex flex-wrap justify-between gap-2 mb-2 text-sm text-gray-600">
              <span className="font-medium text-gray-800">{entry.action}</span>
              <span>
                {entry.date ? formatAuditDate(entry.date) : 'Fecha desconocida'}
              </span>
            </div>
            <div className="text-xs text-gray-500 mb-2">
              {entry.userName
                ? `Por ${entry.userName}`
                : 'Autor desconocido'}
            </div>
            {entry.details && (
              <div className="bg-gray-50 border border-gray-100 rounded-md p-2 text-xs text-gray-700">
                {entry.details}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
