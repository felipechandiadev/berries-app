'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ReportsLayout from './ui/ReportsLayout';
import { ReportFilters } from '../../actions/reports';
import { getSeasonsSimpleList } from '../../actions/seasons';

export type ReportType =
  | 'season-operations'
  | 'producer-ledger'
  | 'warehouse-status'
  | 'settlements-advances'
  | 'sales-clients';

const VALID_REPORTS: ReportType[] = [
  'season-operations',
  'producer-ledger',
  'warehouse-status',
  'settlements-advances',
  'sales-clients',
];

function parseReport(value: string | null): ReportType {
  if (value && VALID_REPORTS.includes(value as ReportType)) {
    return value as ReportType;
  }
  return 'season-operations';
}

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedReport, setSelectedReport] = useState<ReportType>(
    parseReport(searchParams?.get('tab'))
  );
  const [filters, setFilters] = useState<ReportFilters>({
    periodType: (searchParams?.get('period') as 'custom' | 'season') || 'season',
    startDate: searchParams?.get('start') ? new Date(searchParams.get('start')!) : undefined,
    endDate: searchParams?.get('end') ? new Date(searchParams.get('end')!) : undefined,
    seasonId: searchParams?.get('seasonId') || undefined,
    productiveUnitId: searchParams?.get('unitId') || undefined,
  });
  const [seasonReady, setSeasonReady] = useState(Boolean(searchParams?.get('seasonId')));

  useEffect(() => {
    if (filters.periodType !== 'season' || filters.seasonId) {
      setSeasonReady(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const result = await getSeasonsSimpleList();
        const seasons = result.data || [];
        const active = seasons.find((s: { active?: boolean }) => s.active) || seasons[0];
        if (!cancelled && active?.id) {
          setFilters((prev) => ({ ...prev, seasonId: active.id, periodType: 'season' }));
        }
      } catch (error) {
        console.error('Error loading active season for reports:', error);
      } finally {
        if (!cancelled) setSeasonReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filters.periodType, filters.seasonId]);

  const updateUrl = (newFilters: Partial<ReportFilters>, newReport?: ReportType) => {
    const params = new URLSearchParams();
    const report = newReport || selectedReport;
    params.set('tab', report);

    const currentFilters = { ...filters, ...newFilters };

    if (currentFilters.periodType) {
      params.set('period', currentFilters.periodType);
    }
    if (currentFilters.startDate) {
      params.set('start', currentFilters.startDate.toISOString().split('T')[0]);
    }
    if (currentFilters.endDate) {
      params.set('end', currentFilters.endDate.toISOString().split('T')[0]);
    }
    if (currentFilters.seasonId) {
      params.set('seasonId', currentFilters.seasonId);
    }
    if (currentFilters.productiveUnitId) {
      params.set('unitId', currentFilters.productiveUnitId);
    }

    router.replace(`/home/reports?${params.toString()}`, { scroll: false });
  };

  const handleReportChange = (report: ReportType) => {
    setSelectedReport(report);
    updateUrl({}, report);
  };

  const handleFiltersChange = (newFilters: Partial<ReportFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    updateUrl(newFilters);
  };

  if (!seasonReady && filters.periodType === 'season' && !filters.seasonId) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-500">
        Cargando temporada activa…
      </div>
    );
  }

  return (
    <ReportsLayout
      selectedReport={selectedReport}
      filters={filters}
      onReportChange={handleReportChange}
      onFiltersChange={handleFiltersChange}
    />
  );
}
