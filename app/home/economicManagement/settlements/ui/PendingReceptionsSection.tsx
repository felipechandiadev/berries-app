'use client';

import type { Option } from '@/app/baseComponents/AutoComplete/AutoComplete';
import type { PendingReceptionsResult } from '@/app/actions/settlements';
import PendingReceptionsFilters from './PendingReceptionsFilters';
import PendingReceptionsTable from './PendingReceptionsTable';
import MonthFilter from './MonthFilter';
import { MONTH_FILTER_ALL, type MonthFilterOption } from '@/lib/monthFilter';

interface PendingReceptionsSectionProps {
  producerOptions: Option[];
  selectedProducerId?: string;
  data: PendingReceptionsResult;
  monthOptions: MonthFilterOption[];
  monthFilter: string;
  onMonthChange: (value: string) => void;
  selectedIds: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
  producerDisabled?: boolean;
  onBulkExchangeRateClick?: () => void;
  canBulkUpdateExchangeRate?: boolean;
  bulkExchangeRateLoading?: boolean;
}

const emptyStateClass = 'rounded-lg border border-dashed border-border bg-muted/20 p-6 text-sm text-secondary';

export default function PendingReceptionsSection({
  producerOptions,
  selectedProducerId,
  data,
  monthOptions,
  monthFilter,
  onMonthChange,
  selectedIds,
  onToggle,
  producerDisabled = false,
  onBulkExchangeRateClick,
  canBulkUpdateExchangeRate = false,
  bulkExchangeRateLoading = false,
}: PendingReceptionsSectionProps) {
  const hasSelection = Boolean(selectedProducerId);
  const hasRows = data.rows.length > 0;
  const bulkActionEnabled = Boolean(onBulkExchangeRateClick) && canBulkUpdateExchangeRate;

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-base font-semibold text-primary">Recepciones pendientes</h2>
      </header>

      <PendingReceptionsFilters
        producerOptions={producerOptions}
        selectedProducerId={selectedProducerId}
        disabled={producerDisabled}
        onBulkExchangeRateClick={onBulkExchangeRateClick}
        canBulkUpdateExchangeRate={bulkActionEnabled}
        bulkExchangeRateLoading={bulkExchangeRateLoading}
      />

      {hasSelection && (
        <MonthFilter
          options={monthOptions}
          value={monthFilter}
          onChange={onMonthChange}
          data-test-id="receptions-month-filter"
        />
      )}

      {!hasSelection && (
        <div className={`${emptyStateClass} mt-2`}>
          Selecciona un productor para revisar las recepciones pendientes de liquidación.
        </div>
      )}

      {hasSelection && !hasRows && (
        <div className={`${emptyStateClass} mt-2`}>
          No se encontraron recepciones pendientes para este productor{monthFilter === MONTH_FILTER_ALL ? '' : ' en el mes seleccionado'}.
        </div>
      )}

      {hasSelection && data.unpricedCount > 0 && (
        <div
          role="alert"
          className="mt-2 rounded-lg border border-warning bg-muted/20 p-4 text-sm text-foreground"
          data-test-id="unpriced-receptions-warning"
        >
          <strong>{data.unpricedCount} recepción(es) sin precio</strong> ({new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(data.unpricedKg)} kg sin valorizar).
          Quedan sin seleccionar y valen $0. Asigne el precio por kilo desde el detalle de cada recepción antes de liquidarlas;
          mientras tanto solo se pueden incluir en un borrador.
        </div>
      )}

      {hasSelection && hasRows && (
        <div className="mt-2 space-y-3">
          <PendingReceptionsTable rows={data.rows} selectedIds={selectedIds} onToggle={onToggle} />
        </div>
      )}
    </section>
  );
}
