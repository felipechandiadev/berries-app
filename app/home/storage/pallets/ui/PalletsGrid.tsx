'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DataGrid, { type DataGridColumn } from '@/app/baseComponents/DataGrid/DataGrid';
import { useAlert } from '@/app/state/contexts/AlertContext';
import { getPalletsExportData, type PalletGridFilters } from '@/app/actions/pallets';
import { exportPalletsToExcel } from '@/lib/excelExport';
import { formatAuditDateLocaleES } from '@/lib/dateTimeUtils';
import CreatePalletButton from './CreatePalletButton';
import UpdatePalletButton from './UpdatePalletButton';
import DeletePalletButton from './DeletePalletButton';
import TransferTraysButton from './TransferTraysButton';
import PalletDetailButton from './PalletDetailButton';
import ClosePalletButton from './ClosePalletButton';
import PalletStatusBadge, { getPalletStatusLabel } from './PalletStatusBadge';
import type { PalletRow } from './types';
import { PalletStatus } from '@/data/entities/Pallet';

interface PalletsGridProps {
  initialData: PalletRow[];
  totalRows: number;
  currentPage: number;
  currentLimit: number;
  currentSort?: 'ASC' | 'DESC';
  currentSortField?: string;
  currentSearch?: string;
  currentFilters?: string;
}

const integerFormatter = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const weightFormatter = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

export default function PalletsGrid({
  initialData,
  totalRows,
  currentPage: _currentPage,
  currentLimit,
  currentSort,
  currentSortField,
  currentSearch,
  currentFilters,
}: PalletsGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showAlert } = useAlert();
  const [isExporting, setIsExporting] = useState(false);

  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleExportExcel = useCallback(async () => {
    if (isExporting) {
      return;
    }

    try {
      setIsExporting(true);
      showAlert({ message: 'Preparando exportación...', type: 'info', duration: 3000 });

      const search = searchParams.get('search') || undefined;
      const filtersParam = searchParams.get('filters') || undefined;
      const sortField = searchParams.get('sortField') || 'createdAt';
      const sort = (searchParams.get('sort') || 'desc').toLowerCase() as 'asc' | 'desc';
      const filtration = searchParams.get('filtration') === 'true';

      const exportFilters: PalletGridFilters = {
        search,
        filters: filtersParam,
        sortBy: sortField,
        sortOrder: sort,
        filtration,
      };

      const result = await getPalletsExportData(exportFilters);

      if (!result.success) {
        showAlert({ message: result.error || 'Error al exportar', type: 'error', duration: 5000 });
        return;
      }

      if (!result.data || result.data.length === 0) {
        showAlert({ message: 'No hay datos para exportar', type: 'warning', duration: 4000 });
        return;
      }

      const exportResult = exportPalletsToExcel(result.data);

      if (exportResult.success) {
        showAlert({
          message: `Exportados ${exportResult.recordCount} pallets exitosamente`,
          type: 'success',
          duration: 4000,
        });
      } else {
        showAlert({ message: exportResult.error || 'Error al generar Excel', type: 'error', duration: 5000 });
      }
    } catch (error) {
      console.error('[PalletsGrid] Error exportando pallets:', error);
      showAlert({ message: 'Error inesperado al exportar', type: 'error', duration: 5000 });
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, searchParams, showAlert]);

  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: 'id',
        headerName: 'ID',
        flex: 0.8,
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => <span className="font-mono text-xs truncate">{value ?? '-'}</span>,
      },
      {
        field: 'storageName',
        headerName: 'Almacenamiento',
        flex: 1.2,
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => <span className="truncate">{value || '-'}</span>,
      },
      {
        field: 'trayName',
        headerName: 'Bandeja',
        flex: 1.2,
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => <span className="truncate">{value || '-'}</span>,
      },
      {
        field: 'traysQuantity',
        headerName: 'Bandejas',
        type: 'number',
        align: 'right',
        headerAlign: 'right',
        flex: 0.7,
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => <span>{integerFormatter.format(Number(value || 0))}</span>,
      },
      {
        field: 'capacity',
        headerName: 'Capacidad',
        type: 'number',
        align: 'right',
        headerAlign: 'right',
        flex: 0.7,
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => <span>{integerFormatter.format(Number(value || 0))}</span>,
      },
      {
        field: 'fillProgress',
        headerName: 'Utilizado',
        flex: 0.8,
        sortable: false,
        filterable: false,
        renderCell: ({ row }) => {
          const traysQuantity = Number(row.traysQuantity || 0);
          const capacity = Number(row.capacity || 0);
          const percentage = capacity > 0 ? (traysQuantity / capacity) * 100 : 0;
          
          return (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    percentage >= 100 ? 'bg-red-500' :
                    percentage >= 80 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[35px]">
                {Math.round(percentage)}%
              </span>
            </div>
          );
        },
      },
      {
        field: 'weight',
        headerName: 'Peso inicial (kg)',
        type: 'number',
        align: 'right',
        headerAlign: 'right',
        flex: 0.9,
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => <span>{weightFormatter.format(Number(value || 0))}</span>,
      },
      {
        field: 'packsNetWeight',
        headerName: 'Neto packs (kg)',
        type: 'number',
        align: 'right',
        headerAlign: 'right',
        flex: 0.9,
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => <span>{weightFormatter.format(Number(value || 0))}</span>,
      },
      {
        field: 'dispatchWeight',
        headerName: 'Neto despacho (kg)',
        type: 'number',
        align: 'right',
        headerAlign: 'right',
        flex: 0.9,
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => <span>{weightFormatter.format(Number(value || 0))}</span>,
      },
      {
        field: 'merma',
        headerName: 'Merma (kg)',
        type: 'number',
        align: 'right',
        headerAlign: 'right',
        flex: 0.8,
        sortable: false,
        filterable: false,
        renderCell: ({ row }: { row: PalletRow }) => {
          const packsNet = Number(row.packsNetWeight || 0);
          const dispatchNet = Number(row.dispatchWeight || 0);
          const hasDispatch =
            row.status === PalletStatus.DISPATCHED || dispatchNet > 0;
          if (!hasDispatch) {
            return <span>-</span>;
          }
          const merma = Number((packsNet - dispatchNet).toFixed(3));
          return <span>{weightFormatter.format(merma)}</span>;
        },
      },
      {
        field: 'status',
        headerName: 'Estado',
        flex: 1,
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => (
          <PalletStatusBadge status={(value as PalletStatus) ?? PalletStatus.AVAILABLE} />
        ),
      },
      {
        field: 'updatedAt',
        headerName: 'Actualizado',
        type: 'dateTime',
        flex: 1.0,
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => (
          <span>{value ? formatAuditDateLocaleES(value as string) : '-'}</span>
        ),
      },
      {
        field: 'actions',
        headerName: '',
        flex: 1.2,
        sortable: false,
        actionComponent: ({ row }: { row: PalletRow }) => {
          const isDispatched = row.status === PalletStatus.DISPATCHED;
          
          return (
            <div className="flex gap-1">
              {/* El botón de detalle siempre está visible */}
              <PalletDetailButton pallet={row} />
              
              {/* Estas acciones solo están disponibles si NO está despachado */}
              {!isDispatched && (
                <>
                  <ClosePalletButton pallet={row} onSuccess={handleRefresh} />
                  <TransferTraysButton pallet={row} onSuccess={handleRefresh} />
                  <UpdatePalletButton pallet={row} onSuccess={handleRefresh} />
                  <DeletePalletButton pallet={row} onSuccess={handleRefresh} />
                </>
              )}
            </div>
          );
        },
      },
    ],
    [handleRefresh]
  );

  return (
    <DataGrid
      columns={columns}
      rows={initialData}
      limit={currentLimit}
      totalRows={totalRows}
      sort={currentSort?.toLowerCase() as 'asc' | 'desc' | undefined}
      sortField={currentSortField}
      search={currentSearch}
      filters={currentFilters}
      height={'85vh'}
      createForm={<CreatePalletButton onSuccess={handleRefresh} />}
      onExportExcel={handleExportExcel}
      title="Gestión de Pallets"
      showBorder={false}
    />
  );
}
