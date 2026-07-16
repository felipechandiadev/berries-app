'use client';

import React from 'react';
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
  const chipActive =
    'border-[color:var(--dash-ink,#1A1C18)] bg-[color:var(--dash-ink,#1A1C18)] text-white';
  const chipIdle =
    'border-gray-300 bg-white text-gray-700 hover:border-[color:var(--dash-accent,#5A8A00)]';

  return (
    <div className="flex h-full min-h-[70vh] bg-[color:var(--dash-bg,#F7F8F4)]">
      <div className="flex w-80 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-6">
          <h1 className="text-2xl font-semibold text-gray-900">Reportes</h1>
          <p className="mt-1 text-sm text-gray-600">Flujo operativo y económico de la temporada</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 p-6">
            <div>
              <h3 className="mb-3 text-sm font-medium text-gray-900">Filtros</h3>
              <label className="mb-2 block text-sm font-medium text-gray-700">Tipo de período</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onFiltersChange({ periodType: 'season' })}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    filters.periodType === 'season' ? chipActive : chipIdle
                  }`}
                >
                  Temporada
                </button>
                <button
                  type="button"
                  onClick={() => onFiltersChange({ periodType: 'custom' })}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    filters.periodType === 'custom' ? chipActive : chipIdle
                  }`}
                >
                  Rango personalizado
                </button>
              </div>

              <div className="mt-4">
                {filters.periodType === 'custom' ? (
                  <DateRangePicker
                    startDate={filters.startDate}
                    endDate={filters.endDate}
                    onChange={(start: Date | undefined, end: Date | undefined) =>
                      onFiltersChange({ startDate: start, endDate: end })
                    }
                  />
                ) : (
                  <SeasonSelector
                    selectedSeasonId={filters.seasonId}
                    onSeasonChange={(seasonId: string | undefined) =>
                      onFiltersChange({ seasonId })
                    }
                  />
                )}
              </div>
            </div>

            <ReportSelector selectedReport={selectedReport} onReportChange={onReportChange} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ReportPreview selectedReport={selectedReport} filters={filters} />
      </div>
    </div>
  );
}
