"use client";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Dialog from './Dialog';
import { Button } from '../Button/Button';
import IconButton from '../IconButton/IconButton';
import { hasPairedPrinter, isWebUsbSupported } from '@/lib/printing';

interface DialogToPrintProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /**
   * Optional size forwarded to the base Dialog component.
   * Defaults to `lg` which gives a comfortable width for printable content.
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  /**
   * Text for the print action button.
   */
  printLabel?: string;
  /**
   * Text for the close action button.
   */
  closeLabel?: string;
  /**
   * Optional className applied to the internal printable container.
   */
  contentClassName?: string;
  /**
   * Called right before opening the print preview.
   */
  onBeforePrint?: () => void;
  /**
   * Called after the print window is closed.
   */
  onAfterPrint?: () => void;
  /**
   * Z-index for the dialog. Defaults to 50 (same as base Dialog) so it can be overridden when needed.
   */
  zIndex?: number;
  /**
   * Optional DOM element to render the dialog into. Defaults to a body-level portal for better layering.
   */
  portalContainer?: HTMLElement | null;
  /**
   * Force using the browser print dialog instead of Electron silent printing when available.
   */
  preferBrowserPrint?: boolean;
  /**
   * Scroll behavior: 'body' keeps page scrollable; 'paper' enables internal scroller.
   * Defaults to 'paper' for better print layout control.
   */
  scroll?: 'body' | 'paper';
  /**
   * Extra CSS appended inside the print document head.
   */
  printStyles?: string;
  /**
   * When provided, shows Ticket USB action.
   * Emparejar impresora vive en la TopBar.
   * Should send ESC/POS bytes via WebUSB.
   */
  onPrintTicket?: () => Promise<void>;
  /**
   * Label for the USB ticket button.
   */
  ticketLabel?: string;
  /**
   * Optional controls rendered above the printable area (not included in print HTML).
   */
  controls?: React.ReactNode;
}

