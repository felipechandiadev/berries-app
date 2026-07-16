'use client';

// Producers DataGrid component

import { useMemo, useState } from 'react';
import DataGrid, { DataGridColumn } from '@/app/baseComponents/DataGrid/DataGrid';
import { usePermissions } from '@/app/state/hooks/usePermissions';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import dynamic from 'next/dynamic';
import { updateProducer, deleteProducer, getProducersExportData } from '@/app/actions/producers';
import { useAlert } from '@/app/state/hooks/useAlert';
import { useRouter } from 'next/navigation';
import type { ProducerGridData } from '@/app/actions/producers';
import CreateProducerDialog from './CreateProducerDialog';
import UpdateProducerDialog from './UpdateProducerDialog';
import { ProducerDetailLayout, ProducerDetailData } from './ProducerDetail';
import { getProducerDetailData } from '@/app/actions/producerDetail';
import { exportProducersToExcel } from '@/lib/excelExport';

// Dynamically import forms to avoid SSR issues
const DeleteBaseForm = dynamic(() => import('@/app/baseComponents/BaseForm/DeleteBaseForm'), { ssr: false });

interface ProducersGridProps {
  initialData: {
    success: boolean;
    data: ProducerGridData[];
    totalRecords: number;
    page: number;
    limit: number;
    totalPages: number;
    error?: string;
  };
}

interface RenderCellParams {
  row: ProducerGridData;
}

