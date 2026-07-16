'use client';

import React, { useState, useEffect } from 'react';
import { getSeasonsSimpleList } from '../../../../actions/seasons';
import Select from '../../../../baseComponents/Select/Select';

interface Season {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
}

interface SeasonSelectorProps {
  selectedSeasonId?: string;
  onSeasonChange: (seasonId: string | undefined) => void;
}

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
};

export default function SeasonSelector({ selectedSeasonId, onSeasonChange }: SeasonSelectorProps) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const seasonsList = await getSeasonsSimpleList();
        // Ensure dates are Date objects
        const processedSeasons = (seasonsList.data || []).map(season => ({
          ...season,
          startDate: new Date(season.startDate),
          endDate: new Date(season.endDate),
        }));
        setSeasons(processedSeasons);
      } catch (error) {
        console.error('Error fetching seasons:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSeasons();
  }, []);

  if (loading) {
    return (
      <Select
        label="Temporada"
        placeholder="Cargando temporadas..."
        value={null}
        onChange={() => {}}
        options={[]}
        disabled={true}
      />
    );
  }

  return (
    <Select
      label="Temporada"
      placeholder="Seleccionar temporada..."
      value={selectedSeasonId || null}
      onChange={(seasonId) => onSeasonChange(seasonId === null ? undefined : seasonId as string)}
      options={seasons.map((season) => ({
        id: season.id,
        label: `${season.name} (${formatDate(season.startDate)} - ${formatDate(season.endDate)})`
      }))}
    />
  );
}