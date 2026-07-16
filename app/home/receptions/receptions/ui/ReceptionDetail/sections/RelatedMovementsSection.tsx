'use client';

import { formatAuditDate } from '@/lib/dateTimeUtils';
import type { ReceptionDetailRelatedMovementGroup, ReceptionDetailRelatedMovement } from '../types';

interface RelatedMovementsSectionProps {
  groups: ReceptionDetailRelatedMovementGroup[];
}

const getTransactionTypeLabel = (type?: string | null): string => {
  switch (type) {
    case 'TRAY_ADJUSTMENT':
      return 'Ajuste de bandeja';
    case 'TRAY_IN_FROM_PRODUCER':
      return 'Entrada de productor';
    case 'TRAY_OUT_TO_PRODUCER':
      return 'Salida a productor';
    case 'TRAY_OUT_TO_CLIENT':
      return 'Salida a cliente';
    case 'TRAY_IN_FROM_CLIENT':
      return 'Entrada de cliente';
    case 'RECEPTION':
      return 'Recepción';
    case 'PALLET_TRAY_ASSIGNMENT':
      return 'Asignación de pallet';
    case 'PALLET_TRAY_RELEASE':
      return 'Liberación de pallet';
    default:
      return type ?? '—';
  }
};

const getDirectionLabel = (direction?: string | null): string => {
  switch (direction) {
    case 'IN':
      return 'Entrada';
    case 'OUT':
      return 'Salida';
    default:
      return direction ?? '—';
  }
};

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
                  <th className="px-3 py-2 font-semibold">Tipo</th>
                  <th className="px-3 py-2 font-semibold">Dirección</th>
                  <th className="px-3 py-2 font-semibold">Cantidad</th>
                  <th className="px-3 py-2 font-semibold">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {group.items.map((item) => (
                  <tr key={`${group.relationType}-${item.id}`} className="align-top">
                    <td className="px-3 py-2">
                      {item.id}
                    </td>
                    <td className="px-3 py-2">
                      {getTransactionTypeLabel(item.transactionType)}
                    </td>
                    <td className="px-3 py-2">
                      {getDirectionLabel(item.direction)} {item.unit ? `(${item.unit})` : ''}
                    </td>
                    <td className="px-3 py-2">
                      {item.amount.toLocaleString('es-CL', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2">
                      {item.createdAt ? formatAuditDate(item.createdAt) : '—'}
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
