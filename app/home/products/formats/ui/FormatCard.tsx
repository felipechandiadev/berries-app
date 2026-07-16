'use client';
import React, { useState } from 'react';
import Badge from '@/app/baseComponents/Badge/Badge';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import DeleteFormatDialog from './DeleteFormatDialog';
import UpdateFormatDialog from './UpdateFormatDialog';
import { usePermissions } from '@/app/state/hooks/usePermissions';

export interface FormatCardProps {
  format: {
    id: number;
    name: string;
    description?: string;
    priceCLP?: number;
    priceUSD?: number;
    active: boolean;
    varietyId?: number | null;
    varietyName?: string | null;
  };
  'data-test-id'?: string;
}

const FormatCard: React.FC<FormatCardProps> = ({ format, 'data-test-id': dataTestId }) => {
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openUpdateDialog, setOpenUpdateDialog] = useState(false);
  const { has } = usePermissions();

  const formatCLP = (price: number) => {
    // Formato chileno: separador de miles con punto, sin decimales para CLP
    // Ejemplo: 1234567 -> "$ 1.234.567"
    if (price === 0) return "$ 0";
    
    const formatted = Math.abs(price).toLocaleString('es-CL');
    return `$ ${formatted}`;
  };

  const formatUSD = (price: number) => {
    // Formato chileno para USD: separador de miles con punto, decimales con coma
    // Ejemplo: 1234.56 -> "US$ 1.234,56"
    if (price === 0) return "US$ 0,00";
    
    const integerPart = Math.floor(Math.abs(price));
    const decimalPart = Math.round((Math.abs(price) - integerPart) * 100);
    
    const formattedInteger = integerPart.toLocaleString('es-CL');
    const formattedDecimals = decimalPart.toString().padStart(2, '0');
    
    return `US$ ${formattedInteger},${formattedDecimals}`;
  };

  return (
    <article className="border border-neutral-200 bg-white rounded-lg shadow-sm p-4 flex flex-col justify-between min-w-[260px]" data-test-id={dataTestId}>
      {/* Información principal */}
      <div className="flex flex-col gap-2 w-full overflow-hidden mb-2">
        <h3 className="text-lg font-semibold text-foreground truncate break-all" data-test-id={`${dataTestId}-name`}>
          {format.name}
        </h3>
        <div className="flex flex-col gap-1">
          <div className="text-sm text-gray-700 text-left truncate">
            {format.description || 'Sin descripción'}
          </div>
          <div className="flex flex-col gap-1 mt-1">
            {(format.varietyName || format.varietyId) && (
              <div className="flex items-center justify-start gap-2">
                <span className="text-xs text-neutral-600">Variedad:</span>
                <span className="font-medium text-gray-900 truncate">{format.varietyName || 'Asignada'}</span>
              </div>
            )}
            <div className="flex items-center justify-start gap-2">
              <span className="text-xs text-neutral-600">CLP:</span>
              <span className="font-medium text-gray-900">{formatCLP(format.priceCLP || 0)}</span>
            </div>
            <div className="flex items-center justify-start gap-2">
              <span className="text-xs text-neutral-600">USD:</span>
              <span className="font-medium text-gray-900">{formatUSD(format.priceUSD || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones y badge en la parte inferior */}
      <div className="flex justify-between items-center mt-4" data-test-id={`${dataTestId}-actions-row`}>
        {/* Badge estado a la izquierda */}
        <div data-test-id={`${dataTestId}-status-badge`}>
          <Badge
            variant={format.active ? 'success' : 'error'}
            className="mb-0"
          >
            {format.active ? 'Activo' : 'Inactivo'}
          </Badge>
        </div>
        {/* IconButtons a la derecha */}
        <div className="flex gap-2" data-test-id={`${dataTestId}-buttons`}>
          {has('FORMATS_UPDATE') && (
            <IconButton
              icon="edit"
              variant="basicSecondary"
              aria-label={`Editar formato ${format.name}`}
              onClick={() => setOpenUpdateDialog(true)}
              data-test-id={`${dataTestId}-edit-button`}
            />
          )}
          {has('FORMATS_DELETE') && (
            <IconButton
              icon="delete"
              variant="basicSecondary"
              aria-label={`Eliminar formato ${format.name}`}
              onClick={() => setOpenDeleteDialog(true)}
              data-test-id={`${dataTestId}-delete-button`}
            />
          )}
        </div>
      </div>

      <UpdateFormatDialog
        open={openUpdateDialog}
        onClose={() => setOpenUpdateDialog(false)}
        format={format}
        data-test-id={`${dataTestId}-update-dialog`}
      />

      <DeleteFormatDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        format={format}
        data-test-id={`${dataTestId}-delete-dialog`}
      />
    </article>
  );
};

export default FormatCard;