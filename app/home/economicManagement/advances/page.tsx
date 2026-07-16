import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import {
  listAdvances,
  type ListAdvancesFilters,
  type AdvancePaymentMethod,
  type AdvanceStatus,
} from '@/app/actions/advances';
import DotProgress from '@/app/baseComponents/DotProgress/DotProgress';
import AdvancesGrid from './ui/AdvancesGrid';

export const dynamic = 'force-dynamic';

interface PageSearchParams {
  fields?: string;
  sort?: 'asc' | 'desc' | 'ASC' | 'DESC';
  sortField?: string;
  search?: string;
  filtration?: string;
  filters?: string;
  page?: string;
  limit?: string;
  seasonId?: string;
  producerId?: string;
  paymentMethod?: string;
  status?: string;
  from?: string;
  to?: string;
}

interface PageProps {
  searchParams?: Promise<PageSearchParams>;
}

async function AdvancesContent({ filters }: { filters: ListAdvancesFilters }) {
  const rows = await listAdvances(filters);
  const plainRows = rows.map((row) => ({ ...row }));
  return <AdvancesGrid rows={plainRows} />;
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
    if (params?.seasonId) query.set('seasonId', params.seasonId);
    if (params?.producerId) query.set('producerId', params.producerId);
    if (params?.paymentMethod) query.set('paymentMethod', params.paymentMethod);
    if (params?.status) query.set('status', params.status);
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    query.set('page', params?.page || '1');
    query.set('limit', params?.limit || '25');
    redirect(`/home/economicManagement/advances?${query.toString()}`);
  }

  const filters: ListAdvancesFilters = {};

  if (typeof params?.search === 'string' && params.search.trim()) {
    filters.search = params.search.trim();
  }

  if (typeof params?.seasonId === 'string' && params.seasonId.trim()) {
    filters.seasonId = params.seasonId.trim();
  }

  if (typeof params?.producerId === 'string' && params.producerId.trim()) {
    filters.producerId = params.producerId.trim();
  }

  if (typeof params?.paymentMethod === 'string' && params.paymentMethod.trim()) {
    filters.paymentMethod = params.paymentMethod.trim() as AdvancePaymentMethod;
  }

  if (typeof params?.status === 'string' && params.status.trim()) {
    filters.status = params.status.trim() as AdvanceStatus;
  }

  if (typeof params?.from === 'string' && params.from.trim()) {
    filters.from = params.from.trim();
  }

  if (typeof params?.to === 'string' && params.to.trim()) {
    filters.to = params.to.trim();
  }

  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[400px]"><DotProgress /></div>}>
      <div className="space-y-6">
        <AdvancesContent filters={filters} />
      </div>
    </Suspense>
  );
}
