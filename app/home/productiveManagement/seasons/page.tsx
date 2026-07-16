import React from 'react';
import { getSeasons } from '@/app/actions/seasons';
import ListSeasons from './ui/ListSeasons';

export default async function SeasonsPage() {
  const seasonsResult = await getSeasons();

  if (!seasonsResult.success) {
    return (
      <div className="p-6">
        <div className="text-red-600">
          Error al cargar las temporadas: {seasonsResult.error}
        </div>
      </div>
    );
  }

  const seasons = Array.isArray(seasonsResult.data) ? seasonsResult.data : [];

  return (
    <div className="p-6">
      <ListSeasons seasons={seasons} />
    </div>
  );
}
