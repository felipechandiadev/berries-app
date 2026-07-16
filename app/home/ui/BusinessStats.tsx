'use client';

import React from 'react';

interface BusinessStatsProps {
  producersCount: number;
  totalReceptions: number;
  totalDispatches: number;
}

export default function BusinessStats({ producersCount, totalReceptions, totalDispatches }: BusinessStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-neutral-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="p-2 bg-purple-100 rounded-lg">
            <span className="material-symbols-outlined text-purple-600">agriculture</span>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-neutral-600 dark:text-gray-400">Productores</p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{producersCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-neutral-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="p-2 bg-green-100 rounded-lg">
            <span className="material-symbols-outlined text-green-600">download</span>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-neutral-600 dark:text-gray-400">Total Recepcionado</p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{totalReceptions.toLocaleString('es-ES')} kg</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-neutral-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="p-2 bg-orange-100 rounded-lg">
            <span className="material-symbols-outlined text-orange-600">upload</span>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-neutral-600 dark:text-gray-400">Total Despachado</p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{totalDispatches.toLocaleString('es-ES')} kg</p>
          </div>
        </div>
      </div>
    </div>
  );
}
