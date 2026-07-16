import { getAuditGridData } from '../../actions/audits';
import { AuditDataGrid } from './ui/AuditDataGrid';
import { Suspense } from 'react';
import DotProgress from '@/app/baseComponents/DotProgress/DotProgress';

export const dynamic = 'force-dynamic';

interface AuditPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function AuditLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-96">
      <DotProgress />
    </div>
  );
}

async function AuditContent({ params }: { params: Record<string, string | string[] | undefined> | undefined }) {
  const normalizedParams = params || {};
  const filters = {
    page: normalizedParams?.page
      ? parseInt(Array.isArray(normalizedParams.page) ? normalizedParams.page[0] : normalizedParams.page)
      : 1,
    limit: normalizedParams?.limit
      ? parseInt(Array.isArray(normalizedParams.limit) ? normalizedParams.limit[0] : normalizedParams.limit)
      : 25,
    search: Array.isArray(normalizedParams?.search) ? normalizedParams.search[0] : normalizedParams?.search,
    action: (Array.isArray(normalizedParams?.action) ? normalizedParams.action[0] : normalizedParams?.action) as '' | 'CREATE' | 'UPDATE' | 'DELETE' | undefined,
    entityName: Array.isArray(normalizedParams?.entityName)
      ? normalizedParams.entityName[0]
      : normalizedParams?.entityName,
    sortBy: Array.isArray(normalizedParams?.sortField) ? normalizedParams.sortField[0] : normalizedParams?.sortField || 'createdAt',
    sortOrder: (Array.isArray(normalizedParams?.sort) ? normalizedParams.sort[0] : normalizedParams?.sort) as 'asc' | 'desc' | undefined || 'desc',
    filters: Array.isArray(normalizedParams?.filters) ? normalizedParams.filters[0] : normalizedParams?.filters,
  };

  const auditData = await getAuditGridData(filters);

  return <AuditDataGrid {...auditData} filters={filters} />;
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const params = await searchParams;

  return (
    <div className="w-full space-y-6">
      <Suspense fallback={<AuditLoadingFallback />}>
        <AuditContent params={params} />
      </Suspense>
    </div>
  );
}
