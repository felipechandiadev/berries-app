'use client';

import React, { useState, useEffect } from 'react';
import ReportSelector from './Sidebar/ReportSelector';
import DateRangePicker from './Sidebar/DateRangePicker';
import SeasonSelector from './Sidebar/SeasonSelector';
import ReportPreview from './Preview/ReportPreview';
import { ReportType } from '../page';
import { ReportFilters } from '../../../actions/reports';

interface ReportsLayoutProps {
  selectedReport: ReportType;
  filters: ReportFilters;
  onReportChange: (report: ReportType) => void;
  onFiltersChange: (filters: Partial<ReportFilters>) => void;
}

export default function ReportsLayout({
  selectedReport,
  filters,
  onReportChange,
  onFiltersChange,
}: ReportsLayoutProps) {
  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-600 mt-1">
            Análisis y métricas del negocio
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Period Type Selector */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Filtros</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de período
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onFiltersChange({ periodType: 'custom' })}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      filters.periodType === 'custom'
                        ? 'bg-blue-100 text-blue-700 border-blue-300'
                        : 'bg-white text-gray-700 border-gray-300'
                    } border`}
                  >
                    Período personalizado
                  </button>
                  <button
                    onClick={() => onFiltersChange({ periodType: 'season' })}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      filters.periodType === 'season'
                        ? 'bg-blue-100 text-blue-700 border-blue-300'
                        : 'bg-white text-gray-700 border-gray-300'
                    } border`}
                  >
                    Temporada específica
                  </button>
                </div>
              </div>

              {/* Date/Season Pickers */}
              {filters.periodType === 'custom' ? (
                <DateRangePicker
                  startDate={filters.startDate}
                  endDate={filters.endDate}
                  onChange={(start: Date | undefined, end: Date | undefined) => onFiltersChange({ startDate: start, endDate: end })}
                />
              ) : (
                <SeasonSelector
                  selectedSeasonId={filters.seasonId}
                  onSeasonChange={(seasonId: string | undefined) => onFiltersChange({ seasonId })}
                />
              )}
            </div>

            {/* Report Selector */}
            <ReportSelector
              selectedReport={selectedReport}
              onReportChange={onReportChange}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ReportPreview
          selectedReport={selectedReport}
          filters={filters}
        />
      </div>
    </div>
  );
}