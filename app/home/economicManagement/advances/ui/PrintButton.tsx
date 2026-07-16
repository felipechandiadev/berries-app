'use client';

import { useState } from 'react';
import { getAdvanceDetail, type AdvanceDetail } from '@/app/actions/advances';
import DialogToPrint from '@/app/baseComponents/Dialog/DialogToPrint';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import { formatAuditDate } from '@/lib/dateTimeUtils';

const clpFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

function formatCLP(value: number): string {
  return clpFormatter.format(Number.isFinite(value) ? value : 0);
}

interface PrintButtonProps {
  advanceId: string;
}

export default function PrintButton({ advanceId }: PrintButtonProps) {
  const [detail, setDetail] = useState<AdvanceDetail | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const d = await getAdvanceDetail(advanceId);
      setDetail(d);
      setOpen(true);
    } catch (error) {
      console.error('Error fetching advance detail', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setDetail(null);
  };

  return (
    <>
      <IconButton
        icon="print"
        variant="basicSecondary"
        size="sm"
        onClick={handleClick}
        disabled={loading}
        ariaLabel="Imprimir recibo"
      />
      {detail && (
        <DialogToPrint
          open={open}
          onClose={handleClose}
          title="Recibo de anticipo"
          size="xs"
          contentClassName="bg-white"
          printLabel="Imprimir recibo"
          onBeforePrint={handleClose}
        >
          <div
            className="mx-auto flex flex-col gap-2 text-[11px] leading-tight text-foreground"
            style={{ width: '70mm', maxWidth: '80mm' }}
          >
            <header className="text-center">
              <h3 className="text-sm font-semibold uppercase">Anticipo</h3>
              <p className="text-[10px]">Comprobante para productor</p>
            </header>

            <section className="flex flex-col gap-1 border-t border-dashed border-border pt-2">
              <div className="flex justify-between text-[10px] uppercase">
                <span className="font-semibold">Anticipo</span>
                <span>#{detail.transactionId}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>Fecha:</span>
                <span>{formatAuditDate(detail.createdAt)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>Productor:</span>
                <span className="text-right">{detail.producerName || '—'}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>Temporada:</span>
                <span>{detail.seasonName || '—'}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>Monto:</span>
                <span>{formatCLP(detail.amount)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>Método:</span>
                <span>{detail.paymentMethod === 'CASH' ? 'Efectivo' : detail.paymentMethod === 'TRANSFER' ? 'Transferencia' : 'Cheque'}</span>
              </div>
              {detail.paymentReference && (
                <div className="flex justify-between text-[10px]">
                  <span>Referencia:</span>
                  <span>{detail.paymentReference}</span>
                </div>
              )}
              {detail.producerAccountName && (
                <div className="flex justify-between text-[10px]">
                  <span>Cuenta productor:</span>
                  <span className="text-right">{detail.producerAccountName}</span>
                </div>
              )}
              <div className="flex justify-between text-[10px]">
                <span>Operador:</span>
                <span>{detail.operatorName || '—'}</span>
              </div>
            </section>

            {detail.notes && (
              <section className="border-t border-dashed border-border pt-2">
                <h4 className="text-center text-[10px] font-semibold uppercase">Notas</h4>
                <p className="text-[10px] mt-1 text-center">{detail.notes}</p>
              </section>
            )}

            {detail.applications.length > 0 && (
              <section className="border-t border-dashed border-border pt-2">
                <h4 className="text-center text-[10px] font-semibold uppercase">Aplicaciones</h4>
                <div className="mt-1 flex flex-col gap-1">
                  {detail.applications.map((app, index) => (
                    <div key={index} className="rounded border border-border/70 p-1">
                      <div className="flex justify-between text-[10px] font-semibold">
                        <span>Aplicación {index + 1}</span>
                        <span>{formatCLP(app.amount)}</span>
                      </div>
                      <div className="mt-1 flex flex-col gap-[2px] text-[9px]">
                        <div className="flex justify-between">
                          <span>Fecha:</span>
                          <span>{formatAuditDate(app.appliedAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Usuario:</span>
                          <span>{app.userName || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Liquidación:</span>
                          <span>#{app.settlementTransactionId || '—'}</span>
                        </div>
                        {app.notes && (
                          <div className="mt-1">
                            <span>Notas:</span>
                            <p className="text-[9px] mt-[2px]">{app.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <footer className="border-t border-dashed border-border pt-2 text-center text-[9px] text-muted-foreground">
              <p>Gracias por su confianza.</p>
              <p>Conserve este comprobante para sus registros.</p>
            </footer>
          </div>


          
        </DialogToPrint>
      )}
    </>
  );
}