'use client';

import React, { useEffect, useState } from 'react';
import {
  ReportFilters,
  getSalesClients,
  SalesClientsData,
} from '../../../../../actions/reports';
import KPICard from '../../components/KPICard';
import ChartContainer from '../../components/ChartContainer';
import ExportButtons from '../../components/ExportButtons';

interface SalesClientsProps {
  filters: ReportFilters;
}

function formatClp(value: number) {
  return `$${Math.round(value).toLocaleString('es-CL')}`;
}

function formatKg(value: number) {
  return `${value.toLocaleString('es-CL', { maximumFractionDigits: 1 })} kg`;
}

export default function SalesClients({ filters }: SalesClientsProps) {
  const [data, setData] = useState<SalesClientsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getSalesClients(filters);
        setData(result);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Error al cargar ventas y clientes');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [filters, refreshKey]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 p-6">
        <div className="h-8 w-1/3 rounded bg-gray-200" />
        <div className="h-48 rounded bg-gray-200" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined mb-3 text-4xl text-amber-600">warning</span>
        <h3 className="text-lg font-medium text-gray-900">No se pudo cargar el reporte</h3>
        <p className="mt-1 text-gray-500">{error}</p>
      </div>
    );
  }

  const empty = data.summary.totalDispatches === 0;

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Ventas y clientes</h2>
          <p className="mt-1 text-gray-600">Ingresos y kg despachados a clientes</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            Actualizar
          </button>
          <ExportButtons
            data={data}
            filename="ventas-clientes"
            title="Ventas y clientes"
            onRefresh={() => setRefreshKey((k) => k + 1)}
          />
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard title="Ingresos" value={formatClp(data.summary.totalRevenue)} icon="payments" />
        <KPICard title="Despachos" value={String(data.summary.totalDispatches)} icon="local_shipping" />
        <KPICard title="Kg despachados" value={formatKg(data.summary.totalKg)} icon="scale" />
        <KPICard
          title="Ticket promedio"
          value={formatClp(data.summary.avgOrderValue)}
          icon="receipt"
        />
      </div>

      {empty ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <span className="material-symbols-outlined mb-3 text-4xl text-gray-400">local_shipping</span>
          <h3 className="text-lg font-medium text-gray-900">Sin despachos en el período</h3>
          <p className="mt-1 max-w-md text-sm text-gray-500">
            Cuando registres ventas a clientes, aquí verás ingresos, kg y ranking de clientes.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <ChartContainer
              title="Ingresos por mes"
              data={data.monthlyRevenue}
              type="line"
              dataKey="value"
              nameKey="name"
            />
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-4">
              <h3 className="text-lg font-medium text-gray-900">Clientes</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                      Despachos
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                      Kg
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                      Ingresos
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.byClient.map((c) => (
                    <tr key={c.clientId || c.clientName} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.clientName}</td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums">{c.totalOrders}</td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums">{formatKg(c.totalKg)}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium tabular-nums">
                        {formatClp(c.totalRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
