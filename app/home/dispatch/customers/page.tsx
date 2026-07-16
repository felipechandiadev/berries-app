import { redirect } from 'next/navigation';
import CustomersGrid from './ui/CustomersGrid';
import { getCustomersGridData } from '@/app/actions/customers';

interface CustomersSearchParams {
  page?: string;
  limit?: string;
  sort?: string;
  sortField?: string;
  search?: string;
  filters?: string;
}

export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<CustomersSearchParams>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};

  const buildUrl = (params: Record<string, string>) => {
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) urlParams.set(key, value);
    });
    return `?${urlParams.toString()}`;
  };

  let gridProps:
    | {
        rows: Awaited<ReturnType<typeof getCustomersGridData>>['data'];
        totalRows: number;
        currentLimit: number;
        currentSort?: 'ASC' | 'DESC';
        currentSortField?: string;
        currentSearch?: string;
        currentFilters?: string;
      }
    | null = null;

  const pageParam = typeof resolvedParams.page === 'string' ? resolvedParams.page : undefined;
  const limitParam = typeof resolvedParams.limit === 'string' ? resolvedParams.limit : undefined;

  if (!pageParam || !limitParam) {
    const params: Record<string, string> = {};
    params.page = pageParam || '1';
    params.limit = limitParam || '25';
    if (resolvedParams.sort) params.sort = resolvedParams.sort;
    if (resolvedParams.sortField) params.sortField = resolvedParams.sortField;
    if (resolvedParams.search) params.search = resolvedParams.search;
    if (resolvedParams.filters) params.filters = resolvedParams.filters;
    redirect(`/home/dispatch/customers${buildUrl(params)}`);
  }

  const page = parseInt(pageParam!, 10) || 1;
  const limit = parseInt(limitParam!, 10) || 25;

  const sortOrderParam = typeof resolvedParams.sort === 'string' ? resolvedParams.sort.toUpperCase() : undefined;
  const sortOrder = sortOrderParam === 'ASC' || sortOrderParam === 'DESC' ? sortOrderParam : undefined;
  const sortField = typeof resolvedParams.sortField === 'string' && resolvedParams.sortField.trim()
    ? resolvedParams.sortField.trim()
    : undefined;
  const search = typeof resolvedParams.search === 'string' ? resolvedParams.search : undefined;
  const filters = typeof resolvedParams.filters === 'string' ? resolvedParams.filters : undefined;

  const listResult = await getCustomersGridData({
    page,
    limit,
    sortBy: sortField,
    sortOrder,
    search,
    filters,
  });

  gridProps = {
    rows: listResult.data,
    totalRows: listResult.total,
    currentLimit: listResult.limit,
    currentSort: sortOrder,
    currentSortField: sortField,
    currentSearch: search,
    currentFilters: filters,
  };

  return (
    <div className="space-y-6">
      {gridProps && (
        <CustomersGrid
          rows={gridProps.rows}
          totalRows={gridProps.totalRows}
          currentLimit={gridProps.currentLimit}
          currentSort={gridProps.currentSort}
          currentSortField={gridProps.currentSortField}
          currentSearch={gridProps.currentSearch}
          currentFilters={gridProps.currentFilters}
        />
      )}
    </div>
  );
}
