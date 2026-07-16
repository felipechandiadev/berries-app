'use client';

import { useMemo, useState } from 'react';
import DataGrid, { type DataGridColumn } from '@/app/baseComponents/DataGrid/DataGrid';
import { usePermissions } from '@/app/state/hooks/usePermissions';
import { formatAuditDateLocaleES } from '@/lib/dateTimeUtils';
import type { DispatchGridRow } from '@/app/actions/dispatches';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import { DispatchDetailDialog } from './DispatchDetail/DispatchDetailDialog';

const netWeightFormatter = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const clpFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCurrency(amount: number, currency: 'CLP' | 'USD') {
  if (!Number.isFinite(amount)) {
    return '-';
  }

  return currency === 'USD'
    ? usdFormatter.format(amount)
    : clpFormatter.format(amount);
}

interface DispatchesGridProps {
  rows: DispatchGridRow[];
  totalRows: number;
  currentLimit: number;
  currentSort?: 'ASC' | 'DESC';
  currentSortField?: string;
  currentSearch?: string;
  currentFilters?: string;
}

export default function DispatchesGrid({
  rows,
  totalRows,
  currentLimit,
  currentSort,
  currentSortField,
  currentSearch,
  currentFilters,
}: DispatchesGridProps) {
  const [selectedDispatchId, setSelectedDispatchId] = useState<string | null>(null);
  const { has } = usePermissions();

  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: 'id',
        headerName: 'ID',
        flex: 0.7,
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => <span className="font-mono text-xs text-foreground">{value ?? '-'}</span>,
      },
      {
        field: 'createdAt',
        headerName: 'Fecha',
        type: 'dateTime',
        flex: 1.3,
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => (
          <span className="text-sm text-foreground">{value ? formatAuditDateLocaleES(value as string) : '-'}</span>
        ),
      },
      {
        field: 'clientName',
        headerName: 'Cliente',
        flex: 1.8,
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => <span className="text-sm font-medium text-foreground">{value ?? 'No disponible'}</span>,
      },
      {
        field: 'clientRut',
        headerName: 'RUT',
        flex: 1.2,
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => <span className="font-mono text-xs text-foreground">{value ?? '-'}</span>,
      },
      {
        field: 'varietyName',
        headerName: 'Variedad',
        flex: 1.4,
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => <span className="text-foreground">{value ?? '-'}</span>,
      },
      {
        field: 'formatName',
        headerName: 'Formato',
        flex: 1.4,
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => <span className="text-foreground">{value ?? '-'}</span>,
      },
      {
        field: 'palletsCount',
        headerName: 'Pallets',
        type: 'number',
        flex: 0.9,
        align: 'left',
        headerAlign: 'left',
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => <span className="text-foreground">{Number(value || 0).toLocaleString('es-CL')}</span>,
      },
      {
        field: 'totalNetWeight',
        headerName: 'Peso neto (kg)',
        type: 'number',
        flex: 1.3,
        align: 'left',
        headerAlign: 'left',
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => <span className="text-foreground">{netWeightFormatter.format(Number(value || 0))}</span>,
      },
      {
        field: 'pricePerKg',
        headerName: 'Precio por kg',
        type: 'number',
        flex: 1.4,
        align: 'left',
        headerAlign: 'left',
        sortable: true,
        filterable: true,
        renderCell: ({ row }) => (
          <span className="font-mono text-sm text-foreground">
            {formatCurrency(Number(row.pricePerKg || 0), row.currency)}
          </span>
        ),
      },
      {
        field: 'totalAmount',
        headerName: 'Total venta',
        type: 'number',
        flex: 1.5,
        align: 'left',
        headerAlign: 'left',
        sortable: true,
        filterable: true,
        renderCell: ({ row }) => (
          <span className="font-mono text-sm text-foreground">
            {formatCurrency(Number(row.totalAmount || 0), row.currency)}
          </span>
        ),
      },
      {
        field: 'actions',
        headerName: '',
        flex: 0.6,
        sortable: false,
        filterable: false,
        renderCell: ({ row }) => (
          <IconButton
            icon="more_horiz"
            variant="basicSecondary"
            size="sm"
            onClick={() => setSelectedDispatchId(row.id)}
            title="Ver detalles"
            ariaLabel="Ver detalles"
          />
        ),
      },
    ],
    [],
  );

  return (
    <>
      <DataGrid
        columns={columns}
        rows={rows}
        totalRows={totalRows}
        limit={currentLimit}
        sort={currentSort ? (currentSort.toLowerCase() as 'asc' | 'desc') : undefined}
        sortField={currentSortField}
        search={currentSearch}
        filters={currentFilters}
        height="80vh"
        title="Registro de despachos"
        showBorder={false}
      />

      <div className="mt-0">
        <DispatchDetailDialog
          open={!!selectedDispatchId}
          onClose={() => setSelectedDispatchId(null)}
          dispatchId={selectedDispatchId}
        />
      </div>
    </>
  );
}
