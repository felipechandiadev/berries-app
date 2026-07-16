'use client';
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TrayCard from "./TrayCard";
import CreateTrayDialog from "./CreateTrayDialog";
import { TextField } from '@/app/baseComponents/TextField/TextField';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import { usePermissions } from '@/app/state/hooks/usePermissions';

export interface TrayType {
  id: string;
  name: string;
  weight: number;
  stock: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface ListTraysProps {
  trays: TrayType[];
}

const defaultEmptyMessage = 'No hay bandejas para mostrar.';

const ListTrays: React.FC<ListTraysProps> = ({ trays }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
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
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/home/storage/trays';
    router.replace(`${pathname}?${params.toString()}`);
    router.refresh();
  };

  const displayedTrays = trays.filter(tray =>
    tray.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full" data-test-id="trays-list-container">
      {/* Primera fila: búsqueda y botón */}
      <div className="flex items-center justify-between mb-4 gap-4" data-test-id="trays-list-header">
        {has('TRAYS_CREATE') && (
          <IconButton 
            icon="add" 
            variant='outlined'
            aria-label="Agregar bandeja"
            onClick={() => setOpenCreateDialog(true)}
            data-test-id="trays-add-button"
          />
        )}
        <div className="w-full max-w-sm" data-test-id="trays-search-container">
          <TextField
            label="Buscar"
            value={search}
            onChange={handleSearchChange}
            startIcon="search"
            placeholder="Buscar bandeja..."
            data-test-id="trays-search-input"
          />
        </div>
      </div>
      {/* Segunda fila: grid de tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full" data-test-id="trays-grid">
        {displayedTrays.length > 0 ? (
          displayedTrays.map((tray) => (
            <TrayCard
              key={tray.id}
              tray={tray}
              data-test-id={`tray-card-${tray.id}`}
            />
          ))
        ) : (
          <div className="col-span-full text-center text-neutral-500 py-8" data-test-id="trays-empty-message">{defaultEmptyMessage}</div>
        )}
      </div>

      {/* Diálogo de creación */}
      <CreateTrayDialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        onSuccess={() => {
          setOpenCreateDialog(false);
          router.refresh();
        }}
        data-test-id="trays-create-dialog"
      />
    </div>
  );
};

export default ListTrays;