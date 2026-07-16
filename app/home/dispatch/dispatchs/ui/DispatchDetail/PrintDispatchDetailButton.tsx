import React, { useState, useMemo } from 'react';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import DialogToPrint from '@/app/baseComponents/Dialog/DialogToPrint';
import { DispatchWithRelations } from './types';
import { Currency } from '@/data/entities/Variety';
import { formatAuditDate } from '@/lib/dateTimeUtils';

const letterPrintStyles = `
@page {
  size: Letter;
  margin: 12mm;
}

html, body {
  background: #ffffff;
  color: #1f2937;
}

#print-root {
  width: 100%;
}

.dispatch-print-page {
  width: 100%;
  max-width: 210mm;
  margin: 0 auto;
}

.dispatch-print-section {
  page-break-inside: avoid;
  break-inside: avoid;
}

.dispatch-print-header {
  page-break-inside: avoid;
}`;

interface PrintDispatchDetailButtonProps {
  data: DispatchWithRelations;
}

const PrintDispatchDetailButton: React.FC<PrintDispatchDetailButtonProps> = ({ data }) => {
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const formattedPrintedDate = new Date().toLocaleDateString('es-CL');
  const formattedPrintedTime = new Date().toLocaleTimeString('es-CL', { hour12: false, hour: '2-digit', minute: '2-digit' });

  const { metadata } = data;
  const pallets = metadata.pallets || [];
  const totalGrossWeight = pallets.reduce((acc, p) => acc + (p.grossWeight || 0), 0);
  const totalNetWeight = metadata.sale?.totalNetWeight || 0;

  return (
    <>
      <IconButton
        icon="print"
        variant="text"
        size="md"
        onClick={handleOpen}
        title="Imprimir despacho"
      />
      <DialogToPrint
        open={open}
        onClose={handleClose}
        title={`Despacho #${data.id}`}
        size="xl"
        contentClassName="bg-white"
        printLabel="Imprimir"
        onBeforePrint={handleClose}
        zIndex={80}
        preferBrowserPrint
        printStyles={letterPrintStyles}
      >
        <div
          className="dispatch-print-page mx-auto flex w-full max-w-[210mm] flex-col gap-6 text-[13px] leading-snug text-gray-900"
          style={{ width: '210mm' }}
        >
          <header className="dispatch-print-header flex flex-col gap-2 border-b border-gray-200 pb-4">
            <div className="flex flex-col justify-between gap-2 md:flex-row md:items-start">
              <div>
                <h1 className="text-2xl font-semibold uppercase text-gray-900">Detalle del Despacho</h1>
                <p className="text-sm text-gray-600">Documento generado para uso interno</p>
              </div>
              <div className="text-sm text-gray-700">
                <p>
                  <span className="font-semibold">Impreso el:</span> {formattedPrintedDate} {formattedPrintedTime}
                </p>
                <p>
                  <span className="font-semibold">Despacho:</span> #{data.id}
                </p>
                <p>
                  <span className="font-semibold">Total Venta:</span>{' '}
                  <span className="font-bold text-gray-900">
                    {formatCurrency(data.amount, Currency.CLP)}
                  </span>
                </p>
              </div>
            </div>
          </header>

          <section className="dispatch-print-section space-y-3">
            <h2 className="text-base font-semibold uppercase text-gray-700">Datos Generales</h2>
            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs uppercase text-gray-500">Cliente</p>
                <p className="font-medium text-gray-900">{data.client?.person?.name ?? metadata.client?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">RUT</p>
                <p className="font-medium text-gray-900">{data.client?.person?.dni ?? metadata.client?.rut ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Temporada</p>
                <p className="font-medium text-gray-900">{data.season?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Fecha de Registro</p>
                <p className="font-medium text-gray-900">{data.createdAt ? formatAuditDate(data.createdAt) : '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Última Actualización</p>
                <p className="font-medium text-gray-900">{data.updatedAt ? formatAuditDate(data.updatedAt) : '—'}</p>
              </div>
            </div>
          </section>

          <section className="dispatch-print-section space-y-3">
            <h2 className="text-base font-semibold uppercase text-gray-700">Resumen de Pesos</h2>
            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs uppercase text-gray-500">Peso Bruto Total</p>
                <p className="font-medium text-gray-900">{totalGrossWeight.toFixed(2)} kg</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Peso Neto Total</p>
                <p className="font-medium text-gray-900">{totalNetWeight.toFixed(2)} kg</p>
              </div>
            </div>
          </section>

          <section className="dispatch-print-section space-y-3">
            <h2 className="text-base font-semibold uppercase text-gray-700">Datos de Pallets</h2>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full table-auto text-left text-[12px]">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-3 py-2 font-medium">Bandeja</th>
                    <th className="px-3 py-2 font-medium">Cantidad</th>
                    <th className="px-3 py-2 font-medium">Peso Bruto</th>
                    <th className="px-3 py-2 font-medium">Peso Neto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pallets.map((pallet, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2">{pallet.trayLabel ?? '—'}</td>
                      <td className="px-3 py-2">{pallet.trayCount ?? '—'}</td>
                      <td className="px-3 py-2">{pallet.grossWeight ?? '—'} kg</td>
                      <td className="px-3 py-2">{pallet.netWeight ?? '—'} kg</td>
                    </tr>
                  ))}
                  {pallets.length === 0 && (
                    <tr>
                      <td className="px-3 py-2" colSpan={4}>
                        No hay datos de pallets disponibles.
                      </td>
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

function formatCurrency(amount: number, currency: 'CLP' | 'USD') {
  if (!Number.isFinite(amount)) {
    return '-';
  }

  const clpFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const usdFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return currency === 'USD' ? usdFormatter.format(amount) : clpFormatter.format(amount);
}

export default PrintDispatchDetailButton;