'use client';

import { useMemo, useState } from 'react';
import DataGrid, { DataGridColumn } from '@/app/baseComponents/DataGrid/DataGrid';
import { usePermissions } from '@/app/state/hooks/usePermissions';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import dynamic from 'next/dynamic';
import { deleteProductiveUnit } from '@/app/actions/productiveUnits';
import { useAlert } from '@/app/state/hooks/useAlert';
import { useRouter } from 'next/navigation';
import type { ProductiveUnitGridData } from '@/app/actions/productiveUnits';
import CreateProductiveUnitDialog from './CreateProductiveUnitDialog';
import UpdateProductiveUnitDialog from './UpdateProductiveUnitDialog';

// Dynamically import DeleteBaseForm to avoid SSR issues
const DeleteBaseForm = dynamic(() => import('@/app/baseComponents/BaseForm/DeleteBaseForm'), { ssr: false });

interface ProductiveUnitsGridProps {
  initialData: {
    success: boolean;
    data: ProductiveUnitGridData[];
    totalRecords: number;
    page: number;
    limit: number;
    totalPages: number;
    error?: string;
  };
}

interface RenderCellParams {
  row: ProductiveUnitGridData;
}

export default function ProductiveUnitsGrid({ initialData }: ProductiveUnitsGridProps) {
  const { has } = usePermissions();
  const { success, error: showError } = useAlert();
  const router = useRouter();
  const [selectedUnit, setSelectedUnit] = useState<ProductiveUnitGridData | null>(null);
  const [openUpdateDialog, setOpenUpdateDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEditClick = (unit: ProductiveUnitGridData) => {
    setSelectedUnit(unit);
    setOpenUpdateDialog(true);
  };

  const handleDeleteClick = (unit: ProductiveUnitGridData) => {
    setSelectedUnit(unit);
    setOpenDeleteDialog(true);
  };

  const handleCloseDialogs = () => {
    setOpenUpdateDialog(false);
    setOpenDeleteDialog(false);
    setSelectedUnit(null);
  };

  const handleCreateSuccess = () => {
    router.refresh();
  };

  const handleUpdateSuccess = () => {
    handleCloseDialogs();
    router.refresh();
  };

  const handleDeleteSubmit = async () => {
    if (!selectedUnit?.id) {
      showError('Unidad productiva no identificada');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await deleteProductiveUnit(selectedUnit.id);

      if (result.success) {
        success('Unidad productiva eliminada exitosamente');
        setTimeout(() => {
          handleCloseDialogs();
          router.refresh();
        }, 500);
      } else {
        showError(result.error || 'Error al eliminar la unidad productiva');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      showError(err?.message || 'Error desconocido');
      setIsSubmitting(false);
    }
  };

  // Define columns - solo nombre y ubicación
  const columns: DataGridColumn[] = useMemo(() => [
    {
      field: 'name',
      headerName: 'Nombre',
      flex: 1.5,
      sortable: true,
      filterable: true,
    },
    {
      field: 'location',
      headerName: 'Ubicación',
      flex: 1.5,
      sortable: true,
      filterable: true,
      renderCell: ({ row }: RenderCellParams) => row.location || '-',
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 120,
      sortable: false,
      renderCell: ({ row }: RenderCellParams) => (
        <div className="flex gap-1">
          {has('PRODUCTIVE_UNITS_UPDATE') && (
            <IconButton
              icon="edit"
              variant="basicSecondary"
              size="sm"
              onClick={() => handleEditClick(row)}
              title="Editar"
            />
          )}
          {has('PRODUCTIVE_UNITS_DELETE') && (
            <IconButton
              icon="delete"
              variant="basicSecondary"
              size="sm"
              onClick={() => handleDeleteClick(row)}
              title="Eliminar"
            />
          )}
        </div>
      ),
    },
  ], [has]);

  // Grid rows
  const rows = useMemo(() => initialData.data || [], [initialData.data]);

  return (
    <>
      <DataGrid
        columns={columns}
        rows={rows}
        totalRows={initialData.totalRecords}
        limit={initialData.limit}
        title="Unidades Productivas"
        createForm={has('PRODUCTIVE_UNITS_CREATE') ? <CreateProductiveUnitDialog onSuccess={handleCreateSuccess} /> : undefined}
        createFormTitle="Nueva Unidad Productiva"
      />

      {/* Update Dialog */}
      <UpdateProductiveUnitDialog
        open={openUpdateDialog}
        onClose={handleCloseDialogs}
        productiveUnit={selectedUnit}
        onSuccess={handleUpdateSuccess}
      />

      {/* Delete Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDialogs}
        title=""
        size="xs"
      >
        <DeleteBaseForm
          message={`¿Está seguro que desea eliminar la unidad productiva "${selectedUnit?.name}"? Esta acción no se puede deshacer.`}
          onSubmit={handleDeleteSubmit}
          isSubmitting={isSubmitting}
          errors={[]}
          cancelButton={true}
          cancelButtonText="Cancelar"
          onCancel={handleCloseDialogs}
          submitLabel="Eliminar"
          title="Eliminar Unidad Productiva"
        />
      </Dialog>
    </>
  );
}
