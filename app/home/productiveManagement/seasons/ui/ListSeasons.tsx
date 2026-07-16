'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Season } from '@/data/entities/Season';
import SeasonCard from './SeasonCard';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import CreateSeasonDialog from './CreateSeasonDialog';
import UpdateSeasonDialog from './UpdateSeasonDialog';
import DeleteSeasonDialog from './DeleteSeasonDialog';
import { usePermissions } from '@/app/state/hooks/usePermissions';

interface ListSeasonsProps {
  seasons: Season[];
}

const defaultEmptyMessage = 'No hay temporadas para mostrar.';

export function ListSeasons({ seasons }: ListSeasonsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [deletingSeason, setDeletingSeason] = useState<Season | null>(null);
  const { has } = usePermissions();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setSearch(value);
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/home/productiveManagement/seasons';
    router.replace(`${pathname}?${params.toString()}`);
    router.refresh();
  };

  const filteredSeasons = seasons.filter(season =>
    season.name.toLowerCase().includes(search.toLowerCase()) ||
    (season.description && season.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="w-full" data-test-id="seasons-list-container">
      {/* Primera fila: búsqueda y botón */}
      <div className="flex items-center justify-between mb-4 gap-4" data-test-id="seasons-list-header">
        {has('SEASONS_CREATE') && (
          <IconButton
            icon="add"
            variant='outlined'
            aria-label="Agregar temporada"
            onClick={() => setOpenCreateDialog(true)}
            data-test-id="seasons-add-button"
          />
        )}
        <div className="w-full max-w-sm" data-test-id="seasons-search-container">
          <TextField
            label="Buscar"
            value={search}
            onChange={handleSearchChange}
            startIcon="search"
            placeholder="Buscar temporada..."
            data-test-id="seasons-search-input"
          />
        </div>
      </div>
      {/* Segunda fila: grid de tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full" data-test-id="seasons-grid">
        {filteredSeasons && filteredSeasons.length > 0 ? (
          filteredSeasons.map(season => (
            <SeasonCard
              key={season.id}
              season={season}
              onEdit={() => setEditingSeason(season)}
              onDelete={() => setDeletingSeason(season)}
              data-test-id={`season-card-${season.id}`}
            />
          ))
        ) : (
          <div className="col-span-full text-center text-neutral-500 py-8" data-test-id="seasons-empty-message">{defaultEmptyMessage}</div>
        )}
      </div>

      {/* CreateSeasonDialog */}
      <CreateSeasonDialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        data-test-id="seasons-create-dialog"
      />

      {/* Diálogo de edición */}
      {editingSeason && (
        <UpdateSeasonDialog
          open={!!editingSeason}
          onClose={() => setEditingSeason(null)}
          season={editingSeason}
          data-test-id="seasons-update-dialog"
        />
      )}

      {/* Diálogo de eliminación */}
      {deletingSeason && (
        <DeleteSeasonDialog
          open={!!deletingSeason}
          onClose={() => setDeletingSeason(null)}
          season={deletingSeason}
          data-test-id="seasons-delete-dialog"
        />
      )}
    </div>
  );
}

export default ListSeasons;