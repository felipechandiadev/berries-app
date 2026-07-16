'use client';

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

interface SettlementSummaryProps {
  receptionsCount: number;
  receptionsTotal: number;
  advancesCount: number;
  advancesTotal: number;
  balance: number;
}

export default function SettlementSummary({
  receptionsCount,
  receptionsTotal,
  advancesCount,
  advancesTotal,
  balance,
}: SettlementSummaryProps) {
  const balanceLabel = balance >= 0 ? 'Saldo a pagar' : 'Saldo en contra';
  const balanceValue = Math.abs(balance);
  const balanceColor = balance >= 0 ? 'text-primary' : 'text-red-600';
  const borderColor = balance >= 0 ? 'border-primary/50' : 'border-red-600/50';
  const bgColor = balance >= 0 ? 'bg-primary/5' : 'bg-red-600/5';
  const labelColor = balance >= 0 ? 'text-primary' : 'text-red-600';

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-primary">Resumen de liquidación</h2>
      </div>

      <div className="flex flex-col rounded-lg border border-border bg-background px-6 py-6 shadow-sm">
        <dl className="flex flex-col gap-4 text-sm sm:gap-5">
          <div className="rounded-md border border-border/60 bg-muted/20 p-3">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Recepciones seleccionadas</dt>
            <dd className="mt-2 flex items-baseline justify-between gap-3">
              <span className="text-xl font-semibold text-foreground">{receptionsCount}</span>
              <span className="text-sm font-medium text-primary">{currencyFormatter.format(receptionsTotal)}</span>
            </dd>
          </div>

          <div className="rounded-md border border-border/60 bg-muted/20 p-3">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Anticipos seleccionados</dt>
            <dd className="mt-2 flex items-baseline justify-between gap-3">
              <span className="text-xl font-semibold text-foreground">{advancesCount}</span>
              <span className="text-sm font-medium text-primary">{currencyFormatter.format(advancesTotal)}</span>
            </dd>
          </div>

          <div className={`rounded-md border border-dashed ${borderColor} ${bgColor} p-4`}>
            <dt className={`text-xs uppercase tracking-wide ${labelColor}`}>{balanceLabel}</dt>
            <dd className={`mt-2 text-3xl font-semibold ${balanceColor}`}>{currencyFormatter.format(balanceValue)}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
