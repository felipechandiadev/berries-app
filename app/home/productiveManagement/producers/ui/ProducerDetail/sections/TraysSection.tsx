'use client';

import React from 'react';
import { SectionProps } from '../types';
import { translateTransactionType } from '@/lib/transactionUtils';
import { formatAuditDate } from '@/lib/dateTimeUtils';

export const TraysSection: React.FC<SectionProps> = ({ data }) => {
  return (
    <div className="h-full flex flex-col gap-6 overflow-auto">
      {/* Balance Summary */}
      <div>
        <h3 className="text-lg font-medium mb-4">Balance de Bandejas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(data.trays.balance).length > 0 ? (
            Object.entries(data.trays.balance).map(([type, count]) => (
              <div key={type} className="flex flex-col p-3">
                <span className="text-sm text-gray-500 font-medium uppercase">{type}</span>
                <span className={`text-2xl font-bold ${count > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {Math.abs(count)}
                </span>
                <span className="text-xs text-gray-400">
                  {count > 0 ? 'Debe' : 'A favor'}
                </span>
              </div>
            ))
          ) : (
            <div className="text-gray-500 italic">No hay deuda de bandejas registrada.</div>
          )}
        </div>
      </div>

      {/* Movements List */}
      <div className="flex-1 min-h-0 overflow-auto">
        <h3 className="text-lg font-medium mb-4">Movimientos</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Folio</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de bandeja</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de movimiento</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.trays.movements.length > 0 ? (
                data.trays.movements.map((movement) => (
                  <tr key={movement.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {movement.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatAuditDate(movement.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(movement.metadata as any)?.trayLabel || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {translateTransactionType(movement.type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-right">
                      <span
                        className={movement.direction === 'OUT' ? 'text-red-600' : 'text-green-600'}
                      >
                        {movement.direction === 'OUT' ? '-' : '+'}
                        {Number((movement.metadata as any)?.quantity ?? (movement.metadata as any)?.quantityReturned ?? (movement.metadata as any)?.quantityDelivered ?? movement.amount ?? 0)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    No hay movimientos de bandejas registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
