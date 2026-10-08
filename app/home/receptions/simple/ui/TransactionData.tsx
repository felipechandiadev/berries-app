"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import AutoComplete, { Option } from '@/app/baseComponents/AutoComplete/AutoComplete';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import DetailReceptionCard, { type DetailReceptionSummary } from './DetailReceptionCard';
import TrayDevolutionContainer, { type TrayDevolutionItem } from './TrayDevolutionContainer';
import PalletPicker, { type PalletPickerSelection } from './PalletPicker';
import CreatePalletDialog from './detailCardComponents/CreatePalletDialog';
import { Currency } from '@/data/entities/Variety';
import { useRouter } from 'next/navigation';
import { getVarietiesWithPriceAndCurrency } from '@/app/actions/varieties';
import { getFormatsSimpleList } from '@/app/actions/formats';
import { getTraysSimpleList } from '@/app/actions/trays';
import IconButton from '@/app/baseComponents/IconButton/IconButton';

export interface TrayOption {
  id: string;
  label: string;
  weight: number;
  stock: number;
}

/** Productor del autocomplete, con unidad productiva opcional. */
export interface ReceptionProducerOption extends Option {
  productiveUnitId?: string;
  productiveUnitName?: string;
}

export interface ReceptionTotals {
  totalPacks: number;
  totalTraysInPacks: number;
  totalTraysDevolved: number;
  totalGrossWeight: number;
  totalNetWeight: number;
  totalToPayUSD: number;
  totalToPayCLP: number;
  totalCLPToPay: number;
}

export interface ReceptionPackSummary extends DetailReceptionSummary {
  id: number;
  packNumber: number;
}

export interface ReceptionDataSnapshot {
  producer: ReceptionProducerOption | null;
  guide: string;
  driver: string;
  packs: ReceptionPackSummary[];
  trayDevolutions: TrayDevolutionItem[];
  totals: ReceptionTotals;
  exchangeRate: number;
  trayOptions: TrayOption[];
  /** Fecha de registro (ISO). Presente al reimprimir desde listado/detalle. */
  createdAt?: string | null;
}

interface TransactionDataProps {
  producers?: ReceptionProducerOption[];
  initialProducerId?: string | number | undefined;
  initialGuide?: string | undefined;
  initialDriver?: string | undefined;
  onProducerChange?: (id: string | number | null) => void;
  onGuideChange?: (id: string | number | null) => void;
  onDriverChange?: (driver: string | null) => void;
  dataTestId?: string;
  onReceptionDataChange?: (data: ReceptionDataSnapshot) => void;
}

const numberFmt = (value: number, decimals = 2) =>
  new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

const moneyFmt = (value: number, currency: 'CLP' | 'USD') =>
  new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: currency === 'CLP' ? 0 : 2,
    maximumFractionDigits: currency === 'CLP' ? 0 : 2,
  }).format(value);

const TransactionData: React.FC<TransactionDataProps> = ({
  producers,
  initialProducerId,
  initialGuide,
  initialDriver,
  onProducerChange,
  onGuideChange,
  onDriverChange,
  dataTestId,
  onReceptionDataChange,
}) => {
  const router = useRouter();
  const [selected, setSelected] = useState<ReceptionProducerOption | null>(null);
  const [guide, setGuide] = useState<string>('');
  const [driver, setDriver] = useState<string>('');
  const [detailCardIds] = useState<number[]>([1]);
  const [packDetails, setPackDetails] = useState<Record<number, DetailReceptionSummary>>({});
  const [trayDevolutions, setTrayDevolutions] = useState<TrayDevolutionItem[]>([]);
  const [varietyOptions, setVarietyOptions] = useState<{ id: number; label: string }[]>([]);
  const [formatOptions, setFormatOptions] = useState<
    { id: number; label: string; priceCLP: number; priceUSD: number }[]
  >([]);
  const [trayOptions, setTrayOptions] = useState<TrayOption[]>([]);
  const [palletSelection, setPalletSelection] = useState<PalletPickerSelection>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [createPalletOpen, setCreatePalletOpen] = useState(false);
  const options: ReceptionProducerOption[] = producers ?? [];
  const exchangeRate = 0;

  const packTrayId = packDetails[1]?.trayId ?? null;
  const prevTrayIdRef = useRef<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [varieties, formats, trays] = await Promise.all([
        getVarietiesWithPriceAndCurrency(),
        getFormatsSimpleList(),
        getTraysSimpleList(),
      ]);
      setVarietyOptions(varieties);
      setFormatOptions(formats);
      setTrayOptions(
        trays.map((t: any) => ({
          id: t.id,
          label: t.label,
          weight: t.weight,
          stock: t.stock,
        }))
      );
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!initialProducerId) return;
    const found = options.find((o) => String(o.id) === String(initialProducerId));
    if (found) {
      setSelected(found);
      onProducerChange?.(found.id);
    }
  }, [options, initialProducerId]);

  useEffect(() => {
    if (initialGuide === undefined || initialGuide === null) return;
    setGuide(String(initialGuide));
    onGuideChange?.(initialGuide ?? null);
  }, [initialGuide]);

  useEffect(() => {
    if (initialDriver === undefined || initialDriver === null) return;
    setDriver(String(initialDriver));
    onDriverChange?.(initialDriver ?? null);
  }, [initialDriver]);

  // Clear pallet selection when tray type changes
  useEffect(() => {
    if (prevTrayIdRef.current !== null && prevTrayIdRef.current !== packTrayId) {
      setPalletSelection([]);
    }
    prevTrayIdRef.current = packTrayId;
  }, [packTrayId]);

  const handlePackChange = useCallback((id: number, details: DetailReceptionSummary) => {
    setPackDetails((prev) => {
      if (JSON.stringify(prev[id]) === JSON.stringify(details)) {
        return prev;
      }
      return { ...prev, [id]: details };
    });
  }, []);

  const handlePalletSelectionChange = useCallback((selection: PalletPickerSelection) => {
    setPalletSelection(selection);
  }, []);

  const totals = useMemo(() => {
    const summaries = Object.values(packDetails);
    const totalPacks = summaries.length;
    const totalTraysInPacks = summaries.reduce(
      (sum, details) => sum + (details.traysQuantity || 0),
      0
    );
    const totalTraysDevolved = trayDevolutions.reduce(
      (sum, item) => sum + (item.quantity || 0),
      0
    );
    const totalGrossWeight = summaries.reduce(
      (sum, details) => sum + (details.grossWeight || 0),
      0
    );
    const totalNetWeight = summaries.reduce((sum, details) => sum + (details.netWeight || 0), 0);
    const totalToPayUSD = summaries.reduce(
      (sum, details) => sum + (details.currency === Currency.USD ? details.totalToPay || 0 : 0),
      0
    );
    const totalToPayCLP = summaries.reduce(
      (sum, details) => sum + (details.currency === Currency.CLP ? details.totalToPay || 0 : 0),
      0
    );
    const totalCLPToPay = totalToPayCLP;

    return {
      totalPacks,
      totalTraysInPacks,
      totalTraysDevolved,
      totalGrossWeight,
      totalNetWeight,
      totalToPayUSD,
      totalToPayCLP,
      totalCLPToPay,
    };
  }, [packDetails, trayDevolutions]);

  const packSummaries = useMemo(
    () =>
      detailCardIds
        .map((id, index) => {
          const details = packDetails[id];
          if (!details) {
            return null;
          }

          return {
            ...details,
            id,
            packNumber: index + 1,
          } as ReceptionPackSummary;
        })
        .filter((item): item is ReceptionPackSummary => item !== null),
    [detailCardIds, packDetails]
  );

  const receptionDataSnapshot = useMemo(
    () => ({
      producer: selected,
      guide,
      driver,
      packs: packSummaries,
      trayDevolutions,
      totals,
      exchangeRate,
      trayOptions,
    }),
    [selected, guide, driver, packSummaries, trayDevolutions, totals, trayOptions]
  );

  useEffect(() => {
    if (!onReceptionDataChange) {
      return;
    }

    onReceptionDataChange(receptionDataSnapshot);
  }, [onReceptionDataChange, receptionDataSnapshot]);

  const packCurrency = packDetails[1]?.currency ?? Currency.CLP;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex-1 min-w-[220px]">
          <AutoComplete
            options={options}
            label="Productor"
            placeholder="Selecciona un productor"
            value={selected}
            onChange={(opt) => {
              const option = (opt as ReceptionProducerOption | null) ?? null;
              setSelected(option);
              const id = option?.id ?? null;
              onProducerChange?.(id);
              try {
                const url = new URL(window.location.href);
                if (id) {
                  url.searchParams.set('producerId', String(id));
                } else {
                  url.searchParams.delete('producerId');
                }
                router.replace(url.pathname + url.search, { scroll: false });
              } catch {
                // ignore
              }
            }}
            data-test-id={dataTestId}
          />
        </div>
        <div className="flex w-full items-start sm:w-[260px]">
          <div className="relative flex-1 rounded-md border border-border focus-within:border-primary">
            <TextField
              variante="autocomplete"
              label="Guía"
              placeholder="Número de guía"
              value={guide}
              onChange={(e) => {
                const val = (e.target as HTMLInputElement).value;
                setGuide(val);
                onGuideChange?.(val || null);
                try {
                  const url = new URL(window.location.href);
                  if (val) {
                    url.searchParams.set('guide', String(val));
                  } else {
                    url.searchParams.delete('guide');
                  }
                  router.replace(url.pathname + url.search, { scroll: false });
                } catch {
                  // no-op
                }
              }}
              data-test-id="transaction-data-guide"
            />
          </div>
        </div>
        <div className="flex w-full items-start sm:w-[260px]">
          <div className="relative flex-1 rounded-md border border-border focus-within:border-primary">
            <TextField
              variante="autocomplete"
              label="Entregado por"
              placeholder="Nombre de quien entrega"
              value={driver}
              onChange={(e) => {
                const val = (e.target as HTMLInputElement).value;
                setDriver(val);
                onDriverChange?.(val || null);
                try {
                  const url = new URL(window.location.href);
                  if (val) {
                    url.searchParams.set('driver', String(val));
                  } else {
                    url.searchParams.delete('driver');
                  }
                  router.replace(url.pathname + url.search, { scroll: false });
                } catch {
                  // no-op
                }
              }}
              data-test-id="transaction-data-driver"
            />
          </div>
        </div>
      </div>

      {/* 3 columnas: Detalle | Pallets | Devoluciones */}
      <div
        className="grid grid-cols-1 gap-4 items-start xl:grid-cols-[minmax(240px,1fr)_minmax(320px,1.4fr)_minmax(220px,0.9fr)]"
        data-test-id="reception-simple-columns"
      >
        <div className="w-full min-w-0">
          <DetailReceptionCard
            packNumber={1}
            varietyOptions={varietyOptions}
            formatOptions={formatOptions}
            trayOptions={trayOptions}
            onChange={(details) => handlePackChange(1, details)}
            hidePalletPanel
            externalPalletSelection={palletSelection}
          />
        </div>

        <div
          className="flex w-full min-w-0 flex-col rounded-lg border border-border bg-gray-50 p-4 shadow-sm"
          data-test-id="reception-pallets-column"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-gray-900">Pallets</h3>
            <IconButton
              icon="add"
              variant="text"
              onClick={() => setCreatePalletOpen(true)}
              disabled={!packTrayId}
              title="Crear pallet"
            />
          </div>

          {!packTrayId ? (
            <div className="flex min-h-[180px] flex-1 items-center justify-center rounded-md border border-dashed border-border bg-white/60 p-4 text-center text-sm text-muted-foreground">
              Selecciona un tipo de bandeja en Detalle para asignar pallets
            </div>
          ) : (
            <PalletPicker
              onSelectionChange={handlePalletSelectionChange}
              trayId={packTrayId}
              refreshTrigger={refreshTrigger}
              captureGrossWeight
              plain
              twoColumnCards
            />
          )}

          {packTrayId ? (
            <CreatePalletDialog
              open={createPalletOpen}
              onClose={() => setCreatePalletOpen(false)}
              trayId={packTrayId}
              onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
            />
          ) : null}
        </div>

        <div className="h-full w-full min-w-0">
          <TrayDevolutionContainer
            onChange={setTrayDevolutions}
            trayOptions={trayOptions}
            className="h-full w-full"
          />
        </div>
      </div>

      {/* Resumen */}
      <div
        className="rounded-lg border border-border bg-white p-4 shadow-sm"
        data-test-id="reception-summary"
      >
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Resumen de la recepción
        </h3>
        {selected?.productiveUnitName ? (
          <div className="mb-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Unidad productiva:{' '}
            </span>
            <span className="font-semibold text-gray-900">{selected.productiveUnitName}</span>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Bandejas</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {numberFmt(totals.totalTraysInPacks, 0)}
            </p>
          </div>
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Kg brutos
            </p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {numberFmt(totals.totalGrossWeight)} kg
            </p>
          </div>
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Kg netos</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {numberFmt(totals.totalNetWeight)} kg
            </p>
          </div>
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Devueltas
            </p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {numberFmt(totals.totalTraysDevolved, 0)}
            </p>
          </div>
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Pallets</p>
            <p className="mt-1 text-lg font-bold text-gray-900">{palletSelection.length}</p>
          </div>
          <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70">
              Total a pagar
            </p>
            <p className="mt-1 text-lg font-bold text-primary">
              {packCurrency === Currency.USD ? 'US$ ' : '$ '}
              {moneyFmt(
                packCurrency === Currency.USD ? totals.totalToPayUSD : totals.totalToPayCLP,
                packCurrency === Currency.USD ? 'USD' : 'CLP'
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionData;
