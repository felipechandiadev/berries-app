'use client';

import React from 'react';
import { ReportType } from '../../page';
import { ReportFilters } from '../../../../actions/reports';
import SeasonOperations from './ReportViews/SeasonOperations';
import ProducerLedger from './ReportViews/ProducerLedger';
import WarehouseStatus from './ReportViews/WarehouseStatus';
import SettlementsAdvances from './ReportViews/SettlementsAdvances';
import SalesClients from './ReportViews/SalesClients';

interface ReportPreviewProps {
  selectedReport: ReportType;
  filters: ReportFilters;
}

export default function ReportPreview({ selectedReport, filters }: ReportPreviewProps) {
  const renderReport = () => {
    switch (selectedReport) {
      case 'season-operations':
        return <SeasonOperations filters={filters} />;
      case 'producer-ledger':
        return <ProducerLedger filters={filters} />;
      case 'warehouse-status':
        return <WarehouseStatus filters={filters} />;
      case 'settlements-advances':
        return <SettlementsAdvances filters={filters} />;
      case 'sales-clients':
        return <SalesClients filters={filters} />;
      default:
        return (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <span className="material-symbols-outlined mb-3 text-5xl text-gray-400">
                analytics
              </span>
              <h3 className="text-lg font-medium text-gray-900">Reporte no disponible</h3>
              <p className="mt-1 text-gray-500">Selecciona un reporte del menú lateral.</p>
            </div>
          </div>
        );
    }
  };

  return <div className="h-full overflow-y-auto bg-white">{renderReport()}</div>;
}