export default function ProducersGrid({ initialData }: ProducersGridProps) {
  const { has } = usePermissions();
  const { success, error: showError, info } = useAlert();
  const router = useRouter();
  const [selectedProducer, setSelectedProducer] = useState<ProducerGridData | null>(null);
  const [openUpdateDialog, setOpenUpdateDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Detail Dialog State
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedProducerDetail, setSelectedProducerDetail] = useState<ProducerDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleViewDetail = async (producer: ProducerGridData) => {
    setLoadingDetail(true);
    try {
      const result = await getProducerDetailData(producer.id);
      if (result.success && result.data) {
        setSelectedProducerDetail(result.data);
        setDetailDialogOpen(true);
      } else {
        showError(result.error || 'Error al cargar detalles del productor');
      }
    } catch (error) {
      showError('Error inesperado al cargar detalles');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseDetail = () => {
    setDetailDialogOpen(false);
    setSelectedProducerDetail(null);
  };

  const handleEditClick = (producer: ProducerGridData) => {
    setSelectedProducer(producer);
    setOpenUpdateDialog(true);
  };

  const handleDeleteClick = (producer: ProducerGridData) => {
    setSelectedProducer(producer);
    setOpenDeleteDialog(true);
  };

  const handleCloseDialogs = () => {
    setOpenUpdateDialog(false);
    setOpenDeleteDialog(false);
    setSelectedProducer(null);
  };

  const handleCreateSuccess = () => {
    // Refresh the page to show the new producer
    router.refresh();
  };

  const handleUpdateSubmit = async (values: Record<string, any>) => {
    if (!selectedProducer?.id) {
      showError('Productor no identificado');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateProducer({
        id: selectedProducer.id,
        name: values.name,
        dni: values.dni,
      });

      if (result.success) {
        success('Productor actualizado exitosamente');
        handleCloseDialogs();
        // Refresh the page to show updated data
        setTimeout(() => {
          router.refresh();
        }, 500);
      } else {
        const errorMessage = result.error || 'Error al actualizar el productor';
        showError(errorMessage);
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Error desconocido';
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      info('Preparando exportación de productores...');
      
      // Obtener filtros actuales de la URL
      const params = new URLSearchParams(window.location.search);
      const search = params.get('search') || undefined;
      const sortBy = params.get('sortBy') || undefined;
      const sortOrder = (params.get('sortOrder') as 'ASC' | 'DESC') || undefined;
      const columnFilters = params.get('columnFilters') || undefined;

      const result = await getProducersExportData({
        search,
        sortBy,
        sortOrder,
        columnFilters
      });
      
      if (result.success && result.data) {
        const exportResult = exportProducersToExcel(result.data);
        if (exportResult.success) {
          success(`Se han exportado ${exportResult.recordCount} productores correctamente`);
        } else {
          showError('Error al generar el archivo Excel');
        }
      } else {
        showError(result.error || 'Error al obtener datos para exportar');
      }
    } catch (error) {
      console.error('Export error:', error);
      showError('Error inesperado durante la exportación');
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedProducer?.id) {
      showError('Productor no identificado');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await deleteProducer(selectedProducer.id);

      if (result.success) {
        success(`Productor "${selectedProducer.name}" eliminado correctamente`);
        handleCloseDialogs();
        // Refresh the page to show updated data
        setTimeout(() => {
          router.refresh();
        }, 500);
      } else {
        const errorMessage = result.error || 'Error al eliminar el productor';
        showError(errorMessage);
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Error desconocido al eliminar el productor';
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: DataGridColumn[] = useMemo(() => [
    {
      field: 'name',
      headerName: 'Nombre',
      flex: 2.5,
      minWidth: 200,
      sortable: true,
      filterable: true,
      renderCell: (params: RenderCellParams) => (
        <span className="text-sm font-medium">{params.row.name}</span>
      ),
    },
    {
      field: 'dni',
      headerName: 'DNI/RUT',
      flex: 1.5,
      minWidth: 120,
      sortable: true,
      filterable: true,
      renderCell: (params: RenderCellParams) => (
        <span className="text-sm font-mono">{params.row.dni}</span>
      ),
    },
    {
      field: 'productiveUnitName',
      headerName: 'Unidad Productiva',
      flex: 1.5,
      minWidth: 150,
      sortable: false,
      filterable: false,
      renderCell: (params: RenderCellParams) => (
        <span className="text-sm">{params.row.productiveUnitName || '-'}</span>
      ),
    },
    {
      field: 'pendingAdvances',
      headerName: 'Anticipos Pendientes',
      flex: 1.5,
      minWidth: 140,
      sortable: true,
      filterable: false,
      renderCell: (params: RenderCellParams) => (
        <span className="text-sm font-mono text-red-600">
          ${(params.row.pendingAdvances || 0).toLocaleString('es-CL')}
        </span>
      ),
    },
    {
      field: 'pendingReceptions',
      headerName: 'Recepciones Pendientes',
      flex: 1.5,
      minWidth: 140,
      sortable: true,
      filterable: false,
      renderCell: (params: RenderCellParams) => (
        <span className="text-sm font-mono text-green-600">
          ${(params.row.pendingReceptions || 0).toLocaleString('es-CL')}
        </span>
      ),
    },
    {
      field: 'balance',
      headerName: 'Saldo',
      flex: 1.5,
      minWidth: 120,
      sortable: true,
      filterable: false,
      renderCell: (params: RenderCellParams) => {
        const balance = params.row.balance || 0;
        const colorClass = balance >= 0 ? 'text-green-600' : 'text-red-600';
        const sign = balance >= 0 ? '+' : '';
        return (
          <span className={`text-sm font-mono font-bold ${colorClass}`}>
            {sign}${(Math.abs(balance)).toLocaleString('es-CL')}
          </span>
        );
      },
    },
    ...(has('PRODUCERS_UPDATE') || has('PRODUCERS_DELETE') ? [{
      field: 'actions',
      headerName: '',
      filterable: false,
      sortable: false,
      flex: 1.0,
      minWidth: 120,
      renderCell: (params: RenderCellParams) => (
        <div className="flex gap-1">
          <IconButton
            icon="more_horiz"
            variant="basicSecondary"
            aria-label={`Ver detalle de ${params.row.name}`}
            onClick={() => handleViewDetail(params.row)}
            tooltip="Ver detalle"
          />
          {has('PRODUCERS_UPDATE') && (
            <IconButton
              icon="edit"
              variant="basicSecondary"
              aria-label={`Editar productor ${params.row.name}`}
              onClick={() => handleEditClick(params.row)}
              data-test-id={`edit-producer-${params.row.id}`}
            />
          )}
          {has('PRODUCERS_DELETE') && (
            <IconButton
              icon="delete"
              variant="basicSecondary"
              aria-label={`Eliminar productor ${params.row.name}`}
              onClick={() => handleDeleteClick(params.row)}
              data-test-id={`delete-producer-${params.row.id}`}
            />
          )}
        </div>
      ),
    }] : []),
  ], [has, handleEditClick, handleDeleteClick]);

  // Form fields for update dialog
  const updateFormFields = [
    {
      id: 'producer-info',
      title: 'Información del Productor',
      columns: 1,
      fields: [
        {
          name: 'name',
          label: 'Nombre completo',
          type: 'text' as const,
          required: true,
          startIcon: 'person'
        },
        {
          name: 'dni',
          label: 'DNI/RUT',
          type: 'dni' as const,
          required: true,
          startIcon: 'badge'
        },
        {
          name: 'mail',
          label: 'Correo electrónico',
          type: 'email' as const,
          startIcon: 'mail'
        },
        {
          name: 'phone',
          label: 'Teléfono',
          type: 'text' as const,
          startIcon: 'phone'
        },
        {
          name: 'address',
          label: 'Dirección',
          type: 'text' as const,
          startIcon: 'location_on'
        }
      ]
    }
  ];

  return (
    <>
      <DataGrid
        columns={columns}
        rows={initialData.data}
        totalRows={initialData.totalRecords}
        height="80vh"
        showBorder={false}
        title={undefined}
        onExportExcel={handleExportExcel}
        createForm={
          has('PRODUCERS_CREATE') ? (
            <CreateProducerDialog
              onSuccess={handleCreateSuccess}
            />
          ) : undefined
        }
      />

      {/* Update Producer Dialog */}
      <UpdateProducerDialog
        open={openUpdateDialog}
        onClose={handleCloseDialogs}
        producer={selectedProducer}
        onSuccess={handleCreateSuccess}
      />

      {/* Delete Producer Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDialogs} title="" size="xs">
        {selectedProducer ? (
          <DeleteBaseForm
            message={`¿Está seguro que desea eliminar al productor "${selectedProducer.name}"? Esta acción no se puede deshacer.`}
            onSubmit={handleDeleteSubmit}
            isSubmitting={isSubmitting}
            cancelButton={true}
            cancelButtonText="Cancelar"
            onCancel={handleCloseDialogs}
            submitLabel="Eliminar Productor"
            title="Eliminar Productor"
          />
        ) : (
          <div className="text-center py-8 text-gray-500">
            No hay datos del productor para mostrar
          </div>
        )}
      </Dialog>

      {/* Producer Detail Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={handleCloseDetail} 
        title="" 
        size="xxl"
        scroll="body"
        hideActions
        showCloseButton={true}
      >
        {selectedProducerDetail ? (
          <div className="h-[80vh]">
            <ProducerDetailLayout
              data={selectedProducerDetail}
              onClose={handleCloseDetail}
              onRefresh={() => {
                if (selectedProducerDetail?.producer.id) {
                  // Refresh data logic could be added here if needed
                  // For now just re-fetch
                  handleViewDetail({ id: selectedProducerDetail.producer.id } as any);
                }
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
      </Dialog>
    </>
  );
}
