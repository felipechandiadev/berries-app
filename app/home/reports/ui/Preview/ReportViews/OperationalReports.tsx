'use client';

import React, { useState, useEffect } from 'react';
import { ReportFilters, getOperationalReports, OperationalReportsData } from '../../../../../actions/reports';
import KPICard from '../../components/KPICard';
import ExportButtons from '../../components/ExportButtons';

interface OperationalReportsProps {
  filters: ReportFilters;
}

export default function OperationalReports({ filters }: OperationalReportsProps) {
  const [data, setData] = useState<OperationalReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getOperationalReports(filters);
        setData(result);
        setError(null);
      } catch (err) {
        console.error('Error fetching operational reports:', err);
        setError('Error al cargar los datos operativos');
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
          <h2 className="text-2xl font-bold text-gray-900">Reportes Operativos</h2>
          <p className="text-gray-600 mt-1">
            Resumen de operaciones diarias y eficiencia
          </p>
        </div>
        <ExportButtons
          data={data}
          filename="reportes-operativos"
          title="Reportes Operativos"
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Total Recepciones"
          value={data.summary.totalReceptions.toString()}
          icon="📥"
        />
        <KPICard
          title="Total Despachos"
          value={data.summary.totalDispatches.toString()}
          icon="📤"
        />
        <KPICard
          title="Eficiencia"
          value={`${Math.round(data.summary.efficiency * 100)}%`}
          icon="⚡"
        />
      </div>

      {/* Operations Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Daily Operations */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Operaciones Diarias</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {data.dailyOperations.map((day) => (
                <div key={day.date} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(day.date).toLocaleDateString()}
                  </span>
                  <div className="flex space-x-4 text-sm">
                    <span className="text-green-600">+{day.receptions}</span>
                    <span className="text-blue-600">-{day.dispatches}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Processing Times */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Tiempos de Procesamiento</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {/* Processing times removed - data not available */}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Operations Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Detalle de Operaciones</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.operations.map((operation) => (
                <tr key={operation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(operation.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {operation.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {operation.quantity.toLocaleString()} kg
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      operation.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : operation.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {operation.status}
                    </span>
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