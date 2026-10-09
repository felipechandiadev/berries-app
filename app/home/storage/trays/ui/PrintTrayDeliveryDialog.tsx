'use client';

import React, { useCallback, useMemo } from 'react';
import DialogToPrint from '@/app/baseComponents/Dialog/DialogToPrint';
import {
  buildTrayDeliveryTicketEscPos,
  destinationLines,
  formatTrayTicketDateParts,
  printRaw,
  trayDeliveryMovementLabel,
  type TrayDeliveryTicketSnapshot,
} from '@/lib/printing';

interface PrintTrayDeliveryDialogProps {
  open: boolean;
  onClose: () => void;
  snapshot: TrayDeliveryTicketSnapshot | null;
}

const numberFmt = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    maximumFractionDigits: 0,
  }).format(value ?? 0);

export default function PrintTrayDeliveryDialog({
  open,
  onClose,
  snapshot,
}: PrintTrayDeliveryDialogProps) {
  const printedAt = useMemo(() => new Date(), [open, snapshot?.transactionId]);

  const handlePrintTicket = useCallback(async () => {
    if (!snapshot) return;
    const bytes = await buildTrayDeliveryTicketEscPos(snapshot, new Date());
    await printRaw(bytes, { requestIfMissing: true });
  }, [snapshot]);

  if (!snapshot) return null;

  const { date, time } = formatTrayTicketDateParts(snapshot.createdAt, printedAt);
  const printed = formatTrayTicketDateParts(printedAt.toISOString(), printedAt);
  const dest = destinationLines(snapshot);
  const movementLabel = trayDeliveryMovementLabel(snapshot.counterpartyType);

  const thermalPrintStyles = `
@media print {
  @page { size: 80mm auto; margin: 2mm; }
  body { margin: 0; }
}
`;

  return (
    <DialogToPrint
      open={open}
      onClose={onClose}
      title="Comprobante de entrega"
      size="sm"
      contentClassName="bg-white"
      printLabel="Imprimir recibo"
      onBeforePrint={onClose}
      printStyles={thermalPrintStyles}
      onPrintTicket={handlePrintTicket}
      ticketLabel="Ticket USB"
    >
      <div
        className="flex flex-col gap-1 text-[13px] leading-tight text-foreground"
        style={{ width: '76mm', maxWidth: '76mm', padding: '0' }}
      >
        <header className="flex flex-col items-center gap-1 text-center">
          <p className="text-[13px] font-semibold uppercase">Comprobante de entrega</p>
          <p className="text-[12px]">Entrega de bandejas</p>
          {snapshot.showLogo !== false ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logoPrint.png"
                alt="Zeniz"
                className="h-auto w-[14mm] object-contain"
              />
            </>
          ) : null}
          <p className="text-[18px] font-bold tracking-wide">ZENIZ</p>
        </header>

        <section className="flex flex-col border-t border-dashed border-border pt-1">
          <h4 className="text-left text-[12px] font-semibold uppercase">Identificación</h4>
          <div className="text-[13px]">
            <span className="font-semibold">Folio: </span>
            <span>#{snapshot.transactionId}</span>
          </div>
          <div className="text-[13px]">
            <span>Tipo: </span>
            <span>{movementLabel}</span>
          </div>
          <div className="text-[13px]">
            <span>Fecha: </span>
            <span>{date}</span>
          </div>
          <div className="text-[13px]">
            <span>Hora: </span>
            <span>{time}</span>
          </div>
          {snapshot.seasonName ? (
            <div className="text-[13px]">
              <span>Temporada: </span>
              <span>{snapshot.seasonName}</span>
            </div>
          ) : null}
        </section>

        <section className="flex flex-col border-t border-dashed border-border pt-1">
          <h4 className="text-left text-[12px] font-semibold uppercase">Destino</h4>
          <div className="text-[13px]">
            <span>Tipo destinatario: </span>
            <span>{dest.counterpartyTypeLabel}</span>
          </div>
          <div className="text-[13px]">
            <span>{dest.destinationLabel}: </span>
            <span>{dest.destinationName}</span>
          </div>
          {dest.dni ? (
            <div className="text-[13px]">
              <span>RUT: </span>
              <span>{dest.dni}</span>
            </div>
          ) : null}
          {dest.deliveredTo ? (
            <div className="text-[13px]">
              <span>Entregada a: </span>
              <span>{dest.deliveredTo}</span>
            </div>
          ) : null}
        </section>

        <section className="border-t border-dashed border-border pt-1">
          <h4 className="text-left text-[12px] font-semibold uppercase">Detalle</h4>
          <div className="text-[13px]">
            <div>
              <span>Bandeja: </span>
              <span>{snapshot.trayName || '—'}</span>
            </div>
            <div>
              <span>Cantidad: </span>
              <span>{numberFmt(snapshot.quantity)} bandejas</span>
            </div>
            {snapshot.stockBefore != null ? (
              <div>
                <span>Stock anterior: </span>
                <span>{numberFmt(snapshot.stockBefore)}</span>
              </div>
            ) : null}
            {snapshot.stockAfter != null ? (
              <div>
                <span>Stock nuevo: </span>
                <span>{numberFmt(snapshot.stockAfter)}</span>
              </div>
            ) : null}
            {snapshot.reason ? (
              <div>
                <span>Motivo: </span>
                <span>{snapshot.reason}</span>
              </div>
            ) : null}
          </div>
        </section>

        <section className="border-t border-dashed border-border pt-1">
          <h4 className="text-left text-[12px] font-semibold uppercase">Registro</h4>
          {snapshot.performedByName ? (
            <div className="text-[13px]">
              <span>Registrado por: </span>
              <span>{snapshot.performedByName}</span>
            </div>
          ) : null}
          <div className="text-[13px]">
            <span>Impreso: </span>
            <span>
              {printed.date} {printed.time}
            </span>
          </div>
        </section>

        <footer className="border-t border-dashed border-border pt-1 text-center text-[12px]">
          <p>Comprobante de entrega de bandejas</p>
          <p>Conserve este documento</p>
        </footer>
      </div>
    </DialogToPrint>
  );
}
