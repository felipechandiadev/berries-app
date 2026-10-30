'use client';

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { Option } from '@/app/baseComponents/AutoComplete/AutoComplete';
import { Button } from '@/app/baseComponents/Button/Button';
import Switch from '@/app/baseComponents/Switch/Switch';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import DotProgress from '@/app/baseComponents/DotProgress/DotProgress';
import type { PendingAdvancesResult, PendingReceptionRow, PendingReceptionsResult } from '@/app/actions/settlements';
import { bulkUpdatePendingReceptionExchangeRate, createSettlement, updateSettlement } from '@/app/actions/settlements';
import { getActiveSeason } from '@/app/actions/seasons';
import { useAlert } from '@/app/state/hooks/useAlert';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import PendingReceptionsSection from './PendingReceptionsSection';
import PendingAdvancesSection from './PendingAdvancesSection';
import SettlementSummary from './SettlementSummary';
import SettlementPaymentSection, { type PaymentData } from './SettlementPaymentSection';
import {
  MONTH_FILTER_ALL,
  buildMonthFilterOptions,
  getRecentMonthKeys,
  matchesMonthFilter,
} from '@/lib/monthFilter';

interface NewSettlementContentProps {
  producerOptions: Option[];
  selectedProducerId?: string;
  receptions: PendingReceptionsResult;
  advances: PendingAdvancesResult;
  mode?: 'create' | 'edit';
  initialData?: any;
  settlementId?: string;
}

const toIdSet = (ids: string[]): Set<string> => new Set(ids);

const calculateReceptionTotal = (row: PendingReceptionRow): number => {
  // El servidor es la fuente de verdad (misma regla que usa al guardar la liquidación).
  return Number.isFinite(row.totalCLPToPay) ? row.totalCLPToPay : 0;
};

