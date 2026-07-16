'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NumberStepper } from '@/app/baseComponents/NumberStepper/NumberStepper';
import { getAvailablePalletSummaries, type PalletAvailabilitySummary } from '@/app/actions/pallets';

export interface PalletSelection {
  pallet: PalletAvailabilitySummary;
  traysToAssign: number;
}

export type PalletPickerSelection = PalletSelection[];

interface PalletPickerProps {
  expectedTrays?: number;
  onSelectionChange?: (selection: PalletPickerSelection) => void;
  className?: string;
  disabled?: boolean;
  trayId?: string | null;
  onClose?: () => void;
  refreshTrigger?: number;
}

const sumAssigned = (values: Record<number, number>, excludeId?: number) => {
  return Object.entries(values).reduce((acc, [key, trays]) => {
    const palletId = Number(key);
    if (excludeId !== undefined && palletId === excludeId) {
      return acc;
    }
    return acc + trays;
  }, 0);
};

const PalletPicker: React.FC<PalletPickerProps> = ({
  expectedTrays,
  onSelectionChange,
  className = '',
  disabled = false,
  trayId,
  onClose,
  refreshTrigger = 0,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pallets, setPallets] = useState<PalletAvailabilitySummary[]>([]);
  const [selectedMap, setSelectedMap] = useState<Record<number, number>>({});

  useEffect(() => {
    let isMounted = true;

    const loadPallets = async () => {
      if (!trayId) {
        setPallets([]);
        setSelectedMap({});
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await getAvailablePalletSummaries({ trayId });
        if (!isMounted) {
          return;
        }

        if (response.success && response.data) {
          setPallets(response.data);
        } else {
          setError(response.error ?? 'No fue posible cargar los pallets disponibles');
        }
      } catch (err: any) {
        if (!isMounted) {
          return;
        }
        setError(err?.message ?? 'No fue posible cargar los pallets disponibles');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPallets();

    return () => {
      isMounted = false;
    };
  }, [trayId, refreshTrigger]);

  useEffect(() => {
    setSelectedMap({});
  }, [trayId]);

  useEffect(() => {
    setSelectedMap((prev) => {
      if (Object.keys(prev).length === 0) {
        return prev;
      }

      const next: Record<number, number> = {};
      let remaining =
        expectedTrays !== undefined && expectedTrays !== null ? expectedTrays : Number.POSITIVE_INFINITY;

      Object.entries(prev).forEach(([key, value]) => {
        const palletId = Number(key);
        const pallet = pallets.find((item) => item.id === palletId);
        if (!pallet) {
          return;
        }

        let adjusted = Math.min(value, pallet.availableTrays);

        if (expectedTrays !== undefined && expectedTrays !== null) {
          const allowed = Math.min(adjusted, Math.max(remaining, 0));
          adjusted = Math.max(0, allowed);
          remaining = Math.max(remaining - adjusted, 0);
        }

        if (adjusted > 0) {
          next[palletId] = adjusted;
        }
      });

      if (Object.keys(next).length === Object.keys(prev).length) {
        const differs = Object.entries(next).some(([key, value]) => prev[Number(key)] !== value);
        if (!differs) {
          return prev;
        }
      }

      return next;
    });
  }, [expectedTrays, pallets]);

  const totalAssigned = useMemo(() => sumAssigned(selectedMap), [selectedMap]);

  useEffect(() => {
    if (!onSelectionChange) {
      return;
    }

    const selections: PalletPickerSelection = Object.entries(selectedMap)
      .map(([key, trays]) => {
        const pallet = pallets.find((item) => item.id === Number(key));
        if (!pallet || trays <= 0) {
          return null;
        }
        return {
          pallet,
          traysToAssign: trays,
        };
      })
      .filter((item): item is PalletSelection => Boolean(item));

    onSelectionChange(selections);
  }, [onSelectionChange, pallets, selectedMap]);

  const toggleSelection = useCallback((palletId: number) => {
    if (disabled) {
      return;
    }

    setSelectedMap((prev) => {
      if (prev[palletId] !== undefined) {
        const { [palletId]: _removed, ...rest } = prev;
        return rest;
      }

      const pallet = pallets.find((item) => item.id === palletId);
      if (!pallet) {
        return prev;
      }

      const remainingCapacity =
        expectedTrays !== undefined && expectedTrays !== null
          ? Math.max(expectedTrays - sumAssigned(prev), 0)
          : pallet.availableTrays;

      const initialTrays =
        expectedTrays !== undefined && expectedTrays !== null
          ? Math.min(pallet.availableTrays, remainingCapacity)
          : pallet.availableTrays;

      if (initialTrays <= 0) {
        return prev;
      }

      return {
        ...prev,
        [palletId]: initialTrays,
      };
    });
  }, [disabled, expectedTrays, pallets]);

  const handleTraysChange = useCallback((palletId: number, value: number) => {
    if (disabled) {
      return;
    }

    setSelectedMap((prev) => {
      if (prev[palletId] === undefined) {
        return prev;
      }

      const pallet = pallets.find((item) => item.id === palletId);
      if (!pallet) {
        const { [palletId]: _removed, ...rest } = prev;
        return rest;
      }

      const sanitized = Math.max(0, Math.min(pallet.availableTrays, value));
      const otherTotal = sumAssigned(prev, palletId);
      const maxByExpected =
        expectedTrays !== undefined && expectedTrays !== null
          ? Math.max(expectedTrays - otherTotal, 0)
          : pallet.availableTrays;
      const capped = Math.min(sanitized, maxByExpected);

      if (capped <= 0) {
        const { [palletId]: _removed, ...rest } = prev;
        return rest;
      }

      if (prev[palletId] === capped) {
        return prev;
      }

      return {
        ...prev,
        [palletId]: capped,
      };
    });
  }, [disabled, expectedTrays, pallets]);

  const formatNumber = useCallback((value: number, decimals = 0) => {
    return new Intl.NumberFormat('es-CL', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }, []);

  const selectedEntries = useMemo(() => Object.entries(selectedMap), [selectedMap]);

  return (
    <div className={`p-4 border rounded-md shadow-md bg-card ${className}`} data-test-id="pallet-picker">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Distribuye las bandejas entre pallets</p>
          {expectedTrays !== undefined && expectedTrays !== null ? (
            <p className="mt-1 text-xs text-gray-500">
              Asignadas: {formatNumber(totalAssigned)} / {formatNumber(expectedTrays)}
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              Asignadas: {formatNumber(totalAssigned)} bandejas
            </p>
          )}
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            Cerrar
          </button>
        ) : null}
      </div>

      {!trayId ? (
        <p className="mt-4 text-sm text-gray-500">Selecciona una bandeja para ver pallets disponibles.</p>
      ) : loading ? (
        <p className="mt-4 text-sm text-gray-500">Cargando pallets...</p>
      ) : error ? (
        <p className="mt-4 text-sm text-red-500">{error}</p>
      ) : pallets.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">No hay pallets disponibles para asignar bandejas.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {pallets.map((pallet) => {
            const assigned = selectedMap[pallet.id] ?? 0;
            const isSelected = selectedMap[pallet.id] !== undefined;
            const borderClass = isSelected ? 'border-primary ring-1 ring-primary/50' : 'border-border';
            const backgroundClass = isSelected ? 'bg-primary/5' : 'bg-background';
            const otherTotal = sumAssigned(selectedMap, pallet.id);
            const maxAssignable =
              expectedTrays !== undefined && expectedTrays !== null
                ? Math.min(pallet.availableTrays, Math.max(expectedTrays - otherTotal, 0))
                : pallet.availableTrays;
            const currentOccupied = Math.max(pallet.capacity - pallet.availableTrays, 0);
            const futureOccupied = Math.min(pallet.capacity, currentOccupied + assigned);
            const futureAvailable = Math.max(pallet.availableTrays - assigned, 0);
            const occupancy = pallet.capacity > 0
              ? Math.min(100, Math.max(0, (futureOccupied / pallet.capacity) * 100))
              : 0;

            return (
              <div
                key={pallet.id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-disabled={disabled}
                onClick={() => toggleSelection(pallet.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleSelection(pallet.id);
                  }
                }}
                className={`w-full text-left p-3 rounded-md border transition-colors ${borderClass} ${backgroundClass} ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-primary'}`}
                data-test-id={`pallet-option-${pallet.id}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Pallet #{pallet.id}</p>
                  <p className="text-sm font-semibold text-primary">{formatNumber(futureAvailable)} libres</p>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${occupancy}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Ocupado: {formatNumber(futureOccupied)} / {formatNumber(pallet.capacity)}
                </p>

                {isSelected ? (
                  <div
                    className="mt-3"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <NumberStepper
                      label="Bandejas a asignar"
                      value={assigned}
                      onChange={(value) => handleTraysChange(pallet.id, value)}
                      min={0}
                      max={Math.max(0, maxAssignable)}
                      step={1}
                      allowNegative={false}
                      disabled={disabled || maxAssignable === 0}
                      data-test-id={`pallet-${pallet.id}-stepper`}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Disponible en pallet: {formatNumber(futureAvailable)} · Máx asignable ahora: {formatNumber(Math.max(0, maxAssignable))}
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
      {selectedEntries.length > 0 ? (
        <div className="mt-4 rounded-md border bg-background p-3 text-xs text-gray-500">
          <p className="font-semibold text-gray-700">Resumen de distribución</p>
          <ul className="mt-2 space-y-1">
            {selectedEntries
              .filter(([, trays]) => trays > 0)
              .map(([key, trays]) => {
                const pallet = pallets.find((item) => item.id === Number(key));
                const futureAvailable = pallet ? Math.max(pallet.availableTrays - trays, 0) : null;
                return (
                  <li key={key}>
                    Pallet #{key}: {formatNumber(trays)} bandejas
                    {futureAvailable !== null ? ` · ${formatNumber(futureAvailable)} libres` : ''}
                  </li>
                );
              })}
          </ul>
          {expectedTrays !== undefined && expectedTrays !== null ? (
            <p className="mt-2">Restantes por asignar: {formatNumber(Math.max(expectedTrays - totalAssigned, 0))}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default PalletPicker;
