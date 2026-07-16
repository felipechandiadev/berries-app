'use client';

import React from 'react';
import { SectionProps } from '../types';

export const ProducersSection: React.FC<SectionProps> = ({ data }) => {
  return (
    <div className="h-full overflow-auto">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-medium">Productores</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RUT</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correo</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.producers.length > 0 ? (
              data.producers.map((producer) => (
                <tr key={producer.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {producer.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {producer.dni}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {producer.mail || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {producer.phone || '-'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  No hay productores asociados a esta unidad
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
