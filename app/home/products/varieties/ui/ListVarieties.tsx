'use client';
import { use, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import VarietyCard from "./VarietyCard";
import CreateVarietyDialog from "./CreateVarietyDialog";
import { TextField } from '@/app/baseComponents/TextField/TextField';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import { Currency } from '../../../../../data/entities/Variety';
import { usePermissions } from '@/app/state/hooks/usePermissions';

export interface VarietyType {
  id: number;
  name: string;
  description: string | null;
}

export interface ListVarietiesProps {
  varieties: VarietyType[];
}

const defaultEmptyMessage = 'No hay variedades para mostrar.';

const ListVarieties: React.FC<ListVarietiesProps> = ({ varieties }) => {
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
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/home/varieties';
    router.replace(`${pathname}?${params.toString()}`);
    router.refresh();
  };

  const displayedVarieties = varieties;

  return (
    <div className="w-full" data-test-id="varieties-list-container">
      {/* Primera fila: búsqueda y botón */}
      <div className="flex items-center justify-between mb-4 gap-4" data-test-id="varieties-list-header">
        {has('VARIETIES_CREATE') && (
          <IconButton 
            icon="add" 
            variant='outlined'
            aria-label="Agregar variedad"
            onClick={() => setOpenCreateDialog(true)}
            data-test-id="varieties-add-button"
          />
        )}
        <div className="w-full max-w-sm" data-test-id="varieties-search-container">
          <TextField
            label="Buscar"
            value={search}
            onChange={handleSearchChange}
            startIcon="search"
            placeholder="Buscar variedad..."
            data-test-id="varieties-search-input"
          />
        </div>
      </div>
      {/* Segunda fila: grid de tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full" data-test-id="varieties-grid">
        {displayedVarieties && displayedVarieties.length > 0 ? (
          displayedVarieties.map(variety => (
            <VarietyCard 
              key={variety.id} 
              variety={variety}
              data-test-id={`variety-card-${variety.id}`}
            />
          ))
        ) : (
          <div className="col-span-full text-center text-neutral-500 py-8" data-test-id="varieties-empty-message">{defaultEmptyMessage}</div>
        )}
      </div>

      {/* CreateVarietyDialog */}
      <CreateVarietyDialog 
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        data-test-id="varieties-create-dialog"
      />
    </div>
  );
};

export default ListVarieties;