'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NumberStepper } from '@/app/baseComponents/NumberStepper/NumberStepper';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import { getAvailablePalletSummaries, type PalletAvailabilitySummary } from '@/app/actions/pallets';

export interface PalletSelection {
  pallet: PalletAvailabilitySummary;
  traysToAssign: number;
  /** Kg brutos de esta línea (requerido para ingreso por pallet). */
  grossWeightKg: number;
}

export type PalletPickerSelection = PalletSelection[];

interface LineValues {
  trays: number;
  grossKg: number;
}

interface PalletPickerProps {
  /**
   * Si se define, limita la suma de bandejas a este total (modo “repartir”).
   * Si es undefined, las líneas definen el total del pack (modo ingreso por pallet).
   */
  expectedTrays?: number;
  onSelectionChange?: (selection: PalletPickerSelection) => void;
  className?: string;
  disabled?: boolean;
  trayId?: string | null;
  onClose?: () => void;
  refreshTrigger?: number;
  /** Muestra input de kg brutos por pallet (default true). */
  captureGrossWeight?: boolean;
  /** Sin borde/sombra (para embeber en columna). */
  plain?: boolean;
  /** Cards en grilla de 2 columnas (más compactas). */
  twoColumnCards?: boolean;
}

const sumTrays = (values: Record<number, LineValues>, excludeId?: number) =>
  Object.entries(values).reduce((acc, [key, line]) => {
    const palletId = Number(key);
    if (excludeId !== undefined && palletId === excludeId) return acc;
    return acc + (line?.trays ?? 0);
  }, 0);

const PalletPicker: React.FC<PalletPickerProps> = ({
  expectedTrays,
  onSelectionChange,
  className = '',
  disabled = false,
  trayId,
  onClose,
  refreshTrigger = 0,
  captureGrossWeight = true,
  plain = false,
  twoColumnCards = false,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pallets, setPallets] = useState<PalletAvailabilitySummary[]>([]);
  const [selectedMap, setSelectedMap] = useState<Record<number, LineValues>>({});

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
        if (!isMounted) return;

        if (response.success && response.data) {
          setPallets(response.data);
        } else {
          setError(response.error ?? 'No fue posible cargar los pallets disponibles');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err?.message ?? 'No fue posible cargar los pallets disponibles');
      } finally {
        if (isMounted) setLoading(false);
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
      if (Object.keys(prev).length === 0) return prev;

      const next: Record<number, LineValues> = {};
      let remaining =
        expectedTrays !== undefined && expectedTrays !== null
          ? expectedTrays
          : Number.POSITIVE_INFINITY;

      Object.entries(prev).forEach(([key, line]) => {
        const palletId = Number(key);
        const pallet = pallets.find((item) => item.id === palletId);
        if (!pallet) return;

        let adjusted = Math.min(line.trays, pallet.availableTrays);
        if (expectedTrays !== undefined && expectedTrays !== null) {
          const allowed = Math.min(adjusted, Math.max(remaining, 0));
          adjusted = Math.max(0, allowed);
          remaining = Math.max(remaining - adjusted, 0);
        }

        if (adjusted > 0) {
          next[palletId] = { trays: adjusted, grossKg: Math.max(0, line.grossKg || 0) };
        }
      });

      return next;
    });
  }, [expectedTrays, pallets]);

  const totalAssigned = useMemo(() => sumTrays(selectedMap), [selectedMap]);
  const totalGross = useMemo(
    () => Object.values(selectedMap).reduce((sum, line) => sum + (line.grossKg || 0), 0),
    [selectedMap]
  );

  useEffect(() => {
    if (!onSelectionChange) return;

    const selections: PalletPickerSelection = Object.entries(selectedMap)
      .map(([key, line]) => {
        const pallet = pallets.find((item) => item.id === Number(key));
        if (!pallet || line.trays <= 0) return null;
        return {
          pallet,
          traysToAssign: line.trays,
          grossWeightKg: Math.max(0, line.grossKg || 0),
        };
      })
      .filter((item): item is PalletSelection => Boolean(item));

    onSelectionChange(selections);
  }, [onSelectionChange, pallets, selectedMap]);

  const toggleSelection = useCallback(
    (palletId: number) => {
      if (disabled) return;

      setSelectedMap((prev) => {
        if (prev[palletId] !== undefined) {
          const { [palletId]: _removed, ...rest } = prev;
          return rest;
        }

        const pallet = pallets.find((item) => item.id === palletId);
        if (!pallet) return prev;

        const remainingCapacity =
          expectedTrays !== undefined && expectedTrays !== null
            ? Math.max(expectedTrays - sumTrays(prev), 0)
            : pallet.availableTrays;

        const initialTrays =
          expectedTrays !== undefined && expectedTrays !== null
            ? Math.min(pallet.availableTrays, remainingCapacity)
            : Math.min(pallet.availableTrays, Math.max(pallet.availableTrays, 1) > 0 ? 1 : 0);

        // In lines-define-totals mode, start with 1 tray if capacity allows
        const startTrays =
          expectedTrays === undefined || expectedTrays === null
            ? Math.min(pallet.availableTrays, Math.max(1, 0))
            : initialTrays;

        if (startTrays <= 0) return prev;

        return {
          ...prev,
          [palletId]: { trays: startTrays, grossKg: 0 },
        };
      });
    },
    [disabled, expectedTrays, pallets]
  );

  const handleTraysChange = useCallback(
    (palletId: number, value: number) => {
      if (disabled) return;

      setSelectedMap((prev) => {
        if (prev[palletId] === undefined) return prev;

        const pallet = pallets.find((item) => item.id === palletId);
        if (!pallet) {
          const { [palletId]: _removed, ...rest } = prev;
          return rest;
        }

        const sanitized = Math.max(0, Math.min(pallet.availableTrays, value));
        const otherTotal = sumTrays(prev, palletId);
        const maxByExpected =
          expectedTrays !== undefined && expectedTrays !== null
            ? Math.max(expectedTrays - otherTotal, 0)
            : pallet.availableTrays;
        const capped = Math.min(sanitized, maxByExpected);

        if (capped <= 0) {
          const { [palletId]: _removed, ...rest } = prev;
          return rest;
        }

        return {
          ...prev,
          [palletId]: { ...prev[palletId], trays: capped },
        };
      });
    },
    [disabled, expectedTrays, pallets]
  );

  const handleGrossChange = useCallback(
    (palletId: number, raw: string) => {
      if (disabled) return;
      const parsed = Number(String(raw).replace(',', '.'));
      const grossKg = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;

      setSelectedMap((prev) => {
        if (prev[palletId] === undefined) return prev;
        return {
          ...prev,
          [palletId]: { ...prev[palletId], grossKg },
        };
      });
    },
    [disabled]
  );

  const formatNumber = useCallback((value: number, decimals = 0) => {
    return new Intl.NumberFormat('es-CL', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }, []);

  const selectedEntries = useMemo(() => Object.entries(selectedMap), [selectedMap]);
  const linesDefineTotals = expectedTrays === undefined || expectedTrays === null;

  return (
    <div
      className={
        plain
          ? `w-full ${className}`
          : `p-4 border rounded-md shadow-md bg-card ${className}`
      }
      data-test-id="pallet-picker"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          {!plain ? (
            <>
              <p className="text-sm font-semibold">
                {linesDefineTotals
                  ? 'Ingresa bandejas y kg brutos por pallet'
                  : 'Distribuye las bandejas entre pallets'}
              </p>
              {linesDefineTotals ? (
                <p className="mt-1 text-xs text-gray-500">
                  Totales: {formatNumber(totalAssigned)} bandejas · {formatNumber(totalGross, 2)} kg
                </p>
              ) : (
                <p className="mt-1 text-xs text-gray-500">
                  Asignadas: {formatNumber(totalAssigned)} / {formatNumber(expectedTrays ?? 0)}
                </p>
              )}
            </>
          ) : null}
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
        <div
          className={
            twoColumnCards
              ? 'mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2'
              : 'mt-4 space-y-3'
          }
        >
          {pallets.map((pallet) => {
            const line = selectedMap[pallet.id];
            const assigned = line?.trays ?? 0;
            const isSelected = line !== undefined;
            const borderClass = isSelected ? 'border-primary ring-1 ring-primary/50' : 'border-border';
            const backgroundClass = isSelected
              ? 'bg-primary/5'
              : twoColumnCards
                ? 'bg-gray-100'
                : 'bg-background';
            const otherTotal = sumTrays(selectedMap, pallet.id);
            const maxAssignable =
              expectedTrays !== undefined && expectedTrays !== null
                ? Math.min(pallet.availableTrays, Math.max(expectedTrays - otherTotal, 0))
                : pallet.availableTrays;
            const currentOccupied = Math.max(pallet.capacity - pallet.availableTrays, 0);
            const futureOccupied = Math.min(pallet.capacity, currentOccupied + assigned);
            const futureAvailable = Math.max(pallet.availableTrays - assigned, 0);
            const existingPct =
              pallet.capacity > 0
                ? Math.min(100, Math.max(0, (currentOccupied / pallet.capacity) * 100))
                : 0;
            const newPct =
              pallet.capacity > 0
                ? Math.min(100 - existingPct, Math.max(0, (assigned / pallet.capacity) * 100))
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
                className={`w-full text-left rounded-md border transition-colors ${
                  twoColumnCards ? 'p-2.5' : 'p-3'
                } ${borderClass} ${backgroundClass} ${
                  disabled
                    ? 'cursor-not-allowed opacity-60'
                    : 'cursor-pointer hover:border-primary'
                }`}
                data-test-id={`pallet-option-${pallet.id}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <p className={`font-semibold ${twoColumnCards ? 'text-xs' : 'text-sm'}`}>
                    Pallet #{pallet.id}
                  </p>
                  <p
                    className={`font-semibold text-primary shrink-0 ${
                      twoColumnCards ? 'text-xs' : 'text-sm'
                    }`}
                  >
                    {formatNumber(futureAvailable)} libres
                  </p>
                </div>
                <div
                  className={`relative w-full overflow-hidden rounded-full bg-slate-200 ${
                    twoColumnCards ? 'mt-1.5 h-2' : 'mt-2 h-2.5'
                  }`}
                >
                  <div
                    className="absolute left-0 top-0 h-full bg-slate-500 transition-all"
                    style={{ width: `${existingPct}%` }}
                    title={`Ya ocupado: ${formatNumber(currentOccupied)}`}
                  />
                  <div
                    className="absolute top-0 h-full bg-primary transition-all"
                    style={{ left: `${existingPct}%`, width: `${newPct}%` }}
                    title={`Nuevas: ${formatNumber(assigned)}`}
                  />
                </div>
                <p className={`text-gray-500 ${twoColumnCards ? 'mt-1 text-[10px]' : 'mt-2 text-xs'}`}>
                  Ocupado: {formatNumber(futureOccupied)} / {formatNumber(pallet.capacity)}
                  {assigned > 0 ? (
                    <span className="text-primary">
                      {' '}
                      (+{formatNumber(assigned)})
                    </span>
                  ) : null}
                </p>

                {isSelected ? (
                  <div
                    className={`space-y-2 ${twoColumnCards ? 'mt-2' : 'mt-3'}`}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <NumberStepper
                      label="Bandejas"
                      value={assigned}
                      onChange={(value) => handleTraysChange(pallet.id, value)}
                      min={0}
                      max={Math.max(0, maxAssignable)}
                      step={1}
                      allowNegative={false}
                      disabled={disabled || maxAssignable === 0}
                      data-test-id={`pallet-${pallet.id}-stepper`}
                    />
                    {captureGrossWeight ? (
                      <TextField
                        label="Kg brutos"
                        type="number"
                        value={line?.grossKg ? String(line.grossKg) : ''}
                        onChange={(e) => handleGrossChange(pallet.id, e.target.value)}
                        disabled={disabled}
                        data-test-id={`pallet-${pallet.id}-gross`}
                      />
                    ) : null}
                    {!twoColumnCards ? (
                      <p className="text-xs text-gray-500">
                        Disponible en pallet: {formatNumber(futureAvailable)} · Máx:{' '}
                        {formatNumber(Math.max(0, maxAssignable))}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
      {/* Resumen por pallet: solo fuera del layout columnas (la card ya tiene la info). */}
      {!plain && !twoColumnCards && selectedEntries.length > 0 ? (
        <div className="mt-4 rounded-md border bg-background p-3 text-xs text-gray-500">
          <p className="font-semibold text-gray-700">Resumen por pallet</p>
          <ul className="mt-2 space-y-1">
            {selectedEntries
              .filter(([, line]) => line.trays > 0)
              .map(([key, line]) => (
                <li key={key}>
                  Pallet #{key}: {formatNumber(line.trays)} ban.
                  {captureGrossWeight ? ` · ${formatNumber(line.grossKg || 0, 2)} kg` : ''}
                </li>
              ))}
          </ul>
          {!linesDefineTotals ? (
            <p className="mt-2">
              Restantes por asignar: {formatNumber(Math.max((expectedTrays ?? 0) - totalAssigned, 0))}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default PalletPicker;
