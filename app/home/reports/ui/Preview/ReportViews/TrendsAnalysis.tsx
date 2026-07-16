"use client";

import React, { useEffect, useState } from 'react';
import { ReportFilters, getExecutiveDashboard, ExecutiveDashboardData } from '../../../../../actions/reports';
import KPICard from '../../components/KPICard';
import ChartContainer from '../../components/ChartContainer';
import ExportButtons from '../../components/ExportButtons';

interface TrendsAnalysisProps {
  filters: ReportFilters;
}

function percentChange(prev: number, cur: number) {
  if (prev === 0) return cur === 0 ? 0 : 100;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

export default function TrendsAnalysis({ filters }: TrendsAnalysisProps) {
  const [data, setData] = useState<ExecutiveDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getExecutiveDashboard(filters);
        setData(result);
        setError(null);
      } catch (err) {
        console.error('Error fetching trends analysis:', err);
        setError('Error al cargar el reporte de tendencias');
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

  // Compute simple month-over-month trend from productionByMonth
  const months = data.charts.productionByMonth || [];
  const last = months[months.length - 1];
  const prev = months[months.length - 2];
  const monthChange = last && prev ? percentChange(prev.value, last.value) : 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Análisis de Tendencias</h2>
          <p className="text-gray-600 mt-1">Evolución de producción e ingresos a lo largo del tiempo</p>
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
            filename="trends-analysis"
            title="Análisis de Tendencias"
            onRefresh={() => setRefreshKey(prev => prev + 1)}
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <KPICard title="Producción Total" value={`${data.kpis.totalProduction.toLocaleString()} kg`} icon="📦" />
        <KPICard title="Ingresos Totales" value={`$${data.kpis.totalRevenue.toLocaleString()}`} icon="💰" />
        <KPICard title="Cambio último mes" value={`${monthChange.toFixed(1)}%`} icon={monthChange >= 0 ? '📈' : '📉'} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer title="Producción por Mes" data={data.charts.productionByMonth} type="line" dataKey="value" nameKey="name" />
        <ChartContainer title="Ingresos por Cliente (Top 10)" data={data.charts.revenueByClient} type="bar" dataKey="value" nameKey="name" />
      </div>
    </div>
  );
}