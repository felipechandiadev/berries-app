"use client";

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DataGrid from '@/app/baseComponents/DataGrid/DataGrid';
import { useRef } from 'react';
import { useAlert } from '@/app/state/contexts/AlertContext';
import { usePermissions } from '@/app/state/hooks/usePermissions';
import {
  getReceptionsExportData,
  getReceptionPrintData,
  type ReceptionGridRow,
  type ReceptionsGridFilters,
} from '@/app/actions/receptions';
import { exportReceptionsToExcel } from '@/lib/excelExport';
import { formatAuditDate } from '@/lib/dateTimeUtils';
import DetailReceptionButton from './DetailReceptionButton';
import DeleteReceptionButton from './DeleteReceptionButton';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import PrintReceptionDialog from '@/app/home/receptions/simple/ui/PrintReceptionDialog';
import PrintMultipackReceptionDialog from '@/app/home/receptions/multipack/ui/PrintMultipackReceptionDialog';
import type { ReceptionDataSnapshot } from '@/app/home/receptions/simple/ui/TransactionData';
import Badge from '@/app/baseComponents/Badge/Badge';
import { Button } from '@/app/baseComponents/Button/Button';

type SortDirection = 'ASC' | 'DESC';

const numberFormatter = new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 2,
});

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const usdFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

interface ReceptionsGridProps {
  initialData: ReceptionGridRow[];
  totalRows: number;
  currentLimit: number;
  currentSort?: SortDirection;
  currentSortField?: string;
  currentSearch?: string;
  currentFilters?: string;
}

export default function ReceptionsGrid({
  initialData,
  totalRows,
  currentLimit,
  currentSort,
  currentSortField,
  currentSearch,
  currentFilters,
}: ReceptionsGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showAlert } = useAlert();
  const { has } = usePermissions();
  const [isExporting, setIsExporting] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printSnapshot, setPrintSnapshot] = useState<ReceptionDataSnapshot | null>(null);
  const [printReceptionId, setPrintReceptionId] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState<'single' | 'multi'>('single');
  const [loadingPrintId, setLoadingPrintId] = useState<string | null>(null);
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string | number>>(new Set());

  const handleRefresh = () => {
    router.replace(window.location.pathname + window.location.search);
  };

  // Toggle expandir/colapsar una fila
  const toggleRowExpanded = (rowId: string | number) => {
    setExpandedRowIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };

  const handleExportExcel = async () => {
    if (isExporting) {
      return;
    }

    try {
      setIsExporting(true);
      showAlert({ message: 'Preparando exportación...', type: 'info', duration: 3000 });

      const search = searchParams.get('search') || undefined;
      const filtersParam = searchParams.get('filters') || undefined;
      const sortField = searchParams.get('sortField') || currentSortField || 'createdAt';
      const sort = (searchParams.get('sort') || currentSort || 'desc').toString();

      const exportFilters: ReceptionsGridFilters = {
        search,
        filters: filtersParam,
        sortBy: sortField,
        sortOrder: sort.toLowerCase() as 'asc' | 'desc',
        filtration: !!filtersParam,
      };

      const result = await getReceptionsExportData(exportFilters);

      if (!result.success) {
        showAlert({
          message: result.error || 'Error al exportar recepciones',
          type: 'error',
          duration: 5000,
        });
        return;
      }

      if (!result.data || result.data.length === 0) {
        showAlert({
          message: 'No hay datos para exportar',
          type: 'warning',
          duration: 4000,
        });
        return;
      }

      const exportResult = exportReceptionsToExcel(result.data);

      if (exportResult.success) {
        showAlert({
          message: `Exportados ${exportResult.recordCount} registros exitosamente`,
          type: 'success',
          duration: 4000,
        });
      } else {
        showAlert({
          message: `Error al generar Excel: ${exportResult.error}`,
          type: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error exporting receptions to Excel:', error);
      showAlert({
        message: 'Error inesperado al exportar recepciones',
        type: 'error',
        duration: 5000,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenPrintDialog = async (reception: ReceptionGridRow) => {
    const receptionId = String(reception.id);

    if (loadingPrintId) {
      return;
    }

    setPrintSnapshot(null);
    setPrintReceptionId(null);
    setPrintMode(reception.multiPack ? 'multi' : 'single');
    setLoadingPrintId(receptionId);

    try {
      const result = await getReceptionPrintData(receptionId);

      if (!result.success || !result.data) {
        showAlert({
          message: result.error || 'No fue posible preparar el recibo de impresión.',
          type: 'error',
          duration: 5000,
        });
        return;
      }

      setPrintSnapshot(result.data.snapshot as ReceptionDataSnapshot);
      setPrintReceptionId(result.data.receptionTransactionId ?? receptionId);
      setPrintDialogOpen(true);
    } catch (error) {
      console.error('[ReceptionsGrid] Error loading print data:', error);
      showAlert({
        message: 'Error inesperado al preparar la impresión de la recepción.',
        type: 'error',
        duration: 5000,
      });
    } finally {
      setLoadingPrintId((current) => (current === receptionId ? null : current));
    }
  };

  const handleClosePrintDialog = () => {
    setPrintDialogOpen(false);
  };

  // Contenido expandible para recepciones multipack
  const expandableRowContent = (row: ReceptionGridRow) => {
    if (!row.multiPack || !Array.isArray(row.packs)) return null;

    return (
      <div className="space-y-2">
        {row.packs.map((pack: any, index: number) => (
          <div key={pack.id || pack.packNumber || index} className="border border-gray-200 rounded p-3 bg-gray-50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div><strong>Pack #{pack.packNumber || index + 1}</strong></div>
              <div>Variedad: {pack.varietyName || '—'}</div>
              <div>Formato: {pack.formatName || '—'}</div>
              <div>Bandejas: {pack.traysQuantity || 0}</div>
              <div>Peso Bruto: {numberFormatter.format(pack.grossWeightKg || 0)} kg</div>
              <div>Peso Neto: {numberFormatter.format(pack.netWeightKg || 0)} kg</div>
              <div>A Pagar: {currencyFormatter.format(pack.totalToPay || 0)}</div>
              <div>Moneda: {pack.currency || 'CLP'}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Agrega una columna de expansión visual para multipack
  const columns = [
    {
      field: 'multiPack',
      headerName: 'Multi-Pack',
      flex: 0.2,
      sortable: false,
      filterable: true,
      align: 'center' as const,
      renderCell: ({ value }: { value: boolean }) => (
        <span>{value ? '✔️' : '❌'}</span>
      ),
    },
    {
      field: 'id',
      headerName: 'Folio',
      flex: 0.3,
      sortable: true,
      filterable: true,
      renderCell: ({ value }: { value: string | number }) => (
        <span className="font-mono text-xs truncate">{value ?? '—'}</span>
      ),
    },
    {
      field: 'producerName',
      headerName: 'Productor',
      flex: 1.8,
      sortable: true,
      filterable: true,
    },
    {
      field: 'createdAt',
      headerName: 'Fecha/Hora',
      flex: 0.8,
      sortable: true,
      filterable: true,
      renderCell: ({ value }: { value: string }) => (
        <span>{value ? formatAuditDate(value) : '—'}</span>
      ),
    },
    {
      field: 'varieties',
      headerName: 'Variedad',
      flex: 1,
      sortable: true,
      filterable: true,
      renderCell: ({ value }: { value: string[] }) => (
        <span className="truncate">{Array.isArray(value) && value.length ? value.join(', ') : '—'}</span>
      ),
    },
    {
      field: 'formats',
      headerName: 'Formato',
      flex: 1,
      sortable: true,
      filterable: true,
      renderCell: ({ value }: { value: string[] }) => (
        <span className="truncate">{Array.isArray(value) && value.length ? value.join(', ') : '—'}</span>
      ),
    },
    {
      field: 'totalTrays',
      headerName: 'Bandejas',
      flex: 0.7,
      sortable: true,
      filterable: false,
      align: 'left' as const,
      renderCell: ({ value }: { value: number }) => (
        <span>{numberFormatter.format(Number(value) || 0)}</span>
      ),
    },
    {
      field: 'grossWeightKg',
      headerName: 'Bruto (kg)',
      flex: 0.7,
      sortable: true,
      filterable: false,
      align: 'left' as const,
      renderCell: ({ value }: { value: number }) => (
        <span>{numberFormatter.format(Number(value) || 0)}</span>
      ),
    },
    {
      field: 'netWeightKg',
      headerName: 'Neto (kg)',
      flex: 0.7,
      sortable: true,
      filterable: false,
      align: 'left' as const,
      renderCell: ({ value }: { value: number }) => (
        <span>{numberFormatter.format(Number(value) || 0)}</span>
      ),
    },
    {
      field: 'paymentSummary',
      headerName: 'A PAGAR',
      flex: 1,
      sortable: false,
      filterable: false,
      align: 'left' as const,
      renderCell: ({ row }: { row: ReceptionGridRow }) => (
        <div className="py-1 space-y-0.5 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">CLP:</span>
            <span className="font-medium">{currencyFormatter.format(Number(row.payableCLP) || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">USD:</span>
            <span className="font-medium">{usdFormatter.format(Number(row.payableUSD) || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Cambio:</span>
            <span className="font-medium">{numberFormatter.format(Number(row.exchangeRate) || 0)}</span>
          </div>
          <div className="flex justify-between border-t pt-0.5">
            <span className="text-gray-800 font-semibold">Total:</span>
            <span className="font-bold text-green-700">{currencyFormatter.format(Number(row.totalCLP) || 0)}</span>
          </div>
        </div>
      ),
    },
    {
      field: 'isSettled',
      headerName: 'Estado',
      flex: 0.8,
      sortable: false,
      filterable: true,
      align: 'left' as const,
      renderCell: ({ value }: { value: boolean }) => (
        value ? (
          <Badge variant="success">
            Liquidada
          </Badge>
        ) : (
          <div className="inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
            <div className="text-center leading-tight text-xs">
              <div>Liquidación</div>
              <div>Pendiente</div>
            </div>
          </div>
        )
      ),
    },

    {
      field: 'actions',
      headerName: '',
      flex: 0.8,
      sortable: false,
      filterable: false,
      actionComponent: ({ row }: { row: ReceptionGridRow }) => (
        <div className="flex gap-1">
          <DetailReceptionButton reception={row} />
          {has('RECEPTIONS_PRINT_DETAIL') && (
            <IconButton
              icon={loadingPrintId === row.id ? 'hourglass_top' : 'print'}
              variant="basicSecondary"
              size="xs"
              title="Imprimir recibo"
              ariaLabel="Imprimir recibo"
              disabled={loadingPrintId === row.id}
              onClick={() => handleOpenPrintDialog(row)}
            />
          )}
          {has('RECEPTIONS_DELETE') && (
            <DeleteReceptionButton reception={row} onSuccess={handleRefresh} />
          )}
        </div>
      ),
    },
  ];

  const CreateReceptionForm = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Crear Nueva Recepción</h3>
      <p className="text-sm text-gray-600">Selecciona el tipo de recepción que deseas crear:</p>
      <div className="flex gap-4">
        <Button
          variant="primary"
          onClick={() => router.push('/home/receptions/simple')}
          className="flex-1"
        >
          Recepción Simple
        </Button>
        <Button
          variant="secondary"
          onClick={() => router.push('/home/receptions/multipack')}
          className="flex-1"
        >
          Recepción Multipack
        </Button>
      </div>
    </div>
  );

  return (
    <div >
      <DataGrid
        columns={columns}
        rows={initialData}
        limit={currentLimit}
        totalRows={totalRows}
        onExportExcel={handleExportExcel}
        sort={currentSort?.toLowerCase() as 'asc' | 'desc' | undefined}
        sortField={currentSortField}
        search={currentSearch}
        filters={currentFilters}
        height={'85vh'}
        showBorder={false}
        expandable={true}
        expandableRowContent={expandableRowContent}
        expandedRowIds={expandedRowIds}
        onToggleExpand={toggleRowExpanded}
        createForm={<CreateReceptionForm />}
        createFormTitle="Crear Recepción"
      />

      <PrintReceptionDialog
        open={printDialogOpen && printMode === 'single'}
        onClose={handleClosePrintDialog}
        snapshot={printSnapshot}
        receptionTransactionId={printReceptionId}
      />
      <PrintMultipackReceptionDialog
        open={printDialogOpen && printMode === 'multi'}
        onClose={handleClosePrintDialog}
        snapshot={printSnapshot}
        receptionTransactionId={printReceptionId}
      />
    </div>
  );
}
