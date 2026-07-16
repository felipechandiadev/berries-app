'use client';

import React, { useEffect, useState } from 'react';
import {
  ReportFilters,
  getWarehouseStatus,
  WarehouseStatusData,
} from '../../../../../actions/reports';
import KPICard from '../../components/KPICard';
import ExportButtons from '../../components/ExportButtons';

interface WarehouseStatusProps {
  filters: ReportFilters;
}

export default function WarehouseStatus({ filters }: WarehouseStatusProps) {
  const [data, setData] = useState<WarehouseStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getWarehouseStatus(filters);
        setData(result);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Error al cargar el estado de bodega');
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

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Bodega</h2>
          <p className="mt-1 text-gray-600">Snapshot actual de pallets, capacidad y stock de bandejas</p>
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
            filename="bodega-estado"
            title="Bodega — Estado"
            onRefresh={() => setRefreshKey((k) => k + 1)}
          />
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard title="Pallets" value={String(data.summary.totalPallets)} icon="inventory_2" />
        <KPICard title="Con stock" value={String(data.summary.occupiedPallets)} icon="inventory_2" />
        <KPICard
          title="Bandejas en pallets"
          value={data.summary.totalTrays.toLocaleString('es-CL')}
          icon="grid_view"
        />
        <KPICard
          title="Utilización"
          value={`${data.summary.utilizationRate}%`}
          icon="donut_large"
          subtitle={`${data.summary.totalTrays}/${data.summary.totalCapacity}`}
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-lg font-medium text-gray-900">Por almacén</h3>
          {data.byStorage.length === 0 ? (
            <p className="text-sm text-gray-500">Sin almacenes</p>
          ) : (
            <ul className="space-y-4">
              {data.byStorage.map((s) => (
                <li key={s.storageId}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-gray-900">
                      {s.storageName}
                      <span className="font-normal text-gray-500"> · {s.palletCount} pallets</span>
                    </span>
                    <span className="tabular-nums text-gray-600">
                      {s.traysQuantity}/{s.capacity}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${
                        s.fillPercent >= 80 ? 'bg-amber-600' : 'bg-[color:var(--dash-accent,#5A8A00)]'
                      }`}
                      style={{ width: `${Math.min(100, s.fillPercent)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-lg font-medium text-gray-900">Stock de bandejas</h3>
          <ul className="divide-y divide-gray-100">
            {data.trays.map((tray) => (
              <li key={tray.id} className="flex justify-between py-3 text-sm">
                <span className="text-gray-900">{tray.name}</span>
                <span className="tabular-nums font-medium">{tray.stock}</span>
              </li>
            ))}
            {data.trays.length === 0 && (
              <li className="py-3 text-sm text-gray-500">Sin bandejas</li>
            )}
          </ul>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h3 className="text-lg font-medium text-gray-900">Pallets</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Almacén</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Variedad</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Fill</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.pallets.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900">#{p.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{p.storageName}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{p.varietyName || '—'}</td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-900">
                    {p.traysQuantity}/{p.capacity} ({p.fillPercent}%)
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
