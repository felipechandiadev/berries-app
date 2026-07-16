'use client';

import React, { useState, useEffect } from 'react';
import { ReportType } from '../../page';
import { ReportFilters } from '../../../../actions/reports';
import ProducerProductivity from './ReportViews/ProducerProductivity';
import ClientAnalysis from './ReportViews/ClientAnalysis';
import InventoryStatus from './ReportViews/InventoryStatus';
import TrendsAnalysis from './ReportViews/TrendsAnalysis';
import FinancialReports from './ReportViews/FinancialReports';

interface ReportPreviewProps {
  selectedReport: ReportType;
  filters: ReportFilters;
}

export default function ReportPreview({ selectedReport, filters }: ReportPreviewProps) {
  const renderReport = () => {
    switch (selectedReport) {
      case 'producer-productivity':
        return <ProducerProductivity filters={filters} />;
      case 'client-analysis':
        return <ClientAnalysis filters={filters} />;
      case 'inventory-status':
        return <InventoryStatus filters={filters} />;
      case 'trends-analysis':
        return <TrendsAnalysis filters={filters} />;
      case 'financial-reports':
        return <FinancialReports filters={filters} />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Reporte no disponible
              </h3>
              <p className="text-gray-500">
                Este reporte aún no ha sido implementado.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-white">
      {renderReport()}
    </div>
  );
}