'use client';

import { useCallback, useMemo } from 'react';
import DataGrid, { type DataGridColumn } from '@/app/baseComponents/DataGrid/DataGrid';
import Badge from '@/app/baseComponents/Badge/Badge';
import { usePermissions } from '@/app/state/hooks/usePermissions';
import { useAlert } from '@/app/state/hooks/useAlert';
import type { AdvanceSummary, AdvancePaymentMethod } from '@/app/actions/advances';
import { formatAuditDate } from '@/lib/dateTimeUtils';
import { exportAdvancesToExcel } from '@/lib/excelExport';
import DetailButton from './DetailButton';
import PrintButton from './PrintButton';
import CreateAdvanceButton from './CreateAdvanceButton';
import DeleteAdvanceButton from './DeleteAdvanceButton';
import EditDateButton from './EditDateButton';

interface AdvancesGridProps {
  rows: AdvanceSummary[];
  onRefresh?: () => void;
}

const clpFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const paymentLabels: Record<AdvancePaymentMethod, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CHECK: 'Cheque',
};

function formatCLP(value: number): string {
  return clpFormatter.format(Number.isFinite(value) ? value : 0);
}

const AdvancesGrid = ({ rows, onRefresh }: AdvancesGridProps) => {
  const { has } = usePermissions();
  const { success, error: showError } = useAlert();

  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    }
  }, [onRefresh]);

  const handleExportExcel = useCallback(async () => {
    try {
      if (!rows || rows.length === 0) {
        showError('No hay datos para exportar');
        return;
      }

      const exportResult = exportAdvancesToExcel(rows);

      if (exportResult.success) {
        success(`Excel generado: ${exportResult.recordCount} registros exportados`);
      } else {
        showError(`Error al generar Excel: ${exportResult.error}`);
      }
    } catch (err: any) {
      console.error('Error exporting to Excel:', err);
      showError('Error inesperado al exportar a Excel');
    }
  }, [rows, success, showError]);

  const columns = useMemo<DataGridColumn[]>(
    () => [
      {
        field: 'transactionId',
        headerName: 'Folio',
        flex: 0.7,
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => <span className="font-mono text-xs text-foreground">{value}</span>,
      },
      {
        field: 'createdAt',
        headerName: 'Fecha',
        flex: 1,
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => <span>{value ? formatAuditDate(String(value)) : '—'}</span>,
      },
      {
        field: 'producerName',
        headerName: 'Productor',
        flex: 1.2,
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => <span className="truncate">{value || '—'}</span>,
      },
      {
        field: 'seasonName',
        headerName: 'Temporada',
        flex: 1,
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => <span className="truncate">{value || '—'}</span>,
      },
      {
        field: 'paymentMethod',
        headerName: 'Pago',
        flex: 0.8,
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => paymentLabels[(value as AdvancePaymentMethod) ?? 'CASH'],
      },
      {
        field: 'amount',
        headerName: 'Monto',
        flex: 1,
        sortable: true,
        filterable: false,
        renderCell: ({ value }) => formatCLP(Number(value) || 0),
      },
      {
        field: 'status',
        headerName: 'Estado',
        flex: 0.8,
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => {
          const status = value as string;
          const isSettled = status === 'APPLIED';
          return (
            <Badge variant={isSettled ? 'success' : 'warning'}>
              {isSettled ? 'Liquidado' : 'Pendiente'}
            </Badge>
          );
        },
      },
      {
        field: 'actions',
        headerName: '',
        width: 150,
        sortable: false,
        filterable: false,
        renderCell: ({ row }) => {
          const isSettled = row.status === 'APPLIED';
          return (
            <div className="flex gap-1">
              {has('ADVANCES_UPDATE_DATE') && (
                <EditDateButton
                  advanceId={row.id}
                  currentDate={row.createdAt}
                  producerName={row.producerName}
                  isSettled={isSettled}
                  onSuccess={handleRefresh}
                />
              )}
              {has('ADVANCES_DETAIL') && <DetailButton advanceId={row.id} />}
              {has('ADVANCES_PRINT_RECEIPT') && <PrintButton advanceId={row.id} />}
              <DeleteAdvanceButton
                advanceId={row.id}
                producerName={row.producerName}
                amountLabel={formatCLP(Number(row.amount) || 0)}
                advanceStatus={row.status}
                onSuccess={handleRefresh}
              />
            </div>
          );
        },
      },
    ],
    [has, handleRefresh],
  );

  return (
      <DataGrid
        title="Anticipos"
        columns={columns}
        rows={rows}
        totalRows={rows.length}
        height="85vh"
        showBorder={false}
        createForm={has('ADVANCES_CREATE') ? <CreateAdvanceButton onSuccess={handleRefresh} /> : undefined}
        createFormTitle="Crear anticipo"
        onExportExcel={handleExportExcel}
      />
  );
};

export default AdvancesGrid;
