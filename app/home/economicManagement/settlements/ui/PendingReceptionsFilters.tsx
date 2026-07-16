'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import AutoComplete, { type Option } from '@/app/baseComponents/AutoComplete/AutoComplete';
import { Button } from '@/app/baseComponents/Button/Button';

export interface PendingReceptionsFiltersProps {
  producerOptions: Option[];
  selectedProducerId?: string;
  disabled?: boolean;
  onBulkExchangeRateClick?: () => void;
  canBulkUpdateExchangeRate?: boolean;
  bulkExchangeRateLoading?: boolean;
}

export default function PendingReceptionsFilters({
  producerOptions,
  selectedProducerId,
  disabled = false,
  onBulkExchangeRateClick,
  canBulkUpdateExchangeRate = false,
  bulkExchangeRateLoading = false,
}: PendingReceptionsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedOption = useMemo(() => {
    if (!selectedProducerId) {
      return null;
    }
    return (
      producerOptions.find((option) => String(option.id) === String(selectedProducerId)) ?? null
    );
  }, [producerOptions, selectedProducerId]);

  const handleProducerChange = (option: Option | null) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (option) {
      params.set('producerId', String(option.id));
      params.set('page', '1');
    } else {
      params.delete('producerId');
      params.delete('page');
    }

    const query = params.toString();
    const targetUrl = query ? `${pathname}?${query}` : pathname;
    router.push(targetUrl, { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[240px] flex-1">
        <AutoComplete
          options={producerOptions}
          label="Productor"
          placeholder="Selecciona un productor"
          value={selectedOption}
          onChange={handleProducerChange}
          disabled={disabled}
        />
      </div>
      {onBulkExchangeRateClick ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onBulkExchangeRateClick}
          disabled={disabled || !canBulkUpdateExchangeRate}
          loading={bulkExchangeRateLoading}
        >
          Editar cambio
        </Button>
      ) : null}
    </div>
  );
}
