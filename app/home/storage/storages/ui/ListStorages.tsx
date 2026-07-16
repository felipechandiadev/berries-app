'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Storage } from '@/data/entities/Storage';
import StorageCard from './StorageCard';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import CreateStorageDialog from './CreateStorageDialog';
import UpdateStorageDialog from './UpdateStorageDialog';
import DeleteStorageDialog from './DeleteStorageDialog';

interface ListStoragesProps {
  storages: Storage[];
}

const defaultEmptyMessage = 'No hay almacenamientos para mostrar.';

export function ListStorages({ storages }: ListStoragesProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [editingStorage, setEditingStorage] = useState<Storage | null>(null);
  const [deletingStorage, setDeletingStorage] = useState<Storage | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setSearch(value);
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/home/storage/storages';
    router.replace(`${pathname}?${params.toString()}`);
    router.refresh();
  };

  const normalizedSearch = search.trim().toLowerCase();

  const filteredStorages = storages.filter(storage => {
    if (!normalizedSearch) {
      return true;
    }

    const matchesName = storage.name.toLowerCase().includes(normalizedSearch);
    const matchesLocation = storage.location?.toLowerCase().includes(normalizedSearch) ?? false;
    const matchesCapacity = typeof storage.capacityPallets === 'number' &&
      storage.capacityPallets.toString().includes(normalizedSearch);
    const matchesStatus = (storage.active ? 'activo' : 'inactivo').includes(normalizedSearch);

    return matchesName || matchesLocation || matchesCapacity || matchesStatus;
  });

  return (
    <div className="w-full" data-test-id="storages-list-container">
      {/* Primera fila: búsqueda y botón */}
      <div className="flex items-center justify-between mb-4 gap-4" data-test-id="storages-list-header">
        <IconButton
          icon="add"
          variant='outlined'
          aria-label="Agregar almacenamiento"
          onClick={() => setOpenCreateDialog(true)}
          data-test-id="storages-add-button"
        />
        <div className="w-full max-w-sm" data-test-id="storages-search-container">
          <TextField
            label="Buscar"
            value={search}
            onChange={handleSearchChange}
            startIcon="search"
            placeholder="Buscar almacenamiento..."
            data-test-id="storages-search-input"
          />
        </div>
      </div>
      {/* Segunda fila: grid de tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full" data-test-id="storages-grid">
        {filteredStorages && filteredStorages.length > 0 ? (
          filteredStorages.map(storage => (
            <StorageCard
              key={storage.id}
              storage={storage}
              onEdit={() => setEditingStorage(storage)}
              onDelete={() => setDeletingStorage(storage)}
              data-test-id={`storage-card-${storage.id}`}
            />
          ))
        ) : (
          <div className="col-span-full text-center text-neutral-500 py-8" data-test-id="storages-empty-message">{defaultEmptyMessage}</div>
        )}
      </div>

      {/* CreateStorageDialog */}
      <CreateStorageDialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        data-test-id="storages-create-dialog"
      />

      {/* Diálogo de edición */}
      {editingStorage && (
        <UpdateStorageDialog
          open={!!editingStorage}
          onClose={() => setEditingStorage(null)}
          storage={editingStorage}
          data-test-id="storages-update-dialog"
        />
      )}

      {/* Diálogo de eliminación */}
      {deletingStorage && (
        <DeleteStorageDialog
          open={!!deletingStorage}
          onClose={() => setDeletingStorage(null)}
          storage={deletingStorage}
          data-test-id="storages-delete-dialog"
        />
      )}
    </div>
  );
}

export default ListStorages;