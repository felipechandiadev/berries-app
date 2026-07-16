"use client";
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import AutoComplete, { Option } from '@/app/baseComponents/AutoComplete/AutoComplete';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import DetailReceptionCard, { type DetailReceptionSummary } from './DetailReceptionCard';
import TrayDevolutionContainer, { type TrayDevolutionItem } from './TrayDevolutionContainer';
import { Currency } from '@/data/entities/Variety';
import { useRouter } from 'next/navigation';
import { getVarietiesWithPriceAndCurrency } from '@/app/actions/varieties';
import { getFormatsSimpleList } from '@/app/actions/formats';
import { getTraysSimpleList } from '@/app/actions/trays';
import { Button } from '@/app/baseComponents/Button/Button';
import { DetailsContainer } from './DetailsContainer';

export interface TrayOption {
  id: string;
  label: string;
  weight: number;
  stock: number;
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
  producer: Option | null;
  guide: string;
  driver: string;
  packs: ReceptionPackSummary[];
  trayDevolutions: TrayDevolutionItem[];
  totals: ReceptionTotals;
  exchangeRate: number;
  trayOptions: TrayOption[]; // Agregamos trayOptions al snapshot para validación
}

interface TransactionDataProps {
  producers?: Option[];
  initialProducerId?: string | number | undefined;
  initialGuide?: string | undefined;
  initialDriver?: string | undefined;
  onProducerChange?: (id: string | number | null) => void;
  onGuideChange?: (id: string | number | null) => void;
  onDriverChange?: (driver: string | null) => void;
  dataTestId?: string;
  onReceptionDataChange?: (data: ReceptionDataSnapshot) => void;
}

const TransactionData: React.FC<TransactionDataProps> = ({ producers, initialProducerId, initialGuide, initialDriver, onProducerChange, onGuideChange, onDriverChange, dataTestId, onReceptionDataChange }) => {
  const router = useRouter();
  const [selected, setSelected] = useState<Option | null>(null);
  const [guide, setGuide] = useState<string>('');
  const [driver, setDriver] = useState<string>('');
  const [detailCardIds] = useState<number[]>([1]);
  const [packDetails, setPackDetails] = useState<Record<number, DetailReceptionSummary>>({});
  const [trayDevolutions, setTrayDevolutions] = useState<TrayDevolutionItem[]>([]);
  const [varietyOptions, setVarietyOptions] = useState<{ id: number; label: string }[]>([]);
  const [formatOptions, setFormatOptions] = useState<{ id: number; label: string; priceCLP: number; priceUSD: number }[]>([]);
  const [trayOptions, setTrayOptions] = useState<TrayOption[]>([]);
  const options: Option[] = producers ?? [];
  const exchangeRate = 0;

  useEffect(() => {
    const fetchData = async () => {
      const [varieties, formats, trays] = await Promise.all([
        getVarietiesWithPriceAndCurrency(),
        getFormatsSimpleList(),
        getTraysSimpleList()
      ]);
      setVarietyOptions(varieties);
      setFormatOptions(formats);
      setTrayOptions(trays.map((t: any) => ({ 
        id: t.id, 
        label: t.label, 
        weight: t.weight,
        stock: t.stock 
      })));
    };
    fetchData();
  }, []);

  // If initialProducerId is present, set initial selected option
  useEffect(() => {
    if (!initialProducerId) return;
    const found = options.find(o => String(o.id) === String(initialProducerId));
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

  const handlePackChange = useCallback((id: number, details: DetailReceptionSummary) => {
    setPackDetails((prev) => {
      // Only update if details actually changed to prevent unnecessary re-renders
      if (JSON.stringify(prev[id]) === JSON.stringify(details)) {
        return prev;
      }
      return { ...prev, [id]: details };
    });
  }, []);

  const detailCards = useMemo(() => {
    return detailCardIds.map((id, index) => (
      <DetailReceptionCard
        key={id}
        packNumber={index + 1}
        varietyOptions={varietyOptions}
        formatOptions={formatOptions}
        trayOptions={trayOptions}
        onChange={(details) => handlePackChange(id, details)}
      />
    ));
  }, [detailCardIds, handlePackChange, varietyOptions, formatOptions]);

  const totals = useMemo(() => {
    const summaries = Object.values(packDetails);
    const totalPacks = summaries.length;
    const totalTraysInPacks = summaries.reduce((sum, details) => sum + (details.traysQuantity || 0), 0);
    const totalTraysDevolved = trayDevolutions.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalGrossWeight = summaries.reduce((sum, details) => sum + (details.grossWeight || 0), 0);
    const totalNetWeight = summaries.reduce((sum, details) => sum + (details.netWeight || 0), 0);
    const totalToPayUSD = summaries.reduce((sum, details) => sum + (details.currency === Currency.USD ? details.totalToPay || 0 : 0), 0);
    const totalToPayCLP = summaries.reduce((sum, details) => sum + (details.currency === Currency.CLP ? details.totalToPay || 0 : 0), 0);
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

  const packSummaries = useMemo(() => (
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
      .filter((item): item is ReceptionPackSummary => item !== null)
  ), [detailCardIds, packDetails]);

  const receptionDataSnapshot = useMemo(() => ({
    producer: selected,
    guide,
    driver,
    packs: packSummaries,
    trayDevolutions,
    totals,
    exchangeRate,
    trayOptions, // Incluimos las opciones para validar stock en el padre
  }), [selected, guide, driver, packSummaries, trayDevolutions, totals, trayOptions]);

  useEffect(() => {
    if (!onReceptionDataChange) {
      return;
    }

    onReceptionDataChange(receptionDataSnapshot);
  }, [onReceptionDataChange, receptionDataSnapshot]);

  return (
    <div className="w-full">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex-1 min-w-[220px]">
          <AutoComplete
            options={options}
            label="Productor"
            placeholder="Selecciona un productor"
            value={selected}
            onChange={(opt) => {
              const option = opt as Option | null;
              setSelected(option);
              const id = option?.id ?? null;
              onProducerChange?.(id);
              // Update the URL param producerId
              try {
                const url = new URL(window.location.href);
                if (id) {
                  url.searchParams.set('producerId', String(id));
                } else {
                  url.searchParams.delete('producerId');
                }
                router.replace(url.pathname + url.search, { scroll: false });
              } catch (e) {
                // ignore errors on window not available
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
                } catch (err) {
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
                } catch (err) {
                  // no-op
                }
              }}
              data-test-id="transaction-data-driver"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="flex flex-col gap-4 w-full">
          <DetailsContainer cards={detailCards} />
        </div>
        <div className="h-full w-full">
          <TrayDevolutionContainer 
            onChange={setTrayDevolutions} 
            trayOptions={trayOptions}
            className="h-full w-full" 
          />
        </div>
      </div>
    </div>
  );
};

export default TransactionData;
