'use client';

import { useState } from 'react';
import { getAdvanceDetail, type AdvanceDetail } from '@/app/actions/advances';
import DialogToPrint from '@/app/baseComponents/Dialog/DialogToPrint';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import { formatAuditDate } from '@/lib/dateTimeUtils';

const printStyles = `
@page {
  size: Letter;
  margin: 10mm;
}
@media print {
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  /* Reducción de fuentes para impresión */
  .text-2xl { font-size: 14pt !important; }
  .text-xl { font-size: 12pt !important; }
  .text-lg { font-size: 10pt !important; }
  .text-base { font-size: 9pt !important; }
  .text-sm { font-size: 8pt !important; }
  .text-xs { font-size: 7pt !important; }
  
  /* Espaciado más compacto */
  .p-4 { padding: 8px !important; }
  .gap-6 { gap: 12px !important; }
  .space-y-6 > :not([hidden]) ~ :not([hidden]) { margin-top: 12px !important; }
  .space-y-4 > :not([hidden]) ~ :not([hidden]) { margin-top: 8px !important; }
  .space-y-3 > :not([hidden]) ~ :not([hidden]) { margin-top: 6px !important; }
}
`;

const clpFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

function formatCLP(value: number): string {
  return clpFormatter.format(Number.isFinite(value) ? value : 0);
}

interface DetailButtonProps {
  advanceId: string;
}

export default function DetailButton({ advanceId }: DetailButtonProps) {
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
        icon="more_horiz"
        variant="basicSecondary"
        size="sm"
        onClick={handleClick}
        disabled={loading}
        ariaLabel="Ver detalle"
      />

      {detail && (
        <DialogToPrint
          open={open}
          onClose={handleClose}
          size="xl"
          title='Vista previa'
          printStyles={printStyles}
          printLabel="Imprimir"
          closeLabel="Cerrar"
          preferBrowserPrint={true}
          scroll= "body"
      
        >
          <div className="flex flex-col gap-6">
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-xl font-bold text-gray-900">Detalle del Anticipo #{detail.transactionId}</h2>
            </div>

            {/* Header Section with Key Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Amount Box */}
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-xs font-medium uppercase text-emerald-600">Monto</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">{formatCLP(detail.amount)}</p>
              </div>
              {/* Date Box */}
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-medium uppercase text-gray-500">Fecha Creación</p>
                <p className="mt-1 text-lg font-semibold text-gray-700">{formatAuditDate(detail.createdAt)}</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left Column: Producer & Payment Info */}
              <div className="space-y-6">
                {/* Producer Card */}
                <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
                    <h3 className="font-semibold text-gray-900">Información del Productor</h3>
                  </div>
                  <div className="space-y-3 p-4">
                    <div>
                      <p className="text-xs uppercase text-gray-500">Nombre</p>
                      <p className="font-medium text-gray-900">{detail.producerName || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500">RUT</p>
                      <p className="font-medium text-gray-900">{detail.producerDni || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500">Temporada</p>
                      <p className="font-medium text-gray-900">{detail.seasonName || '—'}</p>
                    </div>
                  </div>
                </section>

                {/* Payment Details Card */}
                <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
                    <h3 className="font-semibold text-gray-900">Detalles del Pago</h3>
                  </div>
                  <div className="space-y-4 p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs uppercase text-gray-500">Método</p>
                        <p className="font-medium text-gray-900">
                          {detail.paymentMethod === 'CASH'
                            ? 'Efectivo'
                            : detail.paymentMethod === 'TRANSFER'
                              ? 'Transferencia'
                              : 'Cheque'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-gray-500">Referencia</p>
                        <p className="font-medium text-gray-900">{detail.paymentReference || '—'}</p>
                      </div>
                    </div>

                    {/* Bank Accounts Boxes */}
                    <div className="space-y-3">
                      <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
                        <p className="mb-1 text-xs font-medium uppercase text-slate-500">Cuenta de Origen</p>
                        <p className="text-sm font-medium text-slate-800">{detail.bankAccountName || '—'}</p>
                      </div>
                      <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
                        <p className="mb-1 text-xs font-medium uppercase text-slate-500">Cuenta de Destino (Productor)</p>
                        <p className="text-sm font-medium text-slate-800">{detail.producerAccountName || '—'}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs uppercase text-gray-500">Operador</p>
                      <p className="font-medium text-gray-900">{detail.operatorName || '—'}</p>
                    </div>
                  </div>
                </section>
              </div>

              {/* Right Column: Notes & Applications */}
              <div className="space-y-6">
                {/* Notes Card */}
                {detail.notes && (
                  <section className="rounded-lg border border-amber-100 bg-amber-50/50 shadow-sm">
                    <div className="px-4 py-3">
                      <h3 className="mb-2 text-sm font-semibold uppercase text-amber-800">Nota</h3>
                      <p className="text-sm leading-relaxed text-gray-700">{detail.notes}</p>
                    </div>
                  </section>
                )}

                {/* Applications History */}
                {detail.applications.length > 0 && (
                  <section className="h-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
                      <h3 className="font-semibold text-gray-900">Historial de Aplicaciones</h3>
                      <span className="rounded-full bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700">
                        {detail.applications.length}
                      </span>
                    </div>
                    <div className="max-h-[400px] space-y-3 overflow-y-auto p-4">
                      {detail.applications.map((app, index) => (
                        <div key={index} className="relative border-l-2 border-blue-200 pl-4 py-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-bold text-gray-900">{formatCLP(app.amount)}</p>
                              <p className="text-xs text-gray-500">{formatAuditDate(app.appliedAt)}</p>
                            </div>
                            {app.settlementTransactionId && (
                              <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-600">
                                Liq. #{app.settlementTransactionId}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-gray-600">Por: {app.userName || '—'}</p>
                          {app.notes && <p className="mt-1 text-xs italic text-gray-500">"{app.notes}"</p>}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>
        </DialogToPrint>
      )}
    </>
  );
}