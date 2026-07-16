'use client';

import type { PendingAdvancesResult } from '@/app/actions/settlements';
import PendingAdvancesTable from './PendingAdvancesTable';

interface PendingAdvancesSectionProps {
  selectedProducerId?: string;
  data: PendingAdvancesResult;
  selectedIds: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
}

const emptyStateClass = 'rounded-lg border border-dashed border-border bg-muted/20 p-6 text-sm text-secondary';

export default function PendingAdvancesSection({
  selectedProducerId,
  data,
  selectedIds,
  onToggle,
}: PendingAdvancesSectionProps) {
  const hasSelection = Boolean(selectedProducerId);
  const hasRows = data.rows.length > 0;

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-base font-semibold text-primary">Anticipos pendientes</h2>
      </header>

      {!hasSelection && (
        <div className={emptyStateClass}>
          Selecciona un productor para revisar los anticipos pendientes de liquidación.
        </div>
      )}

      {hasSelection && !hasRows && (
        <div className={`${emptyStateClass} mt-2`}>
          No se encontraron anticipos pendientes para este productor.
        </div>
      )}

      {hasSelection && hasRows && (
        <div className="mt-2 space-y-3">
          <PendingAdvancesTable rows={data.rows} selectedIds={selectedIds} onToggle={onToggle} />
        </div>
      )}
    </section>
  );
}
