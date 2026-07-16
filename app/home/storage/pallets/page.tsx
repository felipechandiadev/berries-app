import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getPalletsGridData } from '@/app/actions/pallets';
import PalletsGrid from './ui/PalletsGrid';
import DotProgress from '@/app/baseComponents/DotProgress/DotProgress';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams?: Promise<{
    fields?: string;
    sort?: 'asc' | 'desc' | 'ASC' | 'DESC';
    sortField?: string;
    search?: string;
    filtration?: string;
    filters?: string;
    page?: string;
    limit?: string;
  }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : undefined;

  const needsRedirect = !params?.page || !params?.limit;
  if (needsRedirect) {
    const query = new URLSearchParams();
    if (params?.sort) query.set('sort', params.sort);
    if (params?.sortField) query.set('sortField', params.sortField);
    if (params?.search) query.set('search', params.search);
    if (params?.filtration) query.set('filtration', params.filtration);
    if (params?.filters) query.set('filters', params.filters);
    if (params?.fields) query.set('fields', params.fields);
    query.set('page', params?.page || '1');
    query.set('limit', params?.limit || '25');
    redirect(`/home/storage/pallets?${query.toString()}`);
  }

  const sort = (params?.sort === 'asc' || params?.sort === 'ASC')
    ? 'ASC'
    : (params?.sort === 'desc' || params?.sort === 'DESC')
      ? 'DESC'
      : undefined;
  const sortField = typeof params?.sortField === 'string' && params.sortField.trim() ? params.sortField : undefined;
  const search = typeof params?.search === 'string' ? params.search : '';
  const filtration = params?.filtration === 'true';
  const filters = typeof params?.filters === 'string' ? params.filters : '';
  const fields = typeof params?.fields === 'string' && params.fields.trim()
    ? params.fields
    : 'id,storageName,trayName,traysQuantity,capacity,weight,packsNetWeight,dispatchWeight,status,createdAt,updatedAt';

  const pageParam = typeof params?.page === 'string' ? params.page : '1';
  const limitParam = typeof params?.limit === 'string' ? params.limit : '25';
  const page = parseInt(pageParam, 10) || 1;
  const limit = parseInt(limitParam, 10) || 25;

  const result = await getPalletsGridData({
    fields,
    sortOrder: sort,
    sortBy: sortField,
    search,
    filtration,
    filters,
    page,
    limit,
  });

  const initialData = result.data;
  const totalRows = result.total;
  const currentPage = result.currentPage ?? page;

  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[400px]"><DotProgress /></div>}>
      <div className="space-y-6">
        <PalletsGrid
          initialData={initialData}
          totalRows={totalRows}
          currentPage={currentPage}
          currentLimit={limit}
          currentSort={sort}
          currentSortField={sortField}
          currentSearch={search}
          currentFilters={filters}
        />
      </div>
    </Suspense>
  );
}
