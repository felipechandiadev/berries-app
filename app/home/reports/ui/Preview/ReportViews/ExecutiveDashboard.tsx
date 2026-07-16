'use client';

import React, { useState, useEffect } from 'react';
import { ReportFilters, getExecutiveDashboard, ExecutiveDashboardData } from '../../../../../actions/reports';
import KPICard from '../../components/KPICard';
import ChartContainer from '../../components/ChartContainer';
import ExportButtons from '../../components/ExportButtons';
import { LoadingSpinner, ErrorMessage } from '../../components/LoadingStates';

interface ExecutiveDashboardProps {
  filters: ReportFilters;
}

export default function ExecutiveDashboard({ filters }: ExecutiveDashboardProps) {
  const [data, setData] = useState<ExecutiveDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getExecutiveDashboard(filters);
        setData(result);
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        console.error('Error fetching executive dashboard:', err);
        setError('Error al cargar los datos del dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters, refreshKey]);

  if (loading) {
    return <LoadingSpinner message="Cargando dashboard ejecutivo..." />;
  }

  if (error || !data) {
    return (
      <ErrorMessage
        message={error || 'No se pudieron cargar los datos'}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Ejecutivo</h2>
          <p className="text-gray-600 mt-1">
            Visión general del rendimiento del negocio
          </p>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-1">
              Última actualización: {lastUpdated.toLocaleString('es-ES')}
            </p>
          )}
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
            filename="dashboard-ejecutivo"
            title="Dashboard Ejecutivo"
            onRefresh={() => setRefreshKey(prev => prev + 1)}
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Producción Total"
          value={`${data.kpis.totalProduction.toLocaleString()} kg`}
          icon="📦"
          trend={5.2}
        />
        <KPICard
          title="Ingresos Totales"
          value={`$${data.kpis.totalRevenue.toLocaleString()}`}
          icon="💰"
          trend={8.1}
        />
        <KPICard
          title="Productores Activos"
          value={data.kpis.activeProducers.toString()}
          icon="👥"
          trend={-2.3}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Producción por Mes"
          data={data.charts.productionByMonth}
          type="line"
          dataKey="value"
          nameKey="name"
        />

        <ChartContainer
          title="Ingresos por Cliente"
          data={data.charts.revenueByClient.slice(0, 10)}
          type="bar"
          dataKey="value"
          nameKey="name"
        />
      </div>
    </div>
  );
}