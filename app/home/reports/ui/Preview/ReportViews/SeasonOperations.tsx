'use client';

import React, { useEffect, useState } from 'react';
import {
  ReportFilters,
  getSeasonOperations,
  SeasonOperationsData,
} from '../../../../../actions/reports';
import KPICard from '../../components/KPICard';
import ChartContainer from '../../components/ChartContainer';
import ExportButtons from '../../components/ExportButtons';

interface SeasonOperationsProps {
  filters: ReportFilters;
}

function formatKg(value: number) {
  return `${value.toLocaleString('es-CL', { maximumFractionDigits: 1 })} kg`;
}

function formatClp(value: number) {
  return `$${Math.round(value).toLocaleString('es-CL')}`;
}

export default function SeasonOperations({ filters }: SeasonOperationsProps) {
  const [data, setData] = useState<SeasonOperationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getSeasonOperations(filters);
        setData(result);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Error al cargar el reporte de temporada');
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded bg-gray-200" />
          ))}
        </div>
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

  const fill =
    data.kpis.warehouseCapacity > 0
      ? Math.round((data.kpis.warehouseTrays / data.kpis.warehouseCapacity) * 100)
      : 0;

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Temporada</h2>
          <p className="mt-1 text-gray-600">
            {data.range.seasonName || 'Período seleccionado'} · flujo de fruta y saldo por liquidar
          </p>
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
            filename="temporada-operaciones"
            title="Temporada — Operaciones"
            onRefresh={() => setRefreshKey((k) => k + 1)}
          />
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard title="Kg recepcionados" value={formatKg(data.kpis.receptionKg)} icon="download" />
        <KPICard
          title="Bandejas en bodega"
          value={data.kpis.warehouseTrays.toLocaleString('es-CL')}
          icon="warehouse"
          subtitle={`${fill}% de ${data.kpis.warehouseCapacity} capacidad`}
        />
        <KPICard title="Kg despachados" value={formatKg(data.kpis.dispatchKg)} icon="upload" />
        <KPICard
          title="Por liquidar"
          value={formatClp(data.kpis.pendingSettlementClp)}
          icon="payments"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartContainer
          title="Kg recepcionados por mes"
          data={data.byMonth.map((m) => ({ name: m.name, value: m.receptions }))}
          type="line"
          dataKey="value"
          nameKey="name"
        />
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-lg font-medium text-gray-900">Despacho por mes</h3>
          {data.byMonth.every((m) => m.dispatches === 0) ? (
            <p className="text-sm text-gray-500">Sin despachos en el período</p>
          ) : (
            <ul className="space-y-2">
              {data.byMonth.map((m) => (
                <li key={m.name} className="flex justify-between text-sm">
                  <span className="text-gray-600">{m.name}</span>
                  <span className="tabular-nums font-medium">{formatKg(m.dispatches)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-lg font-medium text-gray-900">Mix por variedad</h3>
        {data.byVariety.length === 0 ? (
          <p className="text-sm text-gray-500">Sin recepciones en el período</p>
        ) : (
          <ul className="space-y-3">
            {data.byVariety.map((item) => {
              const max = Math.max(...data.byVariety.map((v) => v.value), 1);
              const width = Math.max(4, (item.value / max) * 100);
              return (
                <li key={item.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-gray-900">{item.name}</span>
                    <span className="text-gray-500">{formatKg(item.value)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-[color:var(--dash-accent,#5A8A00)]"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
