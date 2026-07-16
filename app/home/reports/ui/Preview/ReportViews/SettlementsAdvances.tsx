'use client';

import React, { useEffect, useState } from 'react';
import {
  ReportFilters,
  getSettlementsAdvances,
  SettlementsAdvancesData,
} from '../../../../../actions/reports';
import KPICard from '../../components/KPICard';
import ExportButtons from '../../components/ExportButtons';

interface SettlementsAdvancesProps {
  filters: ReportFilters;
}

function formatClp(value: number) {
  return `$${Math.round(value).toLocaleString('es-CL')}`;
}

export default function SettlementsAdvances({ filters }: SettlementsAdvancesProps) {
  const [data, setData] = useState<SettlementsAdvancesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getSettlementsAdvances(filters);
        setData(result);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Error al cargar anticipos y liquidaciones');
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
          <h2 className="text-2xl font-semibold text-gray-900">Anticipos y liquidaciones</h2>
          <p className="mt-1 text-gray-600">Deuda con productores, anticipos y lo ya liquidado</p>
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
            filename="anticipos-liquidaciones"
            title="Anticipos y liquidaciones"
            onRefresh={() => setRefreshKey((k) => k + 1)}
          />
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard
          title="Anticipos emitidos"
          value={formatClp(data.summary.totalAdvancesClp)}
          icon="account_balance_wallet"
        />
        <KPICard
          title="Anticipos pendientes"
          value={formatClp(data.summary.pendingAdvancesClp)}
          icon="pending"
        />
        <KPICard
          title="Recepciones por liquidar"
          value={formatClp(data.summary.pendingReceptionsClp)}
          icon="receipt_long"
        />
        <KPICard
          title="Recepciones liquidadas"
          value={formatClp(data.summary.settledReceptionsClp)}
          icon="task_alt"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h3 className="text-lg font-medium text-gray-900">Por productor</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Productor
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                  Anticipos pendientes
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                  Recepciones pendientes
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.byProducer.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                    Sin movimientos económicos en el período
                  </td>
                </tr>
              ) : (
                data.byProducer.map((row) => (
                  <tr key={row.producerId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.producerName}</td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-900">
                      {formatClp(row.advancesClp)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-900">
                      {formatClp(row.pendingReceptionsClp)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium tabular-nums text-gray-900">
                      {formatClp(row.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
