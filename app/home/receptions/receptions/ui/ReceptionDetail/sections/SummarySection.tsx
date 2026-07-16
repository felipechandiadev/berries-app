'use client';

import { useMemo, useState, type ReactNode } from 'react';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import UpdateBaseForm, { BaseUpdateFormField } from '@/app/baseComponents/BaseForm/UpdateBaseForm';
import { updateReceptionExchangeRate } from '@/app/actions/receptions';
import { useAlert } from '@/app/state/hooks/useAlert';
import { useSession } from 'next-auth/react';
import { usePermissions } from '@/app/state/hooks/usePermissions';
import type {
  ReceptionDetailSummary,
  ReceptionDetailTotals,
  ReceptionDetailDocumentInfo,
  ReceptionDetailPack,
} from '../types';
import { Currency } from '@/data/entities/Variety';

interface SummarySectionProps {
  summary: ReceptionDetailSummary;
  totals: ReceptionDetailTotals | null;
  documents: ReceptionDetailDocumentInfo;
  packs: ReceptionDetailPack[];
  onRefresh?: () => void;
  isSettled?: boolean;
}

interface DetailRow {
  key: string;
  label: string;
  value: string;
  action?: ReactNode;
}

const numberFormatter = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
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

function normalizeCurrency(value: string | null | undefined): Currency {
  return String(value ?? 'CLP').toUpperCase() === Currency.USD ? Currency.USD : Currency.CLP;
}

function formatNumberValue(value: number | null | undefined, decimals: 0 | 2 = 2): string {
  if (value === null || value === undefined) {
    return '—';
  }
  return decimals === 0 ? integerFormatter.format(value) : numberFormatter.format(value);
}

function formatCurrencyValue(value: number | null | undefined, currency: Currency): string {
  if (value === null || value === undefined) {
    return '—';
  }
  if (currency === Currency.USD) {
    return `${usdFormatter.format(value)} USD`;
  }
  return `${currencyFormatter.format(value)} CLP`;
}

export function SummarySection({ summary, totals, documents, packs, onRefresh, isSettled = false }: SummarySectionProps) {
  const [isEditExchangeRateDialogOpen, setIsEditExchangeRateDialogOpen] = useState(false);
  const [exchangeRateFormErrors, setExchangeRateFormErrors] = useState<string[]>([]);

  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const { success } = useAlert();
  const { has } = usePermissions();

  const primaryPack = packs[0] ?? null;

  const aggregatedTotals = useMemo(() => {
    const traysInPacks = totals?.traysInPacks ?? packs.reduce((sum, pack) => sum + pack.traysQuantity, 0);
    const trayWeightKg = totals?.trayWeightKg ?? packs.reduce((sum, pack) => sum + pack.traysTotalWeightKg, 0);
    const grossWeightKg = totals?.grossWeightKg ?? packs.reduce((sum, pack) => sum + pack.grossWeightKg, 0);
    const netWeightKg = totals?.netWeightKg ?? packs.reduce((sum, pack) => sum + pack.netWeightKg, 0);
    const payableCLP = totals?.payableCLP ?? packs
      .filter((pack) => normalizeCurrency(pack.currency) === Currency.CLP)
      .reduce((sum, pack) => sum + pack.totalToPay, 0);
    const payableUSD = totals?.payableUSD ?? packs
      .filter((pack) => normalizeCurrency(pack.currency) === Currency.USD)
      .reduce((sum, pack) => sum + pack.totalToPay, 0);

    return {
      traysInPacks,
      trayWeightKg,
      grossWeightKg,
      netWeightKg,
      payableCLP,
      payableUSD,
      exchangeRate: summary.exchangeRate ?? 0,
      totalCLPToPay: payableCLP + (payableUSD * (summary.exchangeRate ?? 0)),
      trayReturns: totals?.trayReturns ?? 0,
    };
  }, [totals, packs, summary.exchangeRate]);

  const totalImpuritiesKg = useMemo(() => (
    packs.reduce((sum, pack) => sum + Math.max(pack.netWeightBeforeImpuritiesKg - pack.netWeightKg, 0), 0)
  ), [packs]);

  const aggregatedPackInfo = useMemo(() => {
    const varieties = [...new Set(packs.map(pack => pack.varietyName).filter(Boolean))];
    const formats = [...new Set(packs.map(pack => pack.formatName).filter(Boolean))];
    const trayTypes = [...new Set(packs.map(pack => pack.trayLabel).filter(Boolean))];

    return {
      varieties,
      formats, 
      trayTypes,
    };
  }, [packs]);

  const summaryRows = useMemo<DetailRow[]>(() => {
    const rows: DetailRow[] = [
      {
        key: 'variety',
        label: 'Variedad',
        value: aggregatedPackInfo.varieties.length
          ? aggregatedPackInfo.varieties.join(', ')
          : '—',
      },
      {
        key: 'format',
        label: 'Formato',
        value: aggregatedPackInfo.formats.length
          ? aggregatedPackInfo.formats.join(', ')
          : '—',
      },
      {
        key: 'trayType',
        label: 'Tipo de bandeja',
        value: aggregatedPackInfo.trayTypes.length
          ? aggregatedPackInfo.trayTypes.join(', ')
          : '—',
      },
      {
        key: 'totalTrays',
        label: 'Total bandejas',
        value: formatNumberValue(aggregatedTotals.traysInPacks, 0),
      },
      {
        key: 'trayWeight',
        label: 'Kg bandejas',
        value: `${formatNumberValue(aggregatedTotals.trayWeightKg)} kg`,
      },
      {
        key: 'grossWeight',
        label: 'kg bruto',
        value: `${formatNumberValue(aggregatedTotals.grossWeightKg)} kg`,
      },
      {
        key: 'netWeight',
        label: 'kg neto',
        value: `${formatNumberValue(aggregatedTotals.netWeightKg)} kg`,
      },
      {
        key: 'impurities',
        label: 'Kg impurezas',
        value: `${formatNumberValue(totalImpuritiesKg)} kg`,
      },
      {
        key: 'trayReturns',
        label: 'Bandejas devueltas',
        value: formatNumberValue(aggregatedTotals.trayReturns, 0),
      },
    ];

    // Agregar cuadro de totales por moneda - siempre mostrar ambos totales
    rows.push({
      key: 'totalCLP',
      label: 'Total CLP',
      value: formatCurrencyValue(aggregatedTotals.payableCLP, Currency.CLP),
    });

    rows.push({
      key: 'totalUSD',
      label: 'Total USD',
      value: formatCurrencyValue(aggregatedTotals.payableUSD, Currency.USD),
    });
    
    rows.push({
      key: 'exchangeRate',
      label: 'Tipo de cambio',
      value: formatNumberValue(aggregatedTotals.exchangeRate),
      action: !isSettled && has('RECEPTIONS_UPDATE_PRICE') ? (
        <IconButton
          icon="edit"
          variant="basicSecondary"
          size="xs"
          title="Editar tipo de cambio"
          ariaLabel="Editar tipo de cambio"
          onClick={() => setIsEditExchangeRateDialogOpen(true)}
        />
      ) : null,
    });

    // Total final a pagar (siempre en CLP)
    rows.push({
      key: 'totalFinalToPay',
      label: 'TOTAL A PAGAR',
      value: formatCurrencyValue(aggregatedTotals.totalCLPToPay, Currency.CLP),
    });

    return rows;
  }, [aggregatedTotals, totalImpuritiesKg, aggregatedPackInfo]);

  const exchangeRateFormFields: BaseUpdateFormField[] = [
    {
      name: 'newExchangeRate',
      label: 'Nuevo tipo de cambio (CLP/USD)',
      type: 'currency',
      required: true,
      currencySymbol: '$',
      allowDecimalComma: false,
    },
    {
      name: 'reason',
      label: 'Motivo del cambio',
      type: 'textarea',
      required: true,
      rows: 3,
    },
  ];

  const exchangeRateInitialState = {
    newExchangeRate:
      summary.exchangeRate !== undefined && summary.exchangeRate !== null
        ? summary.exchangeRate.toLocaleString('es-CL', { maximumFractionDigits: 2 })
        : '',
    reason: '',
  };

  const handleSaveExchangeRate = async (data: Record<string, unknown>) => {
    try {
      setExchangeRateFormErrors([]);
      
      const rawValue = String(data.newExchangeRate ?? '').trim();
      const normalizedValue = rawValue.replace(/\./g, '').replace(',', '.');
      const rate = Number(normalizedValue);
      if (!rawValue || Number.isNaN(rate) || rate < 0) {
        throw new Error('Debe ingresar un tipo de cambio válido (número positivo)');
      }

      if (!(data.reason as string)?.trim()) {
        throw new Error('Debe proporcionar un motivo para el cambio de tipo de cambio');
      }

      if (!currentUserId) {
        throw new Error('Usuario no autenticado');
      }

      const result = await updateReceptionExchangeRate({
        receptionId: summary.id,
        newExchangeRate: rate,
        reason: (data.reason as string).trim(),
        userId: currentUserId,
      });

      if (!result.success) {
        throw new Error(result.error || 'Error al actualizar el tipo de cambio');
      }

      success('Tipo de cambio actualizado correctamente');
      setIsEditExchangeRateDialogOpen(false);
      onRefresh?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error inesperado';
      setExchangeRateFormErrors([errorMessage]);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <section className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {summaryRows.map((row) => (
              <div key={row.key} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs uppercase tracking-wide text-gray-500">{row.label}</span>
                  {row.action ?? null}
                </div>
                <p className="mt-2 text-sm font-semibold text-gray-900">{row.value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Dialog
        open={isEditExchangeRateDialogOpen}
        onClose={() => {
          setIsEditExchangeRateDialogOpen(false);
          setExchangeRateFormErrors([]);
        }}
        title="Editar Tipo de Cambio"
        size="sm"
      >
        <UpdateBaseForm
          fields={exchangeRateFormFields}
          initialState={exchangeRateInitialState}
          onSubmit={handleSaveExchangeRate}
          errors={exchangeRateFormErrors}
          submitLabel="Actualizar"
          cancelButton={true}
          onCancel={() => {
            setIsEditExchangeRateDialogOpen(false);
            setExchangeRateFormErrors([]);
          }}
        />
      </Dialog>
    </>
  );
}
