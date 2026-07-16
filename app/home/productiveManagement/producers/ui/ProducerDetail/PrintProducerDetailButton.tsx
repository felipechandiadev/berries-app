'use client';

import React, { useState } from 'react';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import DialogToPrint from '@/app/baseComponents/Dialog/DialogToPrint';
import { ProducerDetailData } from './types';
import { translateTransactionType } from '@/lib/transactionUtils';
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

interface PrintProducerDetailButtonProps {
  data: ProducerDetailData;
}


function formatPaymentMethod(paymentMethod: string): string {
  return paymentMethod === 'CASH' ? 'Efectivo' : paymentMethod === 'TRANSFER' ? 'Transferencia' : paymentMethod === 'CHECK' ? 'Cheque' : paymentMethod || '-';
}

export const PrintProducerDetailButton: React.FC<PrintProducerDetailButtonProps> = ({ data }) => {
  const [isOpen, setIsOpen] = useState(false);

  const { producer, receptions, advances, settlements, trays } = data;

  const totalReceptions = receptions.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const totalAdvances = advances.reduce((sum, a) => sum + Number(a.amount || 0), 0);
  const totalSettlements = settlements.reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const producerBalance = totalReceptions - totalAdvances - totalSettlements;

  return (
    <>
      <IconButton
        icon="print"
        variant="text"
        onClick={() => setIsOpen(true)}
        title="Imprimir ficha completa"
        ariaLabel="Imprimir ficha completa del productor"
      />

      <DialogToPrint
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Vista Previa de Impresión"
        preferBrowserPrint
        printStyles={printStyles}
      >
          <div className="flex flex-col gap-4 p-1">
            <div className="border-b border-gray-200 pb-0.5 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Ficha Productor: {producer.name}</h2>
              <p className="text-sm text-gray-500">{new Date().toLocaleDateString('es-CL')}</p>
            </div>

            {/* Producer Info */}
            <section className="rounded-lg border border-gray-200 bg-gray-50 p-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs uppercase text-gray-500">RUT</p>
                  <p className="font-medium text-gray-900">{producer.dni}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Contacto</p>
                  <p className="font-medium text-gray-900">
                    {producer.mail ? producer.mail : ''}
                    {producer.mail && producer.phone ? ' / ' : ''}
                    {producer.phone ? producer.phone : ''}
                    {!producer.mail && !producer.phone ? 'No registrado' : ''}
                  </p>
                </div>
              </div>
            </section>

            {/* Receptions Table */}
            <section>
              <h3 className="mb-1 font-semibold text-gray-900">Recepciones</h3>
              <div className="overflow-hidden border border-gray-200">
                <table className="w-full text-[9px] text-left">
                  <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-1">Folio</th>
                      <th className="px-4 py-1">Fecha</th>
                      <th className="px-4 py-1">Neto kg</th>
                      <th className="px-4 py-1">Precio</th>
                      <th className="px-4 py-1">Monto</th>
                      <th className="px-4 py-1">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {receptions.length > 0 ? (
                      receptions.map((reception) => (
                        <tr key={reception.id} className="border-b border-gray-200">
                          <td className="px-4 py-1">{reception.id}</td>
                          <td className="px-4 py-1">{formatAuditDate(reception.createdAt)}</td>
                          <td className="px-4 py-1">{reception.netWeight ? reception.netWeight.toLocaleString('es-CL') : '-'}</td>
                          <td className="px-4 py-1">{reception.price ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(reception.price) : '-'}</td>
                          <td className="px-4 py-1">
                            {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(reception.amount || 0)}
                          </td>
                          <td className="px-4 py-1">{reception.status || 'Pendiente'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-1 text-center text-gray-500">No hay recepciones registradas</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Advances Table */}
            <section>
              <h3 className="mb-1 font-semibold text-gray-900">Anticipos</h3>
              <div className="overflow-hidden border border-gray-200">
                <table className="w-full text-[9px] text-left">
                  <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-1">Folio</th>
                      <th className="px-4 py-1">Fecha</th>
                      <th className="px-4 py-1">Medio de Pago</th>
                      <th className="px-4 py-1">Monto</th>
                      <th className="px-4 py-1">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {advances.length > 0 ? (
                      advances.map((advance) => (
                        <tr key={advance.id} className="border-b border-gray-200">
                          <td className="px-4 py-1">{advance.id}</td>
                          <td className="px-4 py-1">{formatAuditDate(advance.createdAt)}</td>
                          <td className="px-4 py-1">{formatPaymentMethod((advance.metadata as any)?.paymentMethod)}</td>
                          <td className="px-4 py-1">
                            {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(advance.amount || 0)}
                          </td>
                          <td className="px-4 py-1">{advance.status || 'Pendiente'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-1 text-center text-gray-500">No hay anticipos registrados</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Settlements Table */}
            <section>
              <h3 className="mb-1 font-semibold text-gray-900">Liquidaciones</h3>
              <div className="overflow-hidden border border-gray-200">
                <table className="w-full text-[9px] text-left">
                  <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-1">Folio</th>
                      <th className="px-4 py-1">Fecha</th>
                      <th className="px-4 py-1">Anticipos</th>
                      <th className="px-4 py-1">Recepciones</th>
                      <th className="px-4 py-1">Total</th>
                      <th className="px-4 py-1">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {settlements.length > 0 ? (
                      settlements.map((settlement) => (
                        <tr key={settlement.id} className="border-b border-gray-200">
                          <td className="px-4 py-1">{settlement.id}</td>
                          <td className="px-4 py-1">{formatAuditDate(settlement.createdAt)}</td>
                          <td className="px-4 py-1">
                            -{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format((settlement.metadata as any)?.totals?.advancesTotal || 0)}
                          </td>
                          <td className="px-4 py-1">
                            {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format((settlement.metadata as any)?.totals?.receptionsTotal || 0)}
                          </td>
                          <td className="px-4 py-1">
                            {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(settlement.amount || 0)}
                          </td>
                          <td className="px-4 py-1">{(settlement.metadata as any)?.isDraft ? 'Borrador' : 'Finalizada'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-1 text-center text-gray-500">No hay liquidaciones registradas</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Producer Balance Section */}
            <section className="rounded-lg border border-gray-200 bg-gray-50 p-2">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">Saldo del Productor</h3>
                <p className={`text-lg font-bold ${producerBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                  {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(producerBalance)}
                </p>
              </div>
            </section>

            {/* Trays Section */}
            <section>
               <div className="border-b border-gray-200 pb-0.5 mb-2 flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900">Control de Bandejas</h3>
               </div>

               {/* Balance Summary */}
               <div className="grid gap-3 grid-cols-5 mb-4">
                 {Object.entries(trays.balance).length > 0 ? (
                   Object.entries(trays.balance).map(([type, count]) => (
                     <div key={type} className="rounded-lg border border-gray-200 p-2">
                       <p className="text-xs font-medium uppercase text-gray-500">{type}</p>
                       <p className={`mt-1 text-sm font-bold ${count > 0 ? 'text-gray-900' : 'text-gray-900'}`}>
                         {Math.abs(count)} {count > 0 ? '(Debe)' : '(A favor)'}
                       </p>
                     </div>
                   ))
                 ) : (
                   <div className="col-span-5 text-sm text-gray-500 italic">No hay deuda de bandejas registrada.</div>
                 )}
               </div>

               {/* Movements Table */}
               <h4 className="mb-1 text-xs font-semibold text-gray-900 uppercase">Movimientos Recientes</h4>
               <div className="overflow-hidden border border-gray-200">
                <table className="w-full text-[9px] text-left">
                  <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-1">Folio</th>
                      <th className="px-4 py-1">Fecha</th>
                      <th className="px-4 py-1">Tipo de bandeja</th>
                      <th className="px-4 py-1">Movimiento</th>
                      <th className="px-4 py-1">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {trays.movements.length > 0 ? (
                      trays.movements.map((movement) => (
                        <tr key={movement.id.toString()} className="border-b border-gray-200">
                          <td className="px-4 py-1">{movement.id.toString()}</td>
                          <td className="px-4 py-1">{formatAuditDate(movement.createdAt)}</td>
                          <td className="px-4 py-1">{(movement.metadata as any)?.trayLabel || '—'}</td>
                          <td className="px-4 py-1">{translateTransactionType(movement.type)}</td>
                          <td className="px-4 py-1 font-semibold">
                            <span className={movement.direction === 'OUT' ? 'text-gray-900' : 'text-gray-900'}>
                              {movement.direction === 'OUT' ? '-' : '+'}
                              {Number((movement.metadata as any)?.quantity ?? (movement.metadata as any)?.quantityReturned ?? (movement.metadata as any)?.quantityDelivered ?? movement.amount ?? 0)}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-1 text-center text-gray-500">No hay movimientos de bandejas registrados</td>
                      </tr>
                    )}
                  </tbody>
                </table>
               </div>
            </section>
          </div>
      </DialogToPrint>
    </>
  );
};
