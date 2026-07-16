"use client";
import React, { useState, useEffect, useCallback } from 'react';
import TransactionData from './ui/TransactionData';
import { getProducersSimpleListWithLabel } from '@/app/actions/producers';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/baseComponents/Button/Button';
import ProcessedReceptionDialog from './ui/ProcessedReceptionDialog';
import PrintReceptionDialog from './ui/PrintReceptionDialog';
import { useAlert } from '@/app/state/contexts/AlertContext';
import { Option } from '@/app/baseComponents/AutoComplete/AutoComplete';
import { ReceptionDataSnapshot } from './ui/TransactionData';

export default function Page() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [producers, setProducers] = useState<Option[]>([]);
  const [initialProducerId, setInitialProducerId] = useState<string | undefined>(undefined);
  const [initialGuide, setInitialGuide] = useState<string | undefined>(undefined);
  const [initialDriver, setInitialDriver] = useState<string | undefined>(undefined);
  const [receptionSnapshot, setReceptionSnapshot] = useState<ReceptionDataSnapshot | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [processedReception, setProcessedReception] = useState<ReceptionDataSnapshot | null>(null);
  const [processedReceptionId, setProcessedReceptionId] = useState<string | null>(null);
  // Force TransactionData remount to clear its internal state after printing
  const [transactionFormKey, setTransactionFormKey] = useState(0);
  const { showAlert } = useAlert();

  useEffect(() => {
    const fetchProducers = async () => {
      const producersList = await getProducersSimpleListWithLabel();
      const producersMapped: Option[] = producersList.map(p => ({ id: p.id, label: p.label }));
      setProducers(producersMapped);
    };
    fetchProducers();
  }, []);

  useEffect(() => {
    const producerId = searchParams?.get('producerId');
    const guide = searchParams?.get('guide');
    const driver = searchParams?.get('driver');
    setInitialProducerId(producerId ? String(producerId) : undefined);
    setInitialGuide(guide ? String(guide) : undefined);
    setInitialDriver(driver ? String(driver) : undefined);
  }, [searchParams]);

  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (!mainElement) return;

    const customClass = 'new-recepcion-wide';
    const styleId = 'new-recepcion-wide-style';

    let styleElement = document.getElementById(styleId);
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = `
        main.${customClass} {
          max-width: min(100%, 90rem);
          padding-left: 1rem;
          padding-right: 1rem;
        }

        @media (min-width: 1280px) {
          main.${customClass} {
            max-width: min(100%, 100rem);
            padding-left: 1.5rem;
            padding-right: 1.5rem;
          }
        }

        @media (min-width: 1536px) {
          main.${customClass} {
            max-width: min(100%, 112rem);
            padding-left: 2rem;
            padding-right: 2rem;
          }
        }
      `;
      document.head.appendChild(styleElement);
    }

    mainElement.classList.add(customClass);

    return () => {
      mainElement.classList.remove(customClass);
      if (!document.querySelector(`main.${customClass}`) && styleElement?.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, []);

  const handleReceptionDataChange = useCallback((snapshot: ReceptionDataSnapshot) => {
    setReceptionSnapshot(snapshot);
  }, []);

  const handleProcessReception = () => {
    const missingReasons = [];

    if (!hasProducerSelected) {
      missingReasons.push('Selecciona un productor.');
    }

    if (!hasPacks) {
      missingReasons.push('Agrega al menos un pack.');
    }

    if (!allPacksHaveNetWeight) {
      missingReasons.push('Todos los packs deben tener peso neto mayor a 0.');
    }

    if (hasStockErrors) {
      missingReasons.push('No hay stock suficiente de bandejas para realizar la devolución.');
    }

    if (missingReasons.length > 0) {
      showAlert({
        message: missingReasons.join(' '),
        type: 'warning',
        duration: 5000,
      });
      return;
    }

    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
  };

  const handleDialogSave = useCallback(({ snapshot, receptionTransactionId }: { snapshot: ReceptionDataSnapshot; receptionTransactionId: string | null }) => {
    setIsDialogOpen(false);
    setProcessedReception(snapshot);
    setProcessedReceptionId(receptionTransactionId ?? null);
    setIsPrintDialogOpen(true);
    setReceptionSnapshot(null);
  }, []);

  const handlePrintDialogClose = useCallback(() => {
    setIsPrintDialogOpen(false);
    setIsDialogOpen(false);
    setProcessedReception(null);
    setProcessedReceptionId(null);
    setReceptionSnapshot(null);
    // Clear initial values to reset the form
    setInitialProducerId(undefined);
    setInitialGuide(undefined);
    setInitialDriver(undefined);
    // Clear URL search params
    router.replace('/home/receptions/simple', { scroll: false });
    setTransactionFormKey((prev) => prev + 1);
  }, [router]);

  const packs = receptionSnapshot?.packs ?? [];
  const trayDevolutions = receptionSnapshot?.trayDevolutions ?? [];
  const hasProducerSelected = Boolean(receptionSnapshot?.producer && receptionSnapshot.producer.id !== undefined && receptionSnapshot.producer.id !== null && String(receptionSnapshot.producer.id).length > 0);
  const hasPacks = packs.length > 0;
  const allPacksHaveNetWeight = packs.every((pack) => {
    const netWeight = Number(pack?.netWeight ?? 0);
    return Number.isFinite(netWeight) && netWeight > 0;
  });

  // Validar que haya stock suficiente para todas las devoluciones
  const trayOptions = receptionSnapshot?.trayOptions ?? [];
  const hasStockErrors = trayDevolutions.some(dev => {
    if (!dev.trayId || dev.quantity <= 0) return false;
    const trayOption = trayOptions.find(o => o.id === dev.trayId);
    return trayOption ? dev.quantity > trayOption.stock : false;
  });

  const totalValue = packs.reduce((sum, pack) => sum + (pack.totalToPay || 0), 0);
  const isProcessDisabled = !hasProducerSelected || !hasPacks || !allPacksHaveNetWeight || totalValue <= 0 || hasStockErrors;

  return (
    <div >
      <div>
        <TransactionData
          key={transactionFormKey}
          producers={producers}
          initialProducerId={initialProducerId}
          initialGuide={initialGuide}
          initialDriver={initialDriver}
          dataTestId="transaction-data-select"
          onReceptionDataChange={handleReceptionDataChange}
        />
      </div>
      <div className="flex justify-end mt-6">
        <Button
          variant="primary"
          onClick={handleProcessReception}
          aria-disabled={isProcessDisabled}
          className={isProcessDisabled ? 'opacity-60 cursor-not-allowed' : ''}
        >
          Procesar recepción
        </Button>
      </div>

      <ProcessedReceptionDialog
        open={isDialogOpen}
        onClose={handleDialogClose}
        onSave={handleDialogSave}
        data={receptionSnapshot}
      />

      <PrintReceptionDialog
        open={isPrintDialogOpen}
        onClose={handlePrintDialogClose}
        snapshot={processedReception}
        receptionTransactionId={processedReceptionId}
      />
    </div>
  );
}
