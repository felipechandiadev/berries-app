import React from 'react';
import { Storage } from '@/data/entities/Storage';
import IconButton from '@/app/baseComponents/IconButton/IconButton';

interface StorageCardProps {
  storage: Storage;
  onEdit: () => void;
  onDelete: () => void;
  'data-test-id'?: string;
}

export function StorageCard({ storage, onEdit, onDelete, 'data-test-id': dataTestId }: StorageCardProps) {
  return (
    <div className="relative bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200" data-test-id={dataTestId}>
      {/* Contenido principal */}
      <div className="pb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {storage.name}
        </h3>

        <div className="space-y-2 text-sm text-gray-600">
          {storage.capacityPallets && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Capacidad:</span>
              <span>{storage.capacityPallets} pallets</span>
            </div>
          )}

          {storage.location && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Ubicación:</span>
              <span>{storage.location}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="font-medium">Estado:</span>
            <span className={storage.active ? 'text-green-600' : 'text-red-600'}>
              {storage.active ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>
      </div>

      {/* Badge y botones de acción abajo */}
      <div className="flex justify-end items-center mt-4" data-test-id={`${dataTestId}-actions-row`}>
        <div className="flex gap-2" data-test-id={`${dataTestId}-buttons`}>
          <IconButton
            icon="edit"
            variant="basicSecondary"
            aria-label={`Editar almacenamiento ${storage.name}`}
            onClick={onEdit}
            data-test-id={`edit-storage-${storage.id}`}
          />
          <IconButton
            icon="delete"
            variant="basicSecondary"
            aria-label={`Eliminar almacenamiento ${storage.name}`}
            onClick={onDelete}
            data-test-id={`delete-storage-${storage.id}`}
          />
        </div>
      </div>
    </div>
  );
}

export default StorageCard;