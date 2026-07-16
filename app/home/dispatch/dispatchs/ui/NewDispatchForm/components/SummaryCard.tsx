'use client';

import React from 'react';
import { currencyFormatterCLP, weightFormatter } from '../helpers';
import type { DispatchFormTotals } from '../types';

interface SummaryCardProps {
  totals: DispatchFormTotals;
  pricePerKg: number;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ totals, pricePerKg }) => {
  return (
    <div className="rounded-lg border border-border bg-white p-4 shadow-sm" data-test-id="dispatch-summary-card">
      <h3 className="text-base font-semibold text-foreground">Resumen del despacho</h3>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs uppercase text-muted-foreground">Total pallets</dt>
          <dd className="text-xl font-semibold text-foreground">{totals.totalPallets}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-muted-foreground">Bandejas</dt>
          <dd className="text-xl font-semibold text-foreground">{totals.totalTrays}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-muted-foreground">Peso neto</dt>
          <dd className="text-xl font-semibold text-foreground">{weightFormatter.format(totals.totalNetWeight)} kg</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-muted-foreground">Precio x kg</dt>
          <dd className="text-xl font-semibold text-foreground">{pricePerKg > 0 ? currencyFormatterCLP.format(pricePerKg) : '—'}</dd>
        </div>
      </dl>
      <div className="mt-4 flex items-center justify-between rounded-md bg-gray-50 px-4 py-3">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Total</p>
          <p className="text-2xl font-bold text-primary">{totals.totalAmount > 0 ? currencyFormatterCLP.format(totals.totalAmount) : '—'}</p>
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;
