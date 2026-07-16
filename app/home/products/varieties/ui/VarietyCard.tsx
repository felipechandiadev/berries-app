'use client';
import React, { useState } from 'react';
import Badge from '@/app/baseComponents/Badge/Badge';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import DeleteVarietyDialog from './DeleteVarietyDialog';
import UpdateVarietyDialog from './UpdateVarietyDialog';
import { usePermissions } from '@/app/state/hooks/usePermissions';

export interface VarietyCardProps {
  variety: {
    id: number;
    name: string;
    description: string | null;
  };
  'data-test-id'?: string;
}

const VarietyCard: React.FC<VarietyCardProps> = ({ variety, 'data-test-id': dataTestId }) => {
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openUpdateDialog, setOpenUpdateDialog] = useState(false);
  const { has } = usePermissions();

  return (
    <article className="border border-neutral-200 bg-white rounded-lg shadow-sm p-4 flex flex-col justify-between min-w-[260px]" data-test-id={dataTestId}>
      {/* Información principal */}
      <div className="flex flex-col gap-2 w-full overflow-hidden mb-2">
        <h3 className="text-lg font-semibold text-foreground truncate break-all" data-test-id={`${dataTestId}-name`}>
          {variety.name}
        </h3>
        {variety.description && (
          <p className="text-sm text-neutral-600 truncate break-all" data-test-id={`${dataTestId}-description`}>
            {variety.description}
          </p>
        )}
      </div>

      {/* Acciones y badge en la parte inferior */}
      <div className="flex justify-end items-center mt-4" data-test-id={`${dataTestId}-actions-row`}>
        {/* IconButtons a la derecha */}
        <div className="flex gap-2" data-test-id={`${dataTestId}-buttons`}>
          {has('VARIETIES_UPDATE') && (
            <IconButton
              icon="edit"
              variant="basicSecondary"
              aria-label={`Editar variedad ${variety.name}`}
              onClick={() => setOpenUpdateDialog(true)}
              data-test-id={`${dataTestId}-edit-button`}
            />
          )}
          {has('VARIETIES_DELETE') && (
            <IconButton
              icon="delete"
              variant="basicSecondary"
              aria-label={`Eliminar variedad ${variety.name}`}
              onClick={() => setOpenDeleteDialog(true)}
              data-test-id={`${dataTestId}-delete-button`}
            />
          )}
        </div>
      </div>

      <UpdateVarietyDialog
        open={openUpdateDialog}
        onClose={() => setOpenUpdateDialog(false)}
        variety={variety}
        data-test-id={`${dataTestId}-update-dialog`}
      />

      <DeleteVarietyDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        variety={variety}
        data-test-id={`${dataTestId}-delete-dialog`}
      />
    </article>
  );
};

export default VarietyCard;