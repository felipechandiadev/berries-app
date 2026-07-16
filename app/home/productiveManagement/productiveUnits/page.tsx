'use server';

import React, { Suspense } from 'react';
import DotProgress from '@/app/baseComponents/DotProgress/DotProgress';
import { getProductiveUnitsGridData } from '../../../actions/productiveUnits';
import ProductiveUnitsGrid from './ui/ProductiveUnitsGrid';

interface ProductiveUnitsPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    sort?: string;
    sortField?: string;
    search?: string;
    filters?: string;
  }>;
}

export default async function ProductiveUnitsPage({ searchParams }: ProductiveUnitsPageProps) {
  const params = await searchParams;
  
  const page = params.page ? parseInt(params.page) : 1;
  const limit = params.limit ? parseInt(params.limit) : 25;
  const sortBy = params.sortField || 'name';
  const sortOrder = (params.sort as 'ASC' | 'DESC') || 'ASC';
  const search = params.search || '';
  const filters = params.filters || '';

  const gridData = await getProductiveUnitsGridData({
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
        <ProductiveUnitsGrid initialData={gridData} />
      </Suspense>
    </div>
  );
}
