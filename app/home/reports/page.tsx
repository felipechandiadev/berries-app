'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ReportsLayout from './ui/ReportsLayout';
import { ReportFilters } from '../../actions/reports';

export type ReportType =
  | 'producer-productivity'
  | 'client-analysis'
  | 'inventory-status'
  | 'trends-analysis'
  | 'financial-reports';

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get initial values from URL
  const [selectedReport, setSelectedReport] = useState<ReportType>(
    (searchParams?.get('tab') as ReportType) || 'producer-productivity'
  );
  const [filters, setFilters] = useState<ReportFilters>({
    periodType: (searchParams?.get('period') as 'custom' | 'season') || 'custom',
    startDate: searchParams?.get('start') ? new Date(searchParams.get('start')!) : undefined,
    endDate: searchParams?.get('end') ? new Date(searchParams.get('end')!) : undefined,
    seasonId: searchParams?.get('seasonId') || undefined,
    productiveUnitId: searchParams?.get('unitId') || undefined,
  });

  // Update URL when filters change
  const updateUrl = (newFilters: Partial<ReportFilters>, newReport?: ReportType) => {
    const params = new URLSearchParams();

    if (newReport || selectedReport) {
      params.set('tab', newReport || selectedReport);
    }

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

  return (
    <ReportsLayout
      selectedReport={selectedReport}
      filters={filters}
      onReportChange={handleReportChange}
      onFiltersChange={handleFiltersChange}
    />
  );
}
