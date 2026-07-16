'use client';

import { useMemo, useCallback } from 'react';
import DataGrid, { type DataGridColumn } from '@/app/baseComponents/DataGrid/DataGrid';
import { usePermissions } from '@/app/state/hooks/usePermissions';
import type { CustomerGridRow } from '@/app/actions/customers';
import CreateCustomerDialog from './CreateCustomerDialog';
import UpdateCustomerDialog from './UpdateCustomerDialog';
import DeleteCustomerDialog from './DeleteCustomerDialog';
import { exportCustomersToExcel } from '@/lib/excelExport';
import { useAlert } from '@/app/state/contexts/AlertContext';

interface CustomersGridProps {
  rows: CustomerGridRow[];
  totalRows: number;
  currentLimit: number;
  currentSort?: 'ASC' | 'DESC';
  currentSortField?: string;
  currentSearch?: string;
  currentFilters?: string;
}

interface RenderCellParams {
  row: CustomerGridRow;
}

export default function CustomersGrid({
  rows,
  totalRows,
  currentLimit,
  currentSort,
  currentSortField,
  currentSearch,
  currentFilters,
}: CustomersGridProps) {
  const { has } = usePermissions();
  const { showAlert } = useAlert();

  const handleCreateSuccess = () => {
    // Refresh the page to show the new customer
    window.location.reload();
  };

  const handleExportExcel = useCallback(async () => {
    const result = exportCustomersToExcel(rows);
    if (result.success) {
      showAlert({
        type: 'success',
        message: `Se exportaron ${result.recordCount} clientes a ${result.fileName}`,
      });
    } else {
      showAlert({
        type: 'error',
        message: result.error || 'Error desconocido al exportar a Excel',
      });
    }
  }, [rows, showAlert]);

  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Nombre',
        flex: 1.8,
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => <span className="text-sm font-medium text-foreground">{value ?? 'No disponible'}</span>,
      },
      {
        field: 'dni',
        headerName: 'RUT',
        flex: 1.2,
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => <span className="font-mono text-xs text-foreground">{value ?? '-'}</span>,
      },
      {
        field: 'phone',
        headerName: 'Teléfono',
        flex: 1.2,
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => <span className="text-foreground">{value ?? '-'}</span>,
      },
      {
        field: 'mail',
        headerName: 'Email',
        flex: 1.4,
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => <span className="text-foreground">{value ?? '-'}</span>,
      },
      {
        field: 'address',
        headerName: 'Dirección',
        flex: 1.6,
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => <span className="text-foreground">{value ?? '-'}</span>,
      },
      ...(has('CUSTOMERS_UPDATE') || has('CUSTOMERS_DELETE') ? [{
        field: 'actions',
        headerName: '',
        flex: 1.0,
        minWidth: 120,
        renderCell: (params: RenderCellParams) => (
          <div className="flex items-center gap-1">
            {has('CUSTOMERS_UPDATE') && (
              <UpdateCustomerDialog
                customer={params.row}
                onSuccess={handleCreateSuccess}
              />
            )}
            {has('CUSTOMERS_DELETE') && (
              <DeleteCustomerDialog
                customer={params.row}
                onSuccess={handleCreateSuccess}
              />
            )}
          </div>
        ),
      }] : []),
    ],
    [has],
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
        height="75vh"
        title=""
        showBorder={false}
        onExportExcel={handleExportExcel}
        createForm={
          has('CUSTOMERS_CREATE') ? (
            <CreateCustomerDialog
              onSuccess={handleCreateSuccess}
            />
          ) : undefined
        }
      />
    </>
  );
}