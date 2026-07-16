'use client';

import React, { useState } from 'react';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import DialogToPrint from '@/app/baseComponents/Dialog/DialogToPrint';
import { ProducerDetailData } from './types';
import { formatAuditDate } from '@/lib/dateTimeUtils';
import { AdvanceMetadata, SettlementMetadata } from '@/data/entities/Transaction';

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
  thead th, tfoot td {
    background-color: #f3f4f6 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
`;

export type ProducerPrintSection = 'receptions' | 'advances' | 'settlements';

interface PrintProducerSectionButtonProps {
  data: ProducerDetailData;
  section: ProducerPrintSection;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount || 0);
}

function formatPaymentMethod(paymentMethod?: string): string {
  if (paymentMethod === 'CASH') return 'Efectivo';
  if (paymentMethod === 'TRANSFER') return 'Transferencia';
  if (paymentMethod === 'CHECK') return 'Cheque';
  return paymentMethod || '—';
}

const SECTION_META: Record<
  ProducerPrintSection,
  { title: string; tooltip: string }
> = {
  receptions: {
    title: 'Recepciones',
    tooltip: 'Imprimir solo recepciones',
  },
  advances: {
    title: 'Anticipos',
    tooltip: 'Imprimir solo anticipos',
  },
  settlements: {
    title: 'Liquidaciones',
    tooltip: 'Imprimir solo liquidaciones',
  },
};

export const PrintProducerSectionButton: React.FC<PrintProducerSectionButtonProps> = ({
  data,
  section,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const meta = SECTION_META[section];
  const { producer, receptions, advances, settlements } = data;

  const totalReceptions = receptions.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const totalAdvances = advances.reduce((sum, a) => sum + Number(a.amount || 0), 0);
  const totalSettlements = settlements.reduce((sum, s) => sum + Number(s.amount || 0), 0);

  return (
    <>
      <IconButton
        icon="receipt_long"
        variant="outlined"
        size="sm"
        onClick={() => setIsOpen(true)}
        title={meta.tooltip}
        ariaLabel={meta.tooltip}
      />

      <DialogToPrint
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={`Vista previa — ${meta.title}`}
        preferBrowserPrint
        printStyles={printStyles}
      >
        <div className="flex flex-col gap-4 p-1">
          <div className="flex items-center justify-between border-b border-gray-200 pb-1">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {meta.title} — {producer.name}
              </h2>
              <p className="text-xs text-gray-500">RUT {producer.dni}</p>
            </div>
            <p className="text-sm text-gray-500">{new Date().toLocaleDateString('es-CL')}</p>
          </div>

          {section === 'receptions' && (
            <section>
              <div className="mb-2 flex justify-between text-sm text-gray-700">
                <span>{receptions.length} registro(s)</span>
                <span className="font-semibold">Total: {formatCurrency(totalReceptions)}</span>
              </div>
              <div className="overflow-hidden border border-gray-200">
                <table className="w-full text-left text-[9px]">
                  <thead className="border-b border-gray-200 bg-gray-100 font-semibold text-gray-700">
                    <tr>
                      <th className="px-4 py-1">Folio</th>
                      <th className="px-4 py-1">Fecha</th>
                      <th className="px-4 py-1">Variedad</th>
                      <th className="px-4 py-1">Formato</th>
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
                          <td className="px-4 py-1">{reception.variety || '—'}</td>
                          <td className="px-4 py-1">{reception.formatName || '—'}</td>
                          <td className="px-4 py-1">
                            {reception.netWeight != null
                              ? reception.netWeight.toLocaleString('es-CL')
                              : '—'}
                          </td>
                          <td className="px-4 py-1">
                            {reception.price != null ? formatCurrency(reception.price) : '—'}
                          </td>
                          <td className="px-4 py-1">{formatCurrency(reception.amount || 0)}</td>
                          <td className="px-4 py-1">{reception.status || 'Pendiente'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-4 py-2 text-center text-gray-500">
                          No hay recepciones registradas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {section === 'advances' && (
            <section>
              <div className="mb-2 flex justify-between text-sm text-gray-700">
                <span>{advances.length} registro(s)</span>
                <span className="font-semibold">Total: {formatCurrency(totalAdvances)}</span>
              </div>
              <div className="overflow-hidden border border-gray-200">
                <table className="w-full text-left text-[9px]">
                  <thead className="border-b border-gray-200 bg-gray-100 font-semibold text-gray-700">
                    <tr>
                      <th className="px-4 py-1">Folio</th>
                      <th className="px-4 py-1">Fecha</th>
                      <th className="px-4 py-1">Medio de pago</th>
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
                          <td className="px-4 py-1">
                            {formatPaymentMethod(
                              (advance.metadata as AdvanceMetadata | null)?.paymentMethod
                            )}
                          </td>
                          <td className="px-4 py-1">{formatCurrency(advance.amount || 0)}</td>
                          <td className="px-4 py-1">{advance.status || 'Pendiente'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-2 text-center text-gray-500">
                          No hay anticipos registrados
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {section === 'settlements' && (
            <section>
              <div className="mb-2 flex justify-between text-sm text-gray-700">
                <span>{settlements.length} registro(s)</span>
                <span className="font-semibold">Total: {formatCurrency(totalSettlements)}</span>
              </div>
              <div className="overflow-hidden border border-gray-200">
                <table className="w-full text-left text-[9px]">
                  <thead className="border-b border-gray-200 bg-gray-100 font-semibold text-gray-700">
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
                      settlements.map((settlement) => {
                        const metadata = settlement.metadata as SettlementMetadata | null;
                        const isDraft = Boolean((metadata as any)?.isDraft);
                        return (
                          <tr key={settlement.id} className="border-b border-gray-200">
                            <td className="px-4 py-1">{settlement.id}</td>
                            <td className="px-4 py-1">{formatAuditDate(settlement.createdAt)}</td>
                            <td className="px-4 py-1">
                              -{formatCurrency(metadata?.totals?.advancesTotal || 0)}
                            </td>
                            <td className="px-4 py-1">
                              {formatCurrency(metadata?.totals?.receptionsTotal || 0)}
                            </td>
                            <td className="px-4 py-1">{formatCurrency(settlement.amount || 0)}</td>
                            <td className="px-4 py-1">{isDraft ? 'Borrador' : 'Finalizada'}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-2 text-center text-gray-500">
                          No hay liquidaciones registradas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </DialogToPrint>
    </>
  );
};
