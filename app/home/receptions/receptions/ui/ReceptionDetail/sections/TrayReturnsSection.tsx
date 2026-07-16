'use client';

import type { ReceptionDetailTrayReturn } from '../types';

interface TrayReturnsSectionProps {
  trayReturns: ReceptionDetailTrayReturn[];
  isSettled?: boolean;
}

export function TrayReturnsSection({ trayReturns, isSettled = false }: TrayReturnsSectionProps) {
  if (!trayReturns.length) {
    return <p className="text-sm text-gray-500">No se registraron devoluciones de bandejas.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-600">
          <tr>
            <th className="px-3 py-2 font-semibold">Bandeja</th>
            <th className="px-3 py-2 font-semibold">Cantidad devuelta</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {trayReturns.map((returnItem) => (
            <tr key={`${returnItem.transactionId}-${returnItem.trayId ?? 'tray'}`}>
              <td className="px-3 py-2">
                {returnItem.trayLabel ?? returnItem.trayId ?? '—'}
              </td>
              <td className="px-3 py-2">
                {returnItem.quantityReturned.toLocaleString('es-CL')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
