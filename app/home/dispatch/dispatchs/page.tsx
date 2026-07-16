import { redirect } from 'next/navigation';
import NewDispatchForm from './ui/NewDispatchForm/NewDispatchForm';
import DispatchesGrid from './ui/DispatchesGrid';
import { getDispatchesGridData } from '@/app/actions/dispatches';

interface DispatchsSearchParams {
  tab?: string;
  page?: string;
  limit?: string;
  sort?: string;
  sortField?: string;
  search?: string;
  filters?: string;
  filtration?: string;
  from?: string;
  to?: string;
}

export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<DispatchsSearchParams>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const currentTab = resolvedParams?.tab === 'new' ? 'new' : 'list';

  const buildTabUrl = (nextTab: string) => {
    const params = new URLSearchParams();
    params.set('tab', nextTab);

    if (nextTab === 'list') {
      const pageValue = typeof resolvedParams.page === 'string' && resolvedParams.page ? resolvedParams.page : '1';
      const limitValue = typeof resolvedParams.limit === 'string' && resolvedParams.limit ? resolvedParams.limit : '25';

      params.set('page', pageValue);
      params.set('limit', limitValue);

      if (resolvedParams.sort) params.set('sort', resolvedParams.sort);
      if (resolvedParams.sortField) params.set('sortField', resolvedParams.sortField);
      if (resolvedParams.search) params.set('search', resolvedParams.search);
      if (resolvedParams.filters) params.set('filters', resolvedParams.filters);
      if (resolvedParams.filtration) params.set('filtration', resolvedParams.filtration);
      if (resolvedParams.from) params.set('from', resolvedParams.from);
      if (resolvedParams.to) params.set('to', resolvedParams.to);
    }

    return `?${params.toString()}`;
  };

  let gridProps:
    | {
        rows: Awaited<ReturnType<typeof getDispatchesGridData>>['data'];
        totalRows: number;
        currentLimit: number;
        currentSort?: 'ASC' | 'DESC';
        currentSortField?: string;
        currentSearch?: string;
        currentFilters?: string;
      }
    | null = null;

  if (currentTab === 'list') {
    const pageParam = typeof resolvedParams.page === 'string' ? resolvedParams.page : undefined;
    const limitParam = typeof resolvedParams.limit === 'string' ? resolvedParams.limit : undefined;

    if (!pageParam || !limitParam) {
      const params = new URLSearchParams();
      params.set('tab', 'list');
      params.set('page', pageParam || '1');
      params.set('limit', limitParam || '25');
      if (resolvedParams.sort) params.set('sort', resolvedParams.sort);
      if (resolvedParams.sortField) params.set('sortField', resolvedParams.sortField);
      if (resolvedParams.search) params.set('search', resolvedParams.search);
      if (resolvedParams.filters) params.set('filters', resolvedParams.filters);
      if (resolvedParams.filtration) params.set('filtration', resolvedParams.filtration);
      if (resolvedParams.from) params.set('from', resolvedParams.from);
      if (resolvedParams.to) params.set('to', resolvedParams.to);
      redirect(`/home/dispatch/dispatchs?${params.toString()}`);
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
    const filtration = resolvedParams.filtration === 'true';
    const dateFrom = typeof resolvedParams.from === 'string' ? resolvedParams.from : undefined;
    const dateTo = typeof resolvedParams.to === 'string' ? resolvedParams.to : undefined;

    const listResult = await getDispatchesGridData({
      page,
      limit,
      sortBy: sortField,
      sortOrder,
      search,
      filters,
      filtration,
      dateFrom,
      dateTo,
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
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8">
          <a
            href={buildTabUrl('list')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              currentTab === 'list'
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary hover:text-accent'
            }`}
          >
            Despachos
          </a>
          <a
            href={buildTabUrl('new')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              currentTab === 'new'
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary hover:text-accent'
            }`}
          >
            Nuevo Despacho
          </a>
        </nav>
      </div>

      {currentTab === 'list' && gridProps && (
        <div className="space-y-4">
          <DispatchesGrid
            rows={gridProps.rows}
            totalRows={gridProps.totalRows}
            currentLimit={gridProps.currentLimit}
            currentSort={gridProps.currentSort}
            currentSortField={gridProps.currentSortField}
            currentSearch={gridProps.currentSearch}
            currentFilters={gridProps.currentFilters}
          />
        </div>
      )}

      {currentTab === 'new' && (
        <div className="space-y-8">
          <NewDispatchForm />
        </div>
      )}
    </div>
  );
}
