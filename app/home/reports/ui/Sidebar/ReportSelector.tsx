'use client';

import React from 'react';
import { ReportType } from '../../page';

interface ReportSelectorProps {
  selectedReport: ReportType;
  onReportChange: (report: ReportType) => void;
}

const reports = [
  {
    id: 'producer-productivity' as ReportType,
    name: 'Productividad por Productor',
    description: 'Análisis de rendimiento individual',
    icon: '👥',
  },
  {
    id: 'client-analysis' as ReportType,
    name: 'Análisis de Clientes',
    description: 'Segmentación y comportamiento',
    icon: '🛒',
  },
  {
    id: 'inventory-status' as ReportType,
    name: 'Estado del Inventario',
    description: 'Stock y disponibilidad',
    icon: '📦',
  },
  {
    id: 'trends-analysis' as ReportType,
    name: 'Análisis de Tendencias',
    description: 'Evolución histórica y proyecciones',
    icon: '📈',
  },
  {
    id: 'financial-reports' as ReportType,
    name: 'Reportes Financieros',
    description: 'Análisis económico y rentabilidad',
    icon: '💰',
  },
];

export default function ReportSelector({ selectedReport, onReportChange }: ReportSelectorProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-900 mb-3">Tipo de Reporte</h3>
      <div className="space-y-2">
        {reports.map((report) => (
          <button
            key={report.id}
            onClick={() => onReportChange(report.id)}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${
              selectedReport === report.id
                ? 'bg-blue-50 border-blue-200 text-blue-900'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-start space-x-3">
              <span className="text-lg">{report.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{report.name}</p>
                <p className="text-xs text-gray-500 mt-1">{report.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}