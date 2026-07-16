'use client';

import { useState } from 'react';
import { getSettlementDetail, type SettlementDetail } from '@/app/actions/settlements';
import { PersonBankAccount } from '@/data/entities/Person';
import DialogToPrint from '@/app/baseComponents/Dialog/DialogToPrint';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import { formatAuditDate } from '@/lib/dateTimeUtils';

const printStyles = `
@page {
  size: Letter;
  margin: 5mm;
}
@media print {
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  /* Forzar fondo de headers */
  thead th, tfoot td {
    background-color: #f3f4f6 !important; /* bg-gray-100 */
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
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

function formatPaymentMethod(paymentMethod: string): string {
  return paymentMethod === 'CASH' ? 'Efectivo' : paymentMethod === 'TRANSFER' ? 'Transferencia' : 'Cheque';
}

function formatBankAccount(account: PersonBankAccount): string {
  return `${account.bank} - ${account.accountType} - ${account.accountNumber}${account.alias ? ` (${account.alias})` : ''}`;
}

interface PrintSettlementButtonProps {
  settlementId: string;
}

export default function PrintSettlementButton({ settlementId }: PrintSettlementButtonProps) {
  const [detail, setDetail] = useState<SettlementDetail | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const d = await getSettlementDetail(settlementId);
      setDetail(d);
      setOpen(true);
    } catch (error) {
      console.error('Error fetching settlement detail', error);
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
        ariaLabel="Imprimir liquidación"
      />

      {detail && (
        <DialogToPrint


          title="Vista Previa de Impresión"
          preferBrowserPrint

          open={open}
          onClose={handleClose}


          printStyles={printStyles}
          printLabel="Imprimir"
          closeLabel="Cerrar"


        >
                    <div className="flex flex-col gap-4 p-1">
            <div className="border-b border-gray-200 pb-0.5 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Liquidación #{detail.transactionId}</h2>
              <p className="text-sm text-gray-500">{formatAuditDate(detail.createdAt)}</p>
            </div>

            {/* Producer Info */}
            <section className="rounded-lg border border-gray-200 bg-gray-50 p-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs uppercase text-gray-500">Productor</p>
                  <p className="font-medium text-gray-900">{detail.producerName}</p>
                  <p className="text-sm text-gray-600">{detail.producerDni}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Temporada</p>
                  <p className="font-medium text-gray-900">{detail.seasonName}</p>
                </div>
              </div>
            </section>

            {/* Summary Boxes */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-gray-200 p-2">
                <p className="text-xs font-medium uppercase text-gray-500">Total Recepciones</p>
                <p className="mt-1 text-sm font-bold text-gray-900">{formatCLP(detail.totals.receptionsTotal)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-2">
                <p className="text-xs font-medium uppercase text-gray-500">Total Anticipos</p>
                <p className="mt-1 text-sm font-bold text-gray-900">-{formatCLP(detail.totals.advancesTotal)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-2">
                <p className="text-xs font-medium uppercase text-gray-500">A Pagar</p>
                <p className="mt-1 text-sm font-bold text-gray-900">{formatCLP(detail.totals.balance)}</p>
              </div>
            </div>

            {/* Receptions Table */}
            <section>
              <h3 className="mb-1 font-semibold text-gray-900">Detalle de Recepciones</h3>
              <div className="overflow-hidden border border-gray-200">
                <table className="w-full text-[9px] text-left">
                  <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-1">Folio</th>
                      <th className="px-4 py-1">Fecha</th>
                      <th className="px-4 py-1">Variedad</th>
                      <th className="px-4 py-1">Formato</th>
                      <th className="px-4 py-1">Neto kg</th>
                      <th className="px-4 py-1">Precio</th>
                      <th className="px-4 py-1">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {detail.receptions.map((rec) => (
                      <tr key={rec.transactionId} className="border-b border-gray-200">
                        <td className="px-4 py-1">{rec.transactionId}</td>
                        <td className="px-4 py-1">{formatAuditDate(rec.createdAt)}</td>
                        <td className="px-4 py-1">{rec.varieties.join(', ')}</td>
                        <td className="px-4 py-1">{rec.formats.join(', ')}</td>
                        <td className="px-4 py-1">{rec.netWeightKg.toLocaleString('es-CL')}</td>
                        <td className="px-4 py-1">{formatCLP(rec.price)}</td>
                        <td className="px-4 py-1">{formatCLP(rec.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100">
                    <tr>
                      <td colSpan={4} className="px-4 py-1 font-medium text-gray-900">
                        
                      </td>
                      <td className="px-4 py-1 font-bold text-gray-900">
                        {detail.receptions.reduce((sum, rec) => sum + rec.netWeightKg, 0).toLocaleString('es-CL')}
                      </td>
                      <td className="px-4 py-1 font-medium text-gray-900">
                        
                      </td>
                      <td className="px-4 py-1 font-bold text-gray-900">
                        {formatCLP(detail.receptions.reduce((sum, rec) => sum + rec.totalPrice, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            {/* Advances Table */}
            {detail.advances.length > 0 && (
              <section>
                <h3 className="mb-0.5 font-semibold text-gray-900">Descuento de Anticipos</h3>
                <div className="overflow-hidden border border-gray-200">
                  <table className="w-full text-[9px] text-left">
                    <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-1">Folio</th>
                        <th className="px-4 py-1">Fecha</th>
                        <th className="px-4 py-1">Medio de Pago</th>
                        <th className="px-4 py-1">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {detail.advances.map((adv) => (
                        <tr key={adv.transactionId} className="border-b border-gray-200">
                          <td className="px-4 py-1">{adv.transactionId}</td>
                          <td className="px-4 py-1">{formatAuditDate(adv.createdAt)}</td>
                          <td className="px-4 py-1">{formatPaymentMethod(adv.paymentMethod)}</td>
                          <td className="px-4 py-1">-{formatCLP(adv.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-100">
                      <tr>
                        <td colSpan={3} className="px-4 py-1"></td>
                        <td className="px-4 py-1 font-bold text-gray-900">-{formatCLP(detail.advances.reduce((sum, adv) => sum + adv.amount, 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            )}

            {/* Payment Details */}
            <section className="rounded-lg border border-gray-200 bg-white p-2">
              <h3 className="mb-0.5 font-semibold text-gray-900">Información de Pago</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase text-gray-500">Método</p>
                  <p className="font-medium text-gray-900">
                    {detail.paymentMethod === 'CASH' ? 'Efectivo' : detail.paymentMethod === 'TRANSFER' ? 'Transferencia' : 'Cheque'}
                  </p>
                </div>
                {detail.paymentMethod === 'TRANSFER' && detail.producerBankAccounts && detail.producerBankAccounts.length > 0 && (
                  <div>
                    <p className="text-xs uppercase text-gray-500">Cuenta Productor</p>
                    <p className="font-medium text-gray-900">
                      {detail.producerBankAccounts.find(acc => acc.isPrimary)
                        ? formatBankAccount(detail.producerBankAccounts.find(acc => acc.isPrimary)!)
                        : formatBankAccount(detail.producerBankAccounts[0])}
                    </p>
                  </div>
                )}
                {detail.paymentDetails?.checkNumber && (
                  <div>
                    <p className="text-xs uppercase text-gray-500">Nº Cheque</p>
                    <p className="font-medium text-gray-900">{detail.paymentDetails.checkNumber}</p>
                  </div>
                )}
                {detail.paymentDetails?.transactionId && (
                  <div>
                    <p className="text-xs uppercase text-gray-500">Referencia</p>
                    <p className="font-medium text-gray-900">{detail.paymentDetails.transactionId}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Notes Section */}
            {detail.notes && (
              <section className="rounded-lg border border-gray-200 bg-white p-1">
                <h3 className="mb-0.5 font-semibold text-gray-900">Notas</h3>
                <p className="text-gray-700">{detail.notes}</p>
              </section>
            )}
          </div>
        </DialogToPrint>
      )}
    </>
  );
}
