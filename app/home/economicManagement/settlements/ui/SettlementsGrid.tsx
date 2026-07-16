'use client';

import { useCallback, useMemo } from 'react';
import DataGrid, { type DataGridColumn } from '@/app/baseComponents/DataGrid/DataGrid';
import Badge from '@/app/baseComponents/Badge/Badge';
import { usePermissions } from '@/app/state/hooks/usePermissions';
import { useAlert } from '@/app/state/hooks/useAlert';
import { formatAuditDate } from '@/lib/dateTimeUtils';
import { exportSettlementsToExcel } from '@/lib/excelExport';
import type { SettlementRow } from '@/app/actions/settlements';
import PrintSettlementButton from './PrintSettlementButton';
import DeleteSettlementButton from './DeleteSettlementButton';
import EditSettlementButton from './EditSettlementButton';
import EditSettlementDateButton from './EditSettlementDateButton';

interface SettlementsGridProps {
  rows: SettlementRow[];
}

const clpFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

function formatCLP(value: number): string {
  return clpFormatter.format(Number.isFinite(value) ? value : 0);
}

export default function SettlementsGrid({ rows }: SettlementsGridProps) {
  const { has } = usePermissions();
  const { success, error: showError } = useAlert();

  const handleExportExcel = useCallback(async () => {
    try {
      if (!rows || rows.length === 0) {
        showError('No hay datos para exportar');
        return;
      }

      const exportResult = exportSettlementsToExcel(rows);

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
        flex: 1.5,
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
        field: 'receptionsCount',
        headerName: 'Recepciones',
        flex: 0.8,
        sortable: true,
        filterable: false,
        renderCell: ({ value }) => <span className="text-center block w-full">{value}</span>,
      },
      {
        field: 'advancesCount',
        headerName: 'Anticipos',
        flex: 0.8,
        sortable: true,
        filterable: false,
        renderCell: ({ value }) => <span className="text-center block w-full">{value}</span>,
      },
      {
        field: 'amount',
        headerName: 'Monto Pago',
        flex: 1,
        sortable: true,
        filterable: false,
        renderCell: ({ value }) => <span className="font-semibold text-emerald-700">{formatCLP(Number(value) || 0)}</span>,
      },
      {
        field: 'status',
        headerName: 'Estado',
        flex: 0.8,
        sortable: true,
        filterable: true,
        renderCell: ({ value }) => {
          const status = value as string;
          return (
            <Badge variant={status === 'COMPLETED' ? 'success' : 'warning'}>
              {status === 'COMPLETED' ? 'Finalizada' : 'Borrador'}
            </Badge>
          );
        },
      },
      {
        field: 'actions',
        headerName: '',
        flex: 0.8,
        sortable: false,
        filterable: false,
        actionComponent: ({ row }) => (
          <div className="flex justify-end w-full gap-2">
            {row.status === 'DRAFT' && has('SETTLEMENTS_UPDATE_DATE') && (
              <EditSettlementDateButton
                settlementId={row.id}
                currentDate={row.createdAt}
                producerName={row.producerName}
              />
            )}
            {row.status === 'DRAFT' && has('SETTLEMENTS_UPDATE') && (
              <EditSettlementButton settlementId={row.id} />
            )}
            {has('SETTLEMENTS_PRINT_DETAIL') && (
              <PrintSettlementButton settlementId={row.id} />
            )}
            {has('SETTLEMENTS_DELETE') && (
              <DeleteSettlementButton settlementId={row.id} folio={row.transactionId} />
            )}
          </div>
        ),
      },
    ],
    [has],
  );

  return (
    <DataGrid
      title="Liquidaciones"
      columns={columns}
      rows={rows}
      totalRows={rows.length}
      height="80vh"
      showBorder={false}
      onExportExcel={handleExportExcel}
    />
  );
}
