'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  hasPairedPrinter,
  isWebUsbSupported,
  pairPrinter,
} from '@/lib/printing';

/**
 * Emparejado de impresora térmica USB desde la top bar (fuera del diálogo de impresión).
 */
const PrinterSetupButton: React.FC = () => {
  const [supported, setSupported] = useState(false);
  const [paired, setPaired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const refresh = useCallback(async () => {
    if (!isWebUsbSupported()) {
      setSupported(false);
      setPaired(false);
      return;
    }
    setSupported(true);
    try {
      setPaired(await hasPairedPrinter());
    } catch {
      setPaired(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    if (!isWebUsbSupported()) return;

    const onChange = () => {
      void refresh();
    };
    navigator.usb.addEventListener('connect', onChange);
    navigator.usb.addEventListener('disconnect', onChange);
    return () => {
      navigator.usb.removeEventListener('connect', onChange);
      navigator.usb.removeEventListener('disconnect', onChange);
    };
  }, [refresh]);

  const handleClick = async () => {
    setError(null);
    if (!supported) {
      setShowHint(true);
      return;
    }
    setBusy(true);
    try {
      await pairPrinter();
      setPaired(true);
      setShowHint(false);
    } catch (err: any) {
      setError(err?.message ?? 'No fue posible emparejar la impresora.');
      setPaired(false);
      setShowHint(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative" data-test-id="topbar-printer-setup">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        title={
          paired
            ? 'Impresora USB emparejada (clic para volver a emparejar)'
            : 'Emparejar impresora térmica USB'
        }
        className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors focus:outline-none ${
          paired
            ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15'
            : 'border-border bg-background text-foreground hover:border-primary hover:text-primary'
        } ${busy ? 'opacity-60 cursor-wait' : ''}`}
        data-test-id="topbar-printer-button"
        aria-label={paired ? 'Impresora emparejada' : 'Emparejar impresora'}
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden>
          print
        </span>
        <span className="hidden sm:inline">
          {busy ? 'Emparejando…' : paired ? 'Impresora OK' : 'Impresora'}
        </span>
      </button>

      {showHint && (error || !supported) ? (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-md border border-border bg-white p-3 text-xs shadow-lg"
          role="status"
        >
          {!supported ? (
            <p className="text-muted-foreground">
              Ticket USB requiere Chrome o Edge en HTTPS o localhost.
            </p>
          ) : (
            <p className="text-red-600">{error}</p>
          )}
          <button
            type="button"
            className="mt-2 text-primary underline"
            onClick={() => setShowHint(false)}
          >
            Cerrar
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default PrinterSetupButton;