export default function NewSettlementContent({
  producerOptions,
  selectedProducerId,
  receptions,
  advances,
  mode = 'create',
  initialData,
  settlementId,
}: NewSettlementContentProps) {
  const [receptionsData, setReceptionsData] = useState<PendingReceptionsResult>(receptions);
  const [selectedReceptionIds, setSelectedReceptionIds] = useState<Set<string>>(
    () => {
      if (mode === 'edit' && initialData) {
        return new Set(initialData.linkedReceptionIds);
      }
      return toIdSet(receptions.rows.filter((row) => !row.isUnpriced).map((row) => row.transactionId));
    }
  );
  const [selectedAdvanceIds, setSelectedAdvanceIds] = useState<Set<string>>(
    () => {
      if (mode === 'edit' && initialData) {
        return new Set(initialData.linkedAdvanceIds);
      }
      return toIdSet(advances.rows.map((row) => row.transactionId));
    }
  );
  const [paymentData, setPaymentData] = useState<PaymentData>(() => {
    if (mode === 'edit' && initialData?.metadata) {
      return {
        paymentMethod: initialData.metadata.paymentMethod || 'CASH',
        bankAccountId: initialData.metadata.paymentDetails?.bankAccountId || '',
        producerAccountId: initialData.metadata.paymentDetails?.producerAccountId || '',
        checkNumber: initialData.metadata.paymentDetails?.checkNumber || '',
        transferReference: initialData.metadata.paymentDetails?.transactionId || '',
      };
    }
    return {
      paymentMethod: 'CASH',
      bankAccountId: '',
      producerAccountId: '',
      checkNumber: '',
      transferReference: '',
    };
  });
  const [notes, setNotes] = useState<string>(() => {
    if (mode === 'edit' && initialData?.metadata) {
      return initialData.metadata.notes || '';
    }
    return '';
  });
  const [isDraft, setIsDraft] = useState(() => {
    if (mode === 'edit' && initialData?.metadata) {
      return !!initialData.metadata.isDraft;
    }
    return false;
  });
  const [receptionMonth, setReceptionMonth] = useState<string>(MONTH_FILTER_ALL);
  const [advanceMonth, setAdvanceMonth] = useState<string>(MONTH_FILTER_ALL);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSeason, setActiveSeason] = useState<{ id: string; name: string } | null>(null);
  const [isBulkExchangeDialogOpen, setIsBulkExchangeDialogOpen] = useState(false);
  const [bulkExchangeRateInput, setBulkExchangeRateInput] = useState('');
  const [bulkExchangeReason, setBulkExchangeReason] = useState('');
  const [isBulkExchangeSubmitting, setIsBulkExchangeSubmitting] = useState(false);
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const router = useRouter();
  const { success, error: showError } = useAlert();

  useEffect(() => {
    const loadActiveSeason = async () => {
      try {
        const seasonResult = await getActiveSeason();
        if (seasonResult.success && seasonResult.data) {
          const season = seasonResult.data as { id: string; name: string };
          setActiveSeason({ id: season.id, name: season.name });
        }
      } catch (error) {
        console.error('Error loading active season:', error);
      }
    };
    loadActiveSeason();
  }, []);

  useEffect(() => {
    setReceptionsData(receptions);
  }, [receptions]);

  const recentMonthKeys = useMemo(() => getRecentMonthKeys(), []);
  const receptionMonthOptions = useMemo(
    () => buildMonthFilterOptions(receptionsData.rows, recentMonthKeys),
    [receptionsData.rows, recentMonthKeys],
  );
  const advanceMonthOptions = useMemo(
    () => buildMonthFilterOptions(advances.rows, recentMonthKeys),
    [advances.rows, recentMonthKeys],
  );

  const filteredReceptions = useMemo<PendingReceptionsResult>(() => {
    const rows = receptionsData.rows.filter((row) => matchesMonthFilter(row.createdAt, receptionMonth, recentMonthKeys));
    const unpriced = rows.filter((row) => row.isUnpriced);
    return {
      ...receptionsData,
      rows,
      unpricedCount: unpriced.length,
      unpricedKg: unpriced.reduce((total, row) => total + row.netWeightKg, 0),
    };
  }, [receptionsData, receptionMonth, recentMonthKeys]);

  const filteredAdvances = useMemo<PendingAdvancesResult>(() => ({
    ...advances,
    rows: advances.rows.filter((row) => matchesMonthFilter(row.createdAt, advanceMonth, recentMonthKeys)),
  }), [advances, advanceMonth, recentMonthKeys]);

  const receptionIdSignature = useMemo(() => {
    return filteredReceptions.rows.map((row) => row.transactionId).join('|');
  }, [filteredReceptions.rows]);

  const handleSubmit = async () => {
    if (!selectedProducerId) {
      showError('Seleccione un productor');
      return;
    }
    if (!activeSeason) {
      showError('No hay temporada activa');
      return;
    }
    if (!currentUserId) {
      showError('Usuario no autenticado');
      return;
    }
    if (selectedReceptionIds.size === 0) {
      showError('Seleccione al menos una recepción');
      return;
    }
    if (balance < 0) {
      showError('El balance no puede ser negativo');
      return;
    }
    if (!isDraft) {
      const unpriced = receptionsData.rows.filter((row) => row.isUnpriced && selectedReceptionIds.has(row.transactionId));
      if (unpriced.length > 0) {
        showError(`Hay ${unpriced.length} recepción(es) sin precio seleccionadas. Desmárquelas, asigne el precio o guarde como borrador.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const settlementData = {
        producerId: selectedProducerId,
        seasonId: activeSeason.id,
        selectedReceptionIds: Array.from(selectedReceptionIds),
        selectedAdvanceIds: Array.from(selectedAdvanceIds),
        paymentMethod: paymentData.paymentMethod,
        paymentDetails: {
          producerAccountId: paymentData.producerAccountId || undefined,
          bankAccountId: paymentData.bankAccountId || undefined,
          transactionId: paymentData.transferReference || undefined,
          checkNumber: paymentData.checkNumber || undefined,
        },
        totals: {
          receptionsCount,
          receptionsTotal,
          advancesCount,
          advancesTotal,
          balance,
        },
        notes: notes || undefined,
        isDraft: isDraft,
        userId: currentUserId,
      };

      const result = mode === 'edit' && settlementId
        ? await updateSettlement(settlementId, settlementData)
        : await createSettlement(settlementData);

      if (!result.success) {
        showError(result.error || 'Error al guardar la liquidación');
        return;
      }
      success(mode === 'edit' && settlementId ? 'Liquidación actualizada exitosamente' : 'Liquidación creada exitosamente');
      
      // Limpiar todos los datos y redirigir para limpiar el productor seleccionado
      setSelectedReceptionIds(new Set());
      setSelectedAdvanceIds(new Set());
      setPaymentData({
        paymentMethod: 'CASH',
        bankAccountId: '',
        producerAccountId: '',
        checkNumber: '',
        transferReference: '',
      });
      setNotes('');
      
      // Redirigir a la página base de nuevas liquidaciones para limpiar el productor
      router.push('/home/economicManagement/settlements?tab=list');
    } catch (error) {
      console.error('Error saving settlement:', error);
      showError(error instanceof Error ? error.message : 'Error al guardar la liquidación');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (mode === 'create') {
      // Las recepciones sin precio no se preseleccionan: valen $0 y no se pueden confirmar.
      setSelectedReceptionIds(toIdSet(filteredReceptions.rows.filter((row) => !row.isUnpriced).map((row) => row.transactionId)));
    }
  }, [mode, receptionIdSignature, filteredReceptions.rows]);

  useEffect(() => {
    setSelectedReceptionIds((prev) => {
      if (prev.size === 0) {
        return prev;
      }
      const available = new Set(filteredReceptions.rows.map((row) => row.transactionId));
      const filtered = Array.from(prev).filter((id) => available.has(id));
      if (filtered.length === prev.size) {
        return prev;
      }
      return new Set(filtered);
    });
  }, [receptionIdSignature, filteredReceptions.rows]);

  useEffect(() => {
    if (mode === 'create') {
      setSelectedAdvanceIds(toIdSet(filteredAdvances.rows.map((row) => row.transactionId)));
    }
  }, [filteredAdvances.rows, mode]);

  // Lo que queda fuera del mes filtrado no puede seguir seleccionado (ni sumar en el resumen).
  useEffect(() => {
    setSelectedAdvanceIds((prev) => {
      const available = new Set(filteredAdvances.rows.map((row) => row.transactionId));
      const kept = Array.from(prev).filter((id) => available.has(id));
      return kept.length === prev.size ? prev : new Set(kept);
    });
  }, [filteredAdvances.rows]);

  const handleReceptionToggle = (id: string, checked: boolean) => {
    setSelectedReceptionIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleAdvanceToggle = (id: string, checked: boolean) => {
    setSelectedAdvanceIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const canBulkUpdateExchangeRate = useMemo(() => {
    return Boolean(selectedProducerId) && selectedReceptionIds.size > 0;
  }, [selectedProducerId, selectedReceptionIds.size]);

  const handleCloseBulkExchangeDialog = useCallback(() => {
    setIsBulkExchangeDialogOpen(false);
    setBulkExchangeRateInput('');
    setBulkExchangeReason('');
  }, []);

  const handleOpenBulkExchangeDialog = useCallback(() => {
    if (!selectedProducerId) {
      showError('Seleccione un productor para editar el tipo de cambio.');
      return;
    }
    if (selectedReceptionIds.size === 0) {
      showError('Seleccione al menos una recepción para editar el tipo de cambio.');
      return;
    }

    const selectedRows = receptionsData.rows.filter((row) => selectedReceptionIds.has(row.transactionId));
    if (selectedRows.length === 0) {
      showError('No se encontraron recepciones válidas para actualizar.');
      return;
    }

    const referenceRate = Number(selectedRows[0]?.exchangeRate ?? 0);
    const allShareRate = selectedRows.every((row) => Number(row.exchangeRate ?? 0) === referenceRate);
    const formattedRate = referenceRate > 0 && allShareRate
      ? referenceRate.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
      : '';

    setBulkExchangeRateInput(formattedRate);
    setBulkExchangeReason('');
    setIsBulkExchangeDialogOpen(true);
  }, [receptionsData.rows, selectedProducerId, selectedReceptionIds, showError]);

  const handleBulkExchangeRateInputChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const sanitized = event.target.value.replace(/[^0-9.,]/g, '');
    setBulkExchangeRateInput(sanitized);
  }, []);

  const handleBulkExchangeRateUpdate = useCallback(async () => {
    if (!selectedProducerId) {
      showError('Seleccione un productor para editar el tipo de cambio.');
      return;
    }
    if (selectedReceptionIds.size === 0) {
      showError('Seleccione al menos una recepción.');
      return;
    }
    if (!currentUserId) {
      showError('Usuario no autenticado');
      return;
    }

    const rawValue = bulkExchangeRateInput.trim();
    if (!rawValue) {
      showError('Ingrese un tipo de cambio válido');
      return;
    }

    const normalizedValue = rawValue.includes(',')
      ? rawValue.replace(/\./g, '').replace(',', '.')
      : rawValue;
    const rate = Number(normalizedValue);
    if (!Number.isFinite(rate) || rate <= 0) {
      showError('Ingrese un tipo de cambio válido');
      return;
    }

    if (!bulkExchangeReason.trim()) {
      showError('Ingrese un motivo para el cambio de tipo de cambio');
      return;
    }

    const targetIds = Array.from(selectedReceptionIds);
    const targetIdSet = new Set(targetIds);

    setIsBulkExchangeSubmitting(true);
    try {
      const result = await bulkUpdatePendingReceptionExchangeRate({
        receptionIds: targetIds,
        exchangeRate: rate,
        reason: bulkExchangeReason.trim(),
        userId: currentUserId,
      });
      const failedIds = new Set(result.failures?.map((failure) => failure.receptionId) ?? []);

      if (result.updated > 0) {
        setReceptionsData((prev) => ({
          ...prev,
          rows: prev.rows.map((row) => {
            if (!targetIdSet.has(row.transactionId) || failedIds.has(row.transactionId)) {
              return row;
            }
            const updatedTotal = Math.max(0, row.totalToPayCLP + row.totalToPayUSD * rate);
            return {
              ...row,
              exchangeRate: rate,
              totalCLPToPay: updatedTotal,
            };
          }),
        }));

        const fullSuccess = result.updated === targetIds.length && !(result.failures?.length);
        success(fullSuccess ? 'Tipo de cambio actualizado correctamente' : `Tipo de cambio actualizado en ${result.updated} recepciones`);
        if (fullSuccess) {
          handleCloseBulkExchangeDialog();
        }
      }

      if (result.failures?.length) {
        showError(`No se pudieron actualizar ${result.failures.length} recepciones.`);
      } else if (!result.success && result.updated === 0) {
        showError(result.error ?? 'No fue posible actualizar el tipo de cambio.');
      }
    } catch (error) {
      console.error('Error updating exchange rate:', error);
      showError(error instanceof Error ? error.message : 'Error al actualizar el tipo de cambio.');
    } finally {
      setIsBulkExchangeSubmitting(false);
    }
  }, [
    bulkExchangeRateInput,
    bulkExchangeReason,
    currentUserId,
    handleCloseBulkExchangeDialog,
    selectedProducerId,
    selectedReceptionIds,
    showError,
    success,
  ]);

  const {
    receptionsCount,
    receptionsTotal,
    advancesCount,
    advancesTotal,
    balance,
  } = useMemo(() => {
    const selectedReceptions = filteredReceptions.rows.filter((row) => selectedReceptionIds.has(row.transactionId));
    const selectedAdvances = filteredAdvances.rows.filter((row) => selectedAdvanceIds.has(row.transactionId));

    const receptionsTotalAmount = selectedReceptions.reduce((total, row) => total + calculateReceptionTotal(row), 0);
    const advancesTotalAmount = selectedAdvances.reduce((total, row) => total + row.availableAmount, 0);

    return {
      receptionsCount: selectedReceptions.length,
      receptionsTotal: receptionsTotalAmount,
      advancesCount: selectedAdvances.length,
      advancesTotal: advancesTotalAmount,
      balance: receptionsTotalAmount - advancesTotalAmount,
    };
  }, [filteredAdvances.rows, filteredReceptions.rows, selectedAdvanceIds, selectedReceptionIds]);

  return (
    <>
      <div className="space-y-8">
        <PendingReceptionsSection
          producerOptions={producerOptions}
          selectedProducerId={selectedProducerId}
          data={filteredReceptions}
          monthOptions={receptionMonthOptions}
          monthFilter={receptionMonth}
          onMonthChange={setReceptionMonth}
          selectedIds={selectedReceptionIds}
          onToggle={handleReceptionToggle}
          producerDisabled={mode === 'edit'}
          onBulkExchangeRateClick={handleOpenBulkExchangeDialog}
          canBulkUpdateExchangeRate={canBulkUpdateExchangeRate}
          bulkExchangeRateLoading={isBulkExchangeSubmitting}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <PendingAdvancesSection
            selectedProducerId={selectedProducerId}
            data={filteredAdvances}
            monthOptions={advanceMonthOptions}
            monthFilter={advanceMonth}
            onMonthChange={setAdvanceMonth}
            selectedIds={selectedAdvanceIds}
            onToggle={handleAdvanceToggle}
          />
          <SettlementSummary
            receptionsCount={receptionsCount}
            receptionsTotal={receptionsTotal}
            advancesCount={advancesCount}
            advancesTotal={advancesTotal}
            balance={balance}
          />
        </div>

        <SettlementPaymentSection
          selectedProducerId={selectedProducerId}
          onPaymentChange={setPaymentData}
          initialPaymentData={paymentData}
        />

        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-primary">Notas</h2>
          </div>
          <TextField
            label="Notas globales"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            type="textarea"
            rows={3}
            placeholder="Agregue notas adicionales sobre la liquidación, observaciones o comentarios relevantes..."
          />
        </section>

        <div>
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-background px-6 py-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <Switch
              label="Guardar como borrador"
              labelPosition="right"
              checked={isDraft}
              onChange={(checked) => setIsDraft(checked)}
            />
            <Button
              type="button"
              variant="primary"
              className="px-6 py-2"
              onClick={handleSubmit}
              disabled={isSubmitting || balance < 0}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center min-h-[20px]">
                  <DotProgress size={12} />
                </div>
              ) : (
                mode === 'edit' ? 'Actualizar liquidación' : 'Guardar liquidación'
              )}
            </Button>
          </div>
        </div>
      </div>

      <Dialog
        open={isBulkExchangeDialogOpen}
        onClose={handleCloseBulkExchangeDialog}
        title="Editar tipo de cambio"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Se {selectedReceptionIds.size === 1 ? 'modificará' : 'modificarán'} el tipo de cambio de {selectedReceptionIds.size}{' '}
            recepción{selectedReceptionIds.size === 1 ? '' : 'es'} seleccionada{selectedReceptionIds.size === 1 ? '' : 's'}.
          </p>

          <TextField
            label="Tipo de cambio (CLP/USD)"
            value={bulkExchangeRateInput}
            onChange={handleBulkExchangeRateInputChange}
            placeholder="Ej: 850,50"
          />

          <TextField
            label="Motivo del cambio"
            type="textarea"
            rows={3}
            value={bulkExchangeReason}
            onChange={(event) => setBulkExchangeReason(event.target.value)}
            placeholder="Describe el motivo del ajuste en el tipo de cambio"
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseBulkExchangeDialog}
              disabled={isBulkExchangeSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleBulkExchangeRateUpdate}
              disabled={isBulkExchangeSubmitting}
            >
              {isBulkExchangeSubmitting ? (
                <div className="flex items-center justify-center min-h-[20px]">
                  <DotProgress size={12} />
                </div>
              ) : (
                'Actualizar cambio'
              )}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