const DialogToPrint: React.FC<DialogToPrintProps> = ({
  open,
  onClose,
  title,
  children,
  size = 'lg',
  printLabel = 'Imprimir',
  closeLabel = 'Cerrar',
  contentClassName = '',
  onBeforePrint,
  onAfterPrint,
  zIndex = 50,
  portalContainer,
  preferBrowserPrint = false,
  scroll = 'paper',
  printStyles,
  onPrintTicket,
  ticketLabel = 'Ticket USB',
  controls,
}) => {
  const printableRef = useRef<HTMLDivElement | null>(null);
  const [defaultPortalElement, setDefaultPortalElement] = useState<HTMLElement | null>(null);
  const [ticketBusy, setTicketBusy] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [printerPaired, setPrinterPaired] = useState(false);
  const [webUsbAvailable, setWebUsbAvailable] = useState(false);
  const isBrowser = typeof window !== 'undefined';
  const showTicketActions = typeof onPrintTicket === 'function';

  useEffect(() => {
    if (!isBrowser || portalContainer) {
      setDefaultPortalElement(null);
      return;
    }

    const element = document.createElement('div');
    element.className = 'dialog-to-print-portal';
    document.body.appendChild(element);
    setDefaultPortalElement(element);

    return () => {
      document.body.removeChild(element);
    };
  }, [isBrowser, portalContainer]);

  useEffect(() => {
    if (!open || !showTicketActions || !isBrowser) {
      return;
    }

    setTicketError(null);
    const supported = isWebUsbSupported();
    setWebUsbAvailable(supported);
    if (!supported) {
      setPrinterPaired(false);
      return;
    }

    let cancelled = false;
    hasPairedPrinter()
      .then((paired) => {
        if (!cancelled) setPrinterPaired(paired);
      })
      .catch(() => {
        if (!cancelled) setPrinterPaired(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, showTicketActions, isBrowser]);

  const portalTarget = portalContainer ?? defaultPortalElement;

  const buildPrintableHtml = useCallback(() => {
    const content = printableRef.current;
    if (!content) {
      return null;
    }

    const headNodes = document.querySelectorAll('link[rel="stylesheet"], style');
    const styles = Array.from(headNodes)
      .map((node) => node.outerHTML)
      .join('\n');

    const baseHref = typeof window !== 'undefined' ? `${window.location.origin}/` : '/';

    const inlinePrintStyles = `
@media print {
  body {
    margin: 0;
    padding: 0;
  }
}
${printStyles ?? ''}`;

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charSet="utf-8" />
<title>${title ?? 'Documento'}</title>
<base href="${baseHref}" />
${styles}
<style>
${inlinePrintStyles}
</style>
</head>
<body>
<div id="print-root">${content.innerHTML}</div>
</body>
</html>`;
  }, [title, printStyles]);

  const printWithIframe = useCallback((html: string, skipBeforeHook = false) => {
    if (!skipBeforeHook) {
      onBeforePrint?.();
    }

    const iframe: HTMLIFrameElement = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const cleanup = () => {
      iframe.parentNode?.removeChild(iframe);
      onAfterPrint?.();
    };

    const iframeWindow = iframe.contentWindow as Window | null;
    if (!iframeWindow) {
      cleanup();
      return;
    }
    // Ensure we attach load handler before writing content for better compatibility
    const handleLoad = () => {
      try {
        iframeWindow.onafterprint = () => {
          try {
            cleanup();
          } finally {
            iframeWindow.onafterprint = null;
          }
        };

        // Use RAF to wait for painting
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            try {
              iframeWindow.focus();
              // Some environments require calling print with a small delay
              setTimeout(() => {
                try {
                  iframeWindow.print();
                } catch (err) {
                  cleanup();
                }
              }, 50);
            } catch (error) {
              cleanup();
            }
          });
        });
      } catch (err) {
        cleanup();
      }
    };

    iframe.addEventListener('load', handleLoad, { once: true });

    // Prefer srcdoc, but fall back to writing into the iframe document when not supported
    try {
      const anyIframe: any = iframe;
      if ('srcdoc' in anyIframe) {
        anyIframe.srcdoc = html;
      } else if (anyIframe.contentDocument) {
        const doc = anyIframe.contentDocument as Document;
        doc.open();
        doc.write(html);
        doc.close();
      } else {
        anyIframe.src = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
      }
    } catch (error) {
      // As a last resort, set src to data URL
      (iframe as any).src = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
    }
  }, [onAfterPrint, onBeforePrint]);

  const handlePrint = useCallback(async () => {
    const printableHtml = buildPrintableHtml();
    if (!printableHtml) {
      return;
    }

    if (preferBrowserPrint) {
      printWithIframe(printableHtml);
      return;
    }

    printWithIframe(printableHtml);
  }, [buildPrintableHtml, preferBrowserPrint, printWithIframe]);

  const handlePrintTicket = useCallback(async () => {
    if (!onPrintTicket) return;
    setTicketError(null);
    setTicketBusy(true);
    try {
      await onPrintTicket();
      setPrinterPaired(true);
    } catch (error: any) {
      const message = error?.message ?? 'No fue posible imprimir el ticket USB.';
      const hint =
        !printerPaired || /emparej/i.test(message)
          ? ' Emparejá la impresora desde el ícono de impresión en la barra superior.'
          : '';
      setTicketError(`${message}${hint}`);
    } finally {
      setTicketBusy(false);
    }
  }, [onPrintTicket, printerPaired]);

  const dialogContent = (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size={size}
      hideActions
      scroll={scroll}
      zIndex={zIndex}
    >
      {controls ? <div data-test-id="print-dialog-controls">{controls}</div> : null}
      <div
        ref={printableRef}
        className={`print-dialog-content flex w-full justify-center ${contentClassName}`.trim()}
        data-test-id="print-dialog-content"
      >
        {children}
      </div>

      {showTicketActions && ticketError ? (
        <div
          className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          data-test-id="print-ticket-error"
        >
          {ticketError}
        </div>
      ) : null}

      {showTicketActions && !webUsbAvailable ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Ticket USB requiere Chrome o Edge en HTTPS o localhost. Emparejá la impresora desde la
          barra superior.
        </p>
      ) : null}

      {showTicketActions && webUsbAvailable && !printerPaired ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Sin impresora emparejada. Usá el botón Impresora en la barra superior.
        </p>
      ) : null}

      <div
        className="mt-6 flex flex-wrap items-center justify-end gap-2"
        data-test-id="print-dialog-actions"
      >
        <Button variant="outlined" onClick={onClose} disabled={ticketBusy}>
          {closeLabel}
        </Button>
        <IconButton
          icon="print"
          variant={showTicketActions ? 'outlined' : 'containedPrimary'}
          size="md"
          onClick={handlePrint}
          disabled={ticketBusy}
          ariaLabel={printLabel}
          title={printLabel}
          data-test-id="print-dialog-browser-print"
        />
        {showTicketActions ? (
          <IconButton
            icon="receipt_long"
            variant="containedPrimary"
            size="md"
            onClick={handlePrintTicket}
            disabled={!webUsbAvailable || ticketBusy}
            isLoading={ticketBusy}
            ariaLabel={ticketLabel}
            title={ticketLabel}
            data-test-id="print-dialog-ticket-usb"
          />
        ) : null}
      </div>
    </Dialog>
  );
  
  if (!isBrowser) {
    return null;
  }
  // If for some reason portalTarget is not ready, fall back to document.body
  const effectiveTarget = portalTarget ?? (typeof document !== 'undefined' ? document.body : null);
  if (!effectiveTarget) return null;

  return createPortal(dialogContent, effectiveTarget);
};

export default DialogToPrint;
