'use client';

import { formatAuditDate } from '@/lib/dateTimeUtils';
import type { ReceptionDetailRelatedMovementGroup } from '../types';

interface RelatedMovementsSectionProps {
  groups: ReceptionDetailRelatedMovementGroup[];
}

export function RelatedMovementsSection({ groups }: RelatedMovementsSectionProps) {
  const groupsWithItems = groups.filter((group) => group.items.length > 0);

  if (!groupsWithItems.length) {
    return <p className="text-sm text-gray-500">No hay movimientos relacionados registrados.</p>;
  }

  return (
    <div className="space-y-6">
      {groupsWithItems.map((group) => (
        <div key={group.relationType} className="border border-gray-200 rounded-md">
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
            <h5 className="text-sm font-semibold text-gray-700">{group.label}</h5>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-gray-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">Transacción</th>
                  <th className="px-3 py-2 font-semibold">Contexto</th>
                  <th className="px-3 py-2 font-semibold">Tipo</th>
                  <th className="px-3 py-2 font-semibold">Dirección</th>
                  <th className="px-3 py-2 font-semibold">Cantidad</th>
                  <th className="px-3 py-2 font-semibold">Fecha</th>
                  <th className="px-3 py-2 font-semibold">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {group.items.map((item) => (
                  <tr key={`${group.relationType}-${item.id}`} className="align-top">
                    <td className="px-3 py-2">
                      #{item.id}
                    </td>
                    <td className="px-3 py-2">
                      {item.relationContext ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      {item.transactionType ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      {item.direction ?? '—'} {item.unit ? `(${item.unit})` : ''}
                    </td>
                    <td className="px-3 py-2">
                      {item.amount.toLocaleString('es-CL', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2">
                      {item.createdAt ? formatAuditDate(item.createdAt) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {item.metadata ? (
                        <details>
                          <summary className="cursor-pointer text-blue-600">Ver metadata</summary>
                          <pre className="mt-2 bg-gray-50 text-[11px] p-2 rounded border border-gray-100 overflow-auto max-h-48 whitespace-pre-wrap">
                            {JSON.stringify(item.metadata, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
