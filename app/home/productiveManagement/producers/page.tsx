'use server';

import React, { Suspense } from 'react';
import DotProgress from '@/app/baseComponents/DotProgress/DotProgress';
import { getProducersGridData } from '../../../actions/producers';
import ProducersGrid from './ui/ProducersGrid';

interface ProducersPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    sort?: string;
    sortField?: string;
    search?: string;
    filters?: string;
  }>;
}

export default async function ProducersPage({ searchParams }: ProducersPageProps) {
  const params = await searchParams;
  
  const page = params.page ? parseInt(params.page) : 1;
  const limit = params.limit ? parseInt(params.limit) : 25;
  const sortBy = params.sortField || 'name';
  const sortOrder = (params.sort as 'ASC' | 'DESC') || 'DESC';
  const search = params.search || '';
  const filters = params.filters || '';

  const gridData = await getProducersGridData({
    page,
    limit,
    sortBy,
    sortOrder,
    search,
    columnFilters: filters,
  });

  return (
    <div className="w-full h-full flex flex-col">
      <Suspense fallback={<DotProgress size={16} />}>
        <ProducersGrid initialData={gridData} />
      </Suspense>
    </div>
  );
}

