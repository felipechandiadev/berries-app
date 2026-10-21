'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Badge from '@/app/baseComponents/Badge/Badge';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import DeleteTrayDialog from './DeleteTrayDialog';
import UpdateTrayDialog from './UpdateTrayDialog';
import TrayAdjustmentDialog from './TrayAdjustmentDialog';
import TrayDeliveryDialog from './TrayDeliveryDialog';
import TrayReceptionDialog from './TrayReceptionDialog';
import { usePermissions } from '@/app/state/hooks/usePermissions';

export interface TrayCardProps {
  tray: {
    id: string;
    name: string;
    weight: number;
    stock: number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
  };
  'data-test-id'?: string;
}

const TrayCard: React.FC<TrayCardProps> = ({ tray, 'data-test-id': dataTestId }) => {
  const router = useRouter();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openUpdateDialog, setOpenUpdateDialog] = useState(false);
  const [openAdjustmentDialog, setOpenAdjustmentDialog] = useState(false);
  const [openReceptionDialog, setOpenReceptionDialog] = useState(false);
  const [openDeliveryDialog, setOpenDeliveryDialog] = useState(false);
  const { has } = usePermissions();
  const canMoveStock = Boolean(tray.active);

  const formatWeight = (weight: number) => {
    return `${weight.toFixed(3)} kg`;
  };

  const getStatusBadgeVariant = (active: boolean): 'success' | 'error' => {
    return active ? 'success' : 'error';
  };

  const getStatusLabel = (active: boolean): string => {
    return active ? 'Activa' : 'Inactiva';
  };

  return (
    <article className="border border-neutral-200 bg-white rounded-lg shadow-sm p-4 flex flex-col justify-between min-w-[260px]" data-test-id={dataTestId}>
      {/* Información principal */}
      <div className="flex flex-col gap-2 w-full overflow-hidden mb-2">
        <h3 className="text-lg font-semibold text-foreground truncate break-all" data-test-id={`${dataTestId}-name`}>
          {tray.name}
        </h3>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-600">Peso:</span>
            <span className="font-medium text-gray-900">{formatWeight(tray.weight)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-600">Stock:</span>
            <span className="font-medium text-gray-900">{tray.stock}</span>
          </div>
        </div>
      </div>

      {/* Acciones y badge en la parte inferior */}
      <div className="flex justify-between items-center mt-4" data-test-id={`${dataTestId}-actions-row`}>
        {/* Badge estado a la izquierda */}
        <div data-test-id={`${dataTestId}-status-badge`}>
          <Badge
            variant={getStatusBadgeVariant(tray.active)}
            className="mb-0"
          >
            {getStatusLabel(tray.active)}
          </Badge>
        </div>
        {/* IconButtons a la derecha */}
        <div className="flex gap-2" data-test-id={`${dataTestId}-buttons`}>
          {has('TRAYS_DELIVERY') && (
            <IconButton
              icon="arrow_upward"
              variant="basicSecondary"
              aria-label={canMoveStock ? `Registrar entrega de bandejas ${tray.name}` : 'Bandeja inactiva: no se puede entregar'}
              onClick={() => setOpenDeliveryDialog(true)}
              disabled={!canMoveStock}
              data-test-id={`${dataTestId}-delivery-button`}
            />
          )}
          {has('TRAYS_RECEPTION') && (
            <IconButton
              icon="arrow_downward"
              variant="basicSecondary"
              aria-label={canMoveStock ? `Registrar recepción de bandejas ${tray.name}` : 'Bandeja inactiva: no se puede recibir'}
              onClick={() => setOpenReceptionDialog(true)}
              disabled={!canMoveStock}
              data-test-id={`${dataTestId}-reception-button`}
            />
          )}
          {has('TRAYS_AJUST_STOCK') && (
            <IconButton
              icon="checkbook"
              variant="basicSecondary"
              aria-label={canMoveStock ? `Ajustar stock de bandeja ${tray.name}` : 'Bandeja inactiva: no se puede ajustar stock'}
              onClick={() => setOpenAdjustmentDialog(true)}
              disabled={!canMoveStock}
              data-test-id={`${dataTestId}-adjustment-button`}
            />
          )}
          {has('TRAYS_UPDATE') && (
            <IconButton
              icon="edit"
              variant="basicSecondary"
              aria-label={`Editar bandeja ${tray.name}`}
              onClick={() => setOpenUpdateDialog(true)}
              data-test-id={`${dataTestId}-edit-button`}
            />
          )}
          {has('TRAYS_DELETE') && (
            <IconButton
              icon="delete"
              variant="basicSecondary"
              aria-label={`Eliminar bandeja ${tray.name}`}
              onClick={() => setOpenDeleteDialog(true)}
              data-test-id={`${dataTestId}-delete-button`}
            />
          )}
        </div>
      </div>

      {/* Diálogos */}
      <UpdateTrayDialog
        open={openUpdateDialog}
        onClose={() => setOpenUpdateDialog(false)}
        tray={tray}
        onSuccess={() => {
          setOpenUpdateDialog(false);
          router.refresh();
        }}
        data-test-id={`${dataTestId}-update-dialog`}
      />

      <DeleteTrayDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        tray={tray}
        onSuccess={() => {
          setOpenDeleteDialog(false);
          router.refresh();
        }}
        data-test-id={`${dataTestId}-delete-dialog`}
      />

      <TrayAdjustmentDialog
        open={openAdjustmentDialog}
        onClose={() => setOpenAdjustmentDialog(false)}
        tray={tray}
        mode="adjustment"
        onSuccess={() => {
          setOpenAdjustmentDialog(false);
          router.refresh();
        }}
        data-test-id={`${dataTestId}-adjustment-dialog`}
      />

      <TrayReceptionDialog
        open={openReceptionDialog}
        onClose={() => setOpenReceptionDialog(false)}
        tray={tray}
        onSuccess={() => {
          setOpenReceptionDialog(false);
          router.refresh();
        }}
        data-test-id={`${dataTestId}-reception-dialog`}
      />

      <TrayDeliveryDialog
        open={openDeliveryDialog}
        onClose={() => setOpenDeliveryDialog(false)}
        tray={tray}
        onSuccess={() => {
          setOpenDeliveryDialog(false);
          router.refresh();
        }}
        data-test-id={`${dataTestId}-delivery-dialog`}
      />
    </article>
  );
};

export default TrayCard;