'use client';

import { Button } from '@/app/baseComponents/Button/Button';
import Badge from '@/app/baseComponents/Badge/Badge';
import PrintReceptionDetailButton from './PrintReceptionDetailButton';
import type { ReceptionDetailData, ReceptionDetailSummary, ReceptionDetailTotals } from './types';
import { usePermissions } from '@/app/state/hooks/usePermissions';

interface ReceptionDetailHeaderProps {
  summary: ReceptionDetailSummary;
  totals?: ReceptionDetailTotals | null;
  data: ReceptionDetailData;
  onClose: () => void;
}

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

export function ReceptionDetailHeader({ summary, totals, data, onClose }: ReceptionDetailHeaderProps) {
  const { has } = usePermissions();
  const payLabel = totals?.totalCLPToPay ?? summary.totalCLPToPay ?? summary.amount;
  const formattedPayLabel = currencyFormatter.format(payLabel || 0);

  const isSettled = summary.isSettled ?? false;
  const canPrint = has('RECEPTIONS_PRINT_DETAIL');

  return (
    <header className="flex flex-col gap-4 px-6 py-4 border-b border-gray-200 bg-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-gray-900">Recepción #{summary.id}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outlined" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-3 text-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col items-center rounded-lg px-3 py-2">
            <span className="text-xs font-medium text-gray-500 mb-1">ESTADO</span>
            <Badge variant={isSettled ? 'success' : 'warning'}>
              {isSettled ? 'Liquidada' : 'Pendiente'}
            </Badge>
          </div>
          <div className="flex flex-col items-center rounded-lg px-3 py-2">
            <span className="text-xs font-medium text-gray-500 mb-1">A PAGAR</span>
            <Badge variant="info" className="text-sm">
              {formattedPayLabel}
            </Badge>
          </div>
        </div>
        <div className="flex items-center self-start lg:self-auto">
          {canPrint && <PrintReceptionDetailButton data={data} />}
        </div>
      </div>
    </header>
  );
}
