import React from 'react';
import { Season } from '@/data/entities/Season';
import Badge, { BadgeVariant } from '@/app/baseComponents/Badge/Badge';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import { usePermissions } from '@/app/state/hooks/usePermissions';

interface SeasonCardProps {
  season: Season;
  onEdit: () => void;
  onDelete: () => void;
  'data-test-id'?: string;
}

const getSeasonStatusColor = (active: boolean): BadgeVariant => {
  return active ? 'success' : 'secondary';
};

const getSeasonStatusLabel = (active: boolean): string => {
  return active ? 'Activa' : 'Inactiva';
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(date));
};

export function SeasonCard({ season, onEdit, onDelete, 'data-test-id': dataTestId }: SeasonCardProps) {
  const { has } = usePermissions();

  return (
    <div className="relative bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200" data-test-id={dataTestId}>
      {/* Contenido principal */}
      <div className="pb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {season.name}
        </h3>

        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="font-medium">Inicio:</span>
            <span>{formatDate(season.startDate)}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium">Término:</span>
            <span>{formatDate(season.endDate)}</span>
          </div>

          {season.description && (
            <div className="flex flex-col gap-1">
              <span className="font-medium">Descripción:</span>
              <span className="text-gray-700">{season.description}</span>
            </div>
          )}
        </div>
      </div>

      {/* Badge y botones de acción abajo */}
      <div className="flex justify-between items-center mt-4" data-test-id={`${dataTestId}-actions-row`}>
        {/* Badge estado a la izquierda */}
        <div data-test-id={`${dataTestId}-status-badge`}>
          <Badge
            variant={getSeasonStatusColor(season.active)}
          >
            {getSeasonStatusLabel(season.active)}
          </Badge>
        </div>
        {/* IconButtons a la derecha */}
        <div className="flex gap-2" data-test-id={`${dataTestId}-buttons`}>
          {has('SEASONS_UPDATE') && (
            <IconButton
              icon="edit"
              variant="basicSecondary"
              aria-label={`Editar temporada ${season.name}`}
              onClick={onEdit}
              data-test-id={`edit-season-${season.id}`}
            />
          )}
          {has('SEASONS_DELETE') && (
            <IconButton
              icon="delete"
              variant="basicSecondary"
              aria-label={`Eliminar temporada ${season.name}`}
              onClick={onDelete}
              data-test-id={`delete-season-${season.id}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default SeasonCard;