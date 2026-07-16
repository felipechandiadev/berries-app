'use client';

import React, { useEffect, useState } from 'react';
import { ReportFilters, getFinancialReports, FinancialReportsData } from '../../../../../actions/reports';
import KPICard from '../../components/KPICard';
import ChartContainer from '../../components/ChartContainer';
import ExportButtons from '../../components/ExportButtons';

interface FinancialReportsProps {
  filters: ReportFilters;
}

export default function FinancialReports({ filters }: FinancialReportsProps) {
  const [data, setData] = useState<FinancialReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getFinancialReports(filters);
        setData(result);
        setError(null);
      } catch (err) {
        console.error('Error fetching financial reports:', err);
        setError('Error al cargar los reportes financieros');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters, refreshKey]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar el reporte</h3>
          <p className="text-gray-500">{error || 'No se pudieron cargar los datos'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reportes Financieros</h2>
          <p className="text-gray-600 mt-1">Resumen de ingresos, órdenes y clientes</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setRefreshKey(prev => prev + 1)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            title="Actualizar datos"
          >
            🔄 Actualizar
          </button>
          <ExportButtons
            data={data}
            filename="financial-reports"
            title="Reportes Financieros"
            onRefresh={() => setRefreshKey(prev => prev + 1)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <KPICard title="Ingresos Totales" value={`$${data.summary.totalRevenue.toLocaleString()}`} icon="💰" />
        <KPICard title="Órdenes Totales" value={data.summary.totalDispatches.toString()} icon="🧾" />
        <KPICard title="Valor Medio Orden" value={`$${Math.round(data.summary.avgOrderValue).toLocaleString()}`} icon="⚖️" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer title="Ingresos por Mes" data={data.monthlyRevenue} type="line" dataKey="value" nameKey="name" />
        <ChartContainer title="Ingresos por Cliente (Top)" data={data.revenueByClient.slice(0, 10)} type="bar" dataKey="value" nameKey="name" />
      </div>

      <div className="mt-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Top Clientes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingresos</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.topClients.map((c, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{c.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${c.totalRevenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}