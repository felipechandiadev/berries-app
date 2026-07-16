'use client';
import { use, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import FormatCard from "./FormatCard";
import CreateFormatDialog from "./CreateFormatDialog";
import { TextField } from '@/app/baseComponents/TextField/TextField';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import { usePermissions } from '@/app/state/hooks/usePermissions';

export interface FormatType {
  id: number;
  name: string;
  description?: string;
  priceCLP?: number;
  active: boolean;
}

export interface ListFormatsProps {
  formats: FormatType[];
}

const defaultEmptyMessage = 'No hay formatos para mostrar.';

const ListFormats: React.FC<ListFormatsProps> = ({ formats }) => {
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
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/home/products/formats';
    router.replace(`${pathname}?${params.toString()}`);
    router.refresh();
  };

  const displayedFormats = formats;

  return (
    <div className="w-full" data-test-id="formats-list-container">
      {/* Primera fila: botón y búsqueda */}
      <div className="flex items-center justify-between mb-4 gap-4" data-test-id="formats-list-header">
        {has('FORMATS_CREATE') && (
          <IconButton
            icon="add"
            variant='outlined'
            aria-label="Agregar formato"
            onClick={() => setOpenCreateDialog(true)}
            data-test-id="formats-add-button"
          />
        )}
        <div className="w-full max-w-sm" data-test-id="formats-search-container">
          <TextField
            label="Buscar"
            value={search}
            onChange={handleSearchChange}
            startIcon="search"
            placeholder="Buscar formato..."
            data-test-id="formats-search-input"
          />
        </div>
      </div>

      {/* Segunda fila: grid de tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full" data-test-id="formats-grid">
        {displayedFormats && displayedFormats.length > 0 ? (
          displayedFormats.map(format => (
            <FormatCard
              key={format.id}
              format={format}
              data-test-id={`format-card-${format.id}`}
            />
          ))
        ) : (
          <div className="col-span-full text-center text-neutral-500 py-8" data-test-id="formats-empty-message">{defaultEmptyMessage}</div>
        )}
      </div>

      {/* CreateFormatDialog */}
      <CreateFormatDialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        data-test-id="formats-create-dialog"
      />
    </div>
  );
};

export default ListFormats;