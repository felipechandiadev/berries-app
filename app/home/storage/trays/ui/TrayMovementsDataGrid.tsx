'use client';

// Tray movements DataGrid component

import { useMemo, useCallback } from 'react';
import DataGrid, { DataGridColumn } from '@/app/baseComponents/DataGrid/DataGrid';
import { formatAuditDate } from '@/lib/dateTimeUtils';
import type { TrayTransactionRow } from '@/app/actions/transactions';
import { translateTransactionType } from '@/lib/transactionUtils';
import DetailTrayTransaction from './DetailTrayTransaction';
import { exportTrayMovementsToExcel } from '@/lib/excelExport';
import { useAlert } from '@/app/state/contexts/AlertContext';

interface TrayMovementsDataGridProps {
  data: TrayTransactionRow[];
  totalRows?: number;
  page?: number;
  limit?: number;
  sort?: 'asc' | 'desc';
  sortField?: string;
  search?: string;
  filters?: string;
}

interface RenderCellParams {
  row: TrayTransactionRow;
}

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export default function TrayMovementsDataGrid({ 
  data, 
  totalRows = 0,
  page = 1,
  limit = 25,
  sort,
  sortField,
  search,
  filters,
}: TrayMovementsDataGridProps) {
  const { showAlert } = useAlert();

  const handleExportExcel = useCallback(async () => {
    const result = exportTrayMovementsToExcel(data);
    if (result.success) {
      showAlert({
        type: 'success',
        message: `Se exportaron ${result.recordCount} movimientos a ${result.fileName}`,
      });
    } else {
      showAlert({
        type: 'error',
        message: result.error || 'Error desconocido al exportar a Excel',
      });
    }
  }, [data, showAlert]);

  const columns: DataGridColumn[] = useMemo(() => [
    {
      field: 'id',
      headerName: 'Folio',
      flex: 0.8,
      minWidth: 90,
      sortable: true,
      filterable: true,
      renderCell: (params: RenderCellParams) => (
        <span className="font-mono text-xs text-foreground">{params.row.id}</span>
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Fecha',
      flex: 1.2,
      minWidth: 130,
      sortable: true,
      filterable: true,
      renderCell: (params: RenderCellParams) => (
        <span className="text-sm">{formatAuditDate(params.row.createdAt)}</span>
      ),
    },
    {
      field: 'type',
      headerName: 'Tipo',
      flex: 2.0,
      minWidth: 200,
      sortable: true,
      filterable: true,
      renderCell: (params: RenderCellParams) => (
        <span className="text-sm font-medium">{params.row.type}</span>
      ),
    },
    {
      field: 'direction',
      headerName: 'Flujo',
      flex: 1.0,
      minWidth: 110,
      sortable: true,
      filterable: true,
      renderCell: (params: RenderCellParams) => (
        <span className={`text-sm font-medium ${params.row.direction === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
          {params.row.direction === 'IN' ? 'Entrada' : 'Salida'}
        </span>
      ),
    },
    {
      field: 'amount',
      headerName: 'Cantidad',
      flex: 1.0,
      minWidth: 110,
      sortable: true,
      filterable: true,
      renderCell: (params: RenderCellParams) => (
        <span className="text-sm font-semibold">{currencyFormatter.format(params.row.amount)}</span>
      ),
    },
    {
      field: 'trayName',
      headerName: 'Bandeja',
      flex: 1.8,
      minWidth: 180,
      sortable: true,
      filterable: true,
      renderCell: (params: RenderCellParams) => (
        <span className="text-sm">{params.row.trayName}</span>
      ),
    },
    {
      field: 'counterpartyName',
      headerName: 'Contraparte',
      flex: 2.0,
      minWidth: 200,
      sortable: true,
      filterable: true,
      renderCell: (params: RenderCellParams) => (
        <span className="text-sm">{params.row.counterpartyName}</span>
      ),
    },
    {
      field: 'stockBefore',
      headerName: 'Stock Anterior',
      flex: 1.2,
      minWidth: 130,
      sortable: true,
      filterable: true,
      renderCell: (params: RenderCellParams) => (
        <span className="text-sm font-mono">
          {params.row.stockBefore !== undefined ? params.row.stockBefore.toLocaleString('es-CL') : '—'}
        </span>
      ),
    },
    {
      field: 'stockAfter',
      headerName: 'Stock Nuevo',
      flex: 1.2,
      minWidth: 130,
      sortable: true,
      filterable: true,
      renderCell: (params: RenderCellParams) => (
        <span className="text-sm font-mono">
          {params.row.stockAfter !== undefined ? params.row.stockAfter.toLocaleString('es-CL') : '—'}
        </span>
      ),
    },
    {
      field: 'actions',
      headerName: '',
      flex: 0.8,
      minWidth: 90,
      sortable: false,
      filterable: false,
      renderCell: (params: RenderCellParams) => (
        <DetailTrayTransaction transaction={params.row} />
      ),
    },
  ], []);

  if (!data.length) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-secondary">
        <p>No se encontraron movimientos de bandejas.</p>
      </div>
    );
  }

  return (
    <DataGrid
      columns={columns}
      rows={data}
      totalRows={totalRows}
      sort={sort}
      sortField={sortField}
      search={search}
      filters={filters}
      limit={limit}
      height="70vh"
      showBorder={false}
      title="Movimientos de Bandejas"
      onExportExcel={handleExportExcel}
    />
  );
}