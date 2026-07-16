import ListTrays from './ui/ListTrays';
import { getTrays } from '@/app/actions/trays';
import { getTrayTransactions } from '@/app/actions/transactions';
import { Suspense } from 'react';
import DotProgress from '../../../baseComponents/DotProgress/DotProgress';
import TrayMovementsDataGrid from './ui/TrayMovementsDataGrid';

export const dynamic = 'force-dynamic';

interface TraysSearchParams {
  search?: string;
  tab?: string;
}

async function TraysContent({ search }: { search: string }) {
  const result = await getTrays(search ? { name: search } : undefined);
  const trays = Array.isArray(result.data) ? result.data : [];
  // Convert to plain objects to avoid Server->Client serialization error
  const plainTrays = JSON.parse(JSON.stringify(trays));
  return <ListTrays trays={plainTrays} />;
}

async function TrayMovementsContent({ searchParams }: { searchParams: any }) {
  const page = Number(searchParams?.page) || 1;
  const limit = Number(searchParams?.limit) || 25;
  const sort = searchParams?.sort as 'asc' | 'desc' | undefined;
  const sortField = searchParams?.sortField;
  const search = searchParams?.search || '';
  const filters = searchParams?.filters || '';

  const result = await getTrayTransactions({
    page,
    limit,
    sort,
    sortField,
    search,
    filters,
  });
  
  const transactions = Array.isArray(result.data) ? result.data : [];
  const total = result.total || 0;
  
  // Convert to plain objects
  const plainTransactions = JSON.parse(JSON.stringify(transactions));
  
  return (
    <TrayMovementsDataGrid 
      data={plainTransactions} 
      totalRows={total}
      page={page}
      limit={limit}
      sort={sort}
      sortField={sortField}
      search={search}
      filters={filters}
    />
  );
}

export default async function Page(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  // FIXED: Properly await searchParams to avoid race conditions in Electron production builds
  const searchParams = await props.searchParams;
  const search = (typeof searchParams?.search === 'string' ? searchParams.search : '') || '';
  const tab = searchParams?.tab === 'movements' ? 'movements' : 'types';

  const buildUrl = (newTab: string) => {
    const urlParams = new URLSearchParams();
    if (search) urlParams.set('search', search);
    urlParams.set('tab', newTab);
    return `?${urlParams.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8">
          <a
            href={buildUrl('types')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              tab === 'types'
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary hover:text-accent'
            }`}
          >
            Tipos de bandejas
          </a>
          <a
            href={buildUrl('movements')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              tab === 'movements'
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary hover:text-accent'
            }`}
          >
            Transacciones
          </a>
        </nav>
      </div>

      {tab === 'types' && (
        <Suspense fallback={<div className="flex items-center justify-center h-96">
          <DotProgress />
        </div>}>
          <TraysContent search={search} />
        </Suspense>
      )}

      {tab === 'movements' && (
        <Suspense fallback={<div className="flex items-center justify-center h-96">
          <DotProgress />
        </div>}>
          <TrayMovementsContent searchParams={searchParams} />
        </Suspense>
      )}
    </div>
  );
}
