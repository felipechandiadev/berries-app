'use client';

import React, { useState, useEffect } from 'react';
import { ReportFilters, getInventoryStatus, InventoryStatusData } from '../../../../../actions/reports';
import KPICard from '../../components/KPICard';
import ChartContainer from '../../components/ChartContainer';
import ExportButtons from '../../components/ExportButtons';

interface InventoryStatusProps {
  filters: ReportFilters;
}

export default function InventoryStatus({ filters }: InventoryStatusProps) {
  const [data, setData] = useState<InventoryStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getInventoryStatus(filters);
        setData(result);
        setError(null);
      } catch (err) {
        console.error('Error fetching inventory status:', err);
        setError('Error al cargar los datos de inventario');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error al cargar el reporte
          </h3>
          <p className="text-gray-500">{error || 'No se pudieron cargar los datos'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Estado del Inventario</h2>
          <p className="text-gray-600 mt-1">
            Control de stock y disponibilidad de productos
          </p>
        </div>
        <ExportButtons
          data={data}
          filename="estado-inventario"
          title="Estado del Inventario"
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Total Pallets"
          value={data.summary.totalPallets.toString()}
          icon="📦"
        />
        <KPICard
          title="Pallets Ocupados"
          value={data.summary.occupiedPallets.toString()}
          icon="📊"
        />
        <KPICard
          title="Pallets Disponibles"
          value={data.summary.availablePallets.toString()}
          icon="✅"
        />
        <KPICard
          title="Tasa de Utilización"
          value={`${Math.round(data.summary.utilizationRate * 100)}%`}
          icon="📈"
        />
      </div>

      {/* Inventory Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Pallets by Storage */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Pallets por Almacén</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {data.byStorage.map((storage) => (
                <div key={storage.storageId} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">
                    {storage.storageName}
                  </span>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {storage.capacity} pallets
                    </div>
                    <div className="text-xs text-gray-500">
                      {storage.occupied} ocupados
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Utilization Chart */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Tasa de Utilización</h3>
          </div>
          <div className="p-6">
            <ChartContainer
              title="Tasa de Utilización"
              data={data.byStorage.map(storage => ({
                name: storage.storageName,
                value: storage.utilizationRate
              }))}
              type="bar"
              dataKey="value"
              nameKey="name"
              height={200}
            />
          </div>
        </div>
      </div>

      {/* Detailed Pallets Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Estado de Pallets por Almacén</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Almacén
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Pallets
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ocupados
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Disponibles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilización
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.byStorage.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.storageName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.capacity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.occupied}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.available}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {Math.round(item.utilizationRate)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}