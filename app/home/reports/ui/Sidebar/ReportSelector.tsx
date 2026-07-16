'use client';

import React from 'react';
import { ReportType } from '../../page';

interface ReportSelectorProps {
  selectedReport: ReportType;
  onReportChange: (report: ReportType) => void;
}

const reports: Array<{
  id: ReportType;
  name: string;
  description: string;
  icon: string;
}> = [
  {
    id: 'season-operations',
    name: 'Temporada',
    description: 'Kg in / bodega / out y CLP pendiente',
    icon: 'calendar_month',
  },
  {
    id: 'producer-ledger',
    name: 'Productores',
    description: 'Kg, CLP, anticipos y saldo',
    icon: 'agriculture',
  },
  {
    id: 'warehouse-status',
    name: 'Bodega',
    description: 'Pallets, capacidad y bandejas',
    icon: 'warehouse',
  },
  {
    id: 'settlements-advances',
    name: 'Anticipos y liquidaciones',
    description: 'Deuda y pagos a productores',
    icon: 'account_balance_wallet',
  },
  {
    id: 'sales-clients',
    name: 'Ventas y clientes',
    description: 'Despachos e ingresos',
    icon: 'local_shipping',
  },
];

export default function ReportSelector({ selectedReport, onReportChange }: ReportSelectorProps) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-gray-900">Tipo de reporte</h3>
      <div className="space-y-2">
        {reports.map((report) => {
          const active = selectedReport === report.id;
          return (
            <button
              key={report.id}
              type="button"
              onClick={() => onReportChange(report.id)}
              className={`w-full rounded-xl border p-3 text-left transition-colors ${
                active
                  ? 'border-[color:var(--dash-accent,#5A8A00)] bg-[color:var(--dash-soft,#F0F2EA)] text-gray-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`material-symbols-outlined mt-0.5 ${
                    active ? 'text-[color:var(--dash-accent,#5A8A00)]' : 'text-gray-500'
                  }`}
                  aria-hidden
                >
                  {report.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{report.name}</p>
                  <p className="mt-1 text-xs text-gray-500">{report.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
