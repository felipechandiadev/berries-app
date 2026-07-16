'use client';

import { useState } from 'react';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import DialogToPrint from '@/app/baseComponents/Dialog/DialogToPrint';
import type { PalletPackDetail } from '@/app/actions/pallets';

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
  thead th {
    background-color: #f3f4f6 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
`;

const statusTranslations: Record<string, string> = {
  AVAILABLE: 'Disponible',
  IN_USE: 'En uso',
  FULL: 'Lleno',
  CLOSED: 'Cerrado',
  DISPATCHED: 'Despachado',
};

function translateStatus(status: string): string {
  return statusTranslations[status] || status;
}

export interface PalletDetailForPrint {
  id: number;
  storageName: string | null;
  trayName: string | null;
  traysQuantity: number;
  capacity: number;
  status: string;
  packs: PalletPackDetail[];
}

interface PrintPalletDetailButtonProps {
  detail: PalletDetailForPrint;
}

export default function PrintPalletDetailButton({ detail }: PrintPalletDetailButtonProps) {
  const [open, setOpen] = useState(false);

  const fillPercentage = Math.min(
    100,
    Math.round((detail.traysQuantity / Math.max(detail.capacity, 1)) * 100)
  );

  const printedAt = new Date();
  const formattedDate = printedAt.toLocaleDateString('es-CL');
  const formattedTime = printedAt.toLocaleTimeString('es-CL', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      <IconButton
        icon="print"
        variant="basicSecondary"
        size="sm"
        onClick={() => setOpen(true)}
        title="Imprimir detalle del pallet"
        ariaLabel="Imprimir detalle del pallet"
      />

      <DialogToPrint
        open={open}
        onClose={() => setOpen(false)}
        title="Vista Previa de Impresión"
        size="xl"
        contentClassName="bg-white"
        printLabel="Imprimir"
        preferBrowserPrint
        zIndex={80}
        printStyles={printStyles}
      >
        <div className="flex flex-col gap-4 p-1 text-gray-900">
          <div className="flex justify-between items-center border-b border-gray-200 pb-2">
            <h2 className="text-lg font-bold">Detalle Pallet #{detail.id}</h2>
            <p className="text-sm text-gray-500">
              {formattedDate} {formattedTime}
            </p>
          </div>

          <section className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs uppercase text-gray-500">Almacenamiento</p>
                <p className="font-medium">{detail.storageName || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Tipo de Bandeja</p>
                <p className="font-medium">{detail.trayName || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Estado</p>
                <p className="font-medium">{translateStatus(detail.status)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Capacidad</p>
                <p className="font-medium">
                  {detail.traysQuantity} / {detail.capacity} bandejas ({fillPercentage}%)
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Packs</p>
                <p className="font-medium">{detail.packs.length}</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-2 font-semibold text-gray-900">
              Packs en este pallet ({detail.packs.length})
            </h3>
            {detail.packs.length > 0 ? (
              <div className="overflow-hidden border border-gray-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2">Pack</th>
                      <th className="px-3 py-2">Variedad</th>
                      <th className="px-3 py-2">Formato</th>
                      <th className="px-3 py-2">Bandeja</th>
                      <th className="px-3 py-2">Productor</th>
                      <th className="px-3 py-2">Unidad Productiva</th>
                      <th className="px-3 py-2 text-right">Cantidad</th>
                      <th className="px-3 py-2 text-right">Peso neto</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {detail.packs.map((pack, index) => (
                      <tr
                        key={`${pack.receptionPackId}_${pack.trayId}_${index}`}
                        className="border-b border-gray-200"
                      >
                        <td className="px-3 py-2">#{pack.receptionPackId}</td>
                        <td className="px-3 py-2">{pack.varietyName || '-'}</td>
                        <td className="px-3 py-2">{pack.formatName || '-'}</td>
                        <td className="px-3 py-2">{pack.trayName || pack.trayId || '-'}</td>
                        <td className="px-3 py-2">{pack.producerName || '-'}</td>
                        <td className="px-3 py-2">{pack.productiveUnitName || '-'}</td>
                        <td className="px-3 py-2 text-right font-medium">{pack.quantity}</td>
                        <td className="px-3 py-2 text-right">
                          {pack.netWeight > 0
                            ? `${Number(pack.netWeight).toFixed(2)} kg`
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Este pallet no tiene packs asignados</p>
            )}
          </section>
        </div>
      </DialogToPrint>
    </>
  );
}
