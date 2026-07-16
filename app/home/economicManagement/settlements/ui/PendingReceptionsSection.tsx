'use client';

import type { Option } from '@/app/baseComponents/AutoComplete/AutoComplete';
import type { PendingReceptionsResult } from '@/app/actions/settlements';
import PendingReceptionsFilters from './PendingReceptionsFilters';
import PendingReceptionsTable from './PendingReceptionsTable';

interface PendingReceptionsSectionProps {
  producerOptions: Option[];
  selectedProducerId?: string;
  data: PendingReceptionsResult;
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

      {!hasSelection && (
        <div className={`${emptyStateClass} mt-2`}>
          Selecciona un productor para revisar las recepciones pendientes de liquidación.
        </div>
      )}

      {hasSelection && !hasRows && (
        <div className={`${emptyStateClass} mt-2`}>
          No se encontraron recepciones pendientes para este productor.
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
