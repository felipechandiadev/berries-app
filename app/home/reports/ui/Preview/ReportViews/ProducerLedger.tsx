'use client';

import React, { useEffect, useState } from 'react';
import {
  ReportFilters,
  getProducerLedger,
  ProducerLedgerData,
} from '../../../../../actions/reports';
import KPICard from '../../components/KPICard';
import ExportButtons from '../../components/ExportButtons';

interface ProducerLedgerProps {
  filters: ReportFilters;
}

function formatKg(value: number) {
  return `${value.toLocaleString('es-CL', { maximumFractionDigits: 1 })} kg`;
}

function formatClp(value: number) {
  return `$${Math.round(value).toLocaleString('es-CL')}`;
}

export default function ProducerLedger({ filters }: ProducerLedgerProps) {
  const [data, setData] = useState<ProducerLedgerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getProducerLedger(filters);
        setData(result);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Error al cargar el reporte de productores');
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
          <h2 className="text-2xl font-semibold text-gray-900">Productores</h2>
          <p className="mt-1 text-gray-600">Kg, CLP a pagar, anticipos y saldo por productor</p>
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
            filename="productores-ledger"
            title="Productores — Ledger"
            onRefresh={() => setRefreshKey((k) => k + 1)}
          />
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard title="Productores activos" value={String(data.summary.totalProducers)} icon="agriculture" />
        <KPICard title="Kg totales" value={formatKg(data.summary.totalKg)} icon="scale" />
        <KPICard title="CLP recepciones" value={formatClp(data.summary.totalClp)} icon="payments" />
        <KPICard title="Top productor" value={data.summary.topProducer} icon="military_tech" />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Productor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Unidad
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Recepciones
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Kg
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  CLP recepción
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Anticipos
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.producers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    Sin productores con recepciones en el período
                  </td>
                </tr>
              ) : (
                data.producers.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {p.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {p.productiveUnitName || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums text-gray-900">
                      {p.receptionCount}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums text-gray-900">
                      {formatKg(p.totalKg)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums text-gray-900">
                      {formatClp(p.receptionClp)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums text-gray-900">
                      {formatClp(p.advancesClp)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium tabular-nums text-gray-900">
                      {formatClp(p.balance)}
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
