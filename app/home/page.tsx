import React, { Suspense } from 'react';
import { getDashboardStats, type DashboardRange } from '../actions/dashboard';
import OperationsDashboard from './ui/OperationsDashboard';

export const dynamic = 'force-dynamic';

function parseRange(value: string | string[] | undefined): DashboardRange {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'today' || raw === '7d' || raw === 'season') {
    return raw;
  }
  return 'season';
}

function DashboardFallback() {
  return (
    <div className="dash-root animate-pulse space-y-8" data-test-id="home-dashboard-loading">
      <div className="h-10 w-64 rounded bg-[color:var(--dash-track)]" />
      <div className="h-24 rounded bg-[color:var(--dash-track)]" />
      <div className="grid gap-6 xl:grid-cols-12">
        <div className="h-80 rounded bg-[color:var(--dash-track)] xl:col-span-7" />
        <div className="h-80 rounded bg-[color:var(--dash-track)] xl:col-span-5" />
      </div>
    </div>
  );
}

async function DashboardContent({ range }: { range: DashboardRange }) {
  try {
    const data = await getDashboardStats(range);
    return <OperationsDashboard data={data} />;
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    return (
      <div className="dash-root" data-test-id="home-dashboard">
        <p className="text-[color:var(--dash-muted)]">No se pudo cargar el dashboard.</p>
      </div>
    );
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range = parseRange(params.range);

  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardContent range={range} />
    </Suspense>
  );
}
