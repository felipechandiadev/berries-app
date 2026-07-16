'use client';

import React, { useState, useEffect } from 'react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import { formatAuditDate } from '@/lib/dateTimeUtils';
import { getDetailedTrayTransaction, type TrayTransactionRow, type DetailedTrayTransaction } from '@/app/actions/transactions';
import { translateTransactionType } from '@/lib/transactionUtils';

interface DetailTrayTransactionProps {
  transaction: TrayTransactionRow;
}

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export default function DetailTrayTransaction({ transaction }: DetailTrayTransactionProps) {
  // Safety check for transaction prop
  if (!transaction) {
    return null;
  }

  const [open, setOpen] = useState(false);
  const [detailedTransaction, setDetailedTransaction] = useState<DetailedTrayTransaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async () => {
    if (!transaction?.id) {
      setError('ID de transacción no válido');
      setOpen(true);
      return;
    }

    setOpen(true);
    setLoading(true);
    setError(null);

    try {
      const result = await getDetailedTrayTransaction(transaction.id);
      if (result.success && result.data) {
        setDetailedTransaction(result.data);
      } else {
        setError(result.error || 'Error al cargar los detalles');
      }
    } catch (err) {
      setError('Error al cargar los detalles de la transacción');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setDetailedTransaction(null);
    setError(null);
  };

  return (
    <>
      <IconButton
        icon="more_horiz"
        variant="text"
        size="sm"
        onClick={handleOpen}
        ariaLabel="Ver detalles de la transacción"
      />

      <Dialog
        open={open}
        onClose={handleClose}
        title={`Detalle de Transacción #${transaction?.id || 'N/A'}`}
        size="md"
        showCloseButton={true}
      >
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Cargando detalles...</span>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {detailedTransaction && !loading && !error && (
          <div className="flex flex-col gap-4 p-1">
            {/* Información básica */}
            <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="border-b border-gray-200 pb-2 mb-3">
                <h3 className="font-semibold text-gray-900">Información General</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Folio</p>
                  <p className="font-medium text-gray-900 font-mono">{detailedTransaction.id}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Tipo</p>
                  <p className="font-medium text-gray-900">{translateTransactionType(detailedTransaction.type)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Flujo</p>
                  <p className={`font-medium ${detailedTransaction.direction === 'Entrada' ? 'text-green-600' : 'text-red-600'}`}>
                    {detailedTransaction.direction}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Cantidad</p>
                  <p className="font-semibold text-gray-900">{currencyFormatter.format(detailedTransaction.amount)} {detailedTransaction.unit === 'TRAY' ? 'bandejas' : detailedTransaction.unit}</p>
                </div>
              </div>
            </section>

            {/* Fechas */}
            <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Fecha de Creación</p>
                  <p className="font-medium text-gray-900">{formatAuditDate(detailedTransaction.createdAt)}</p>
                </div>
              </div>
            </section>

            {/* Detalles específicos de bandejas */}
            <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="border-b border-gray-200 pb-2 mb-3">
                <h3 className="font-semibold text-gray-900">Detalles de Bandeja</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Bandeja</p>
                  <p className="font-medium text-gray-900">{detailedTransaction.trayName || 'Desconocida'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Contraparte</p>
                  <p className="font-medium text-gray-900">{detailedTransaction.counterpartyName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Motivo</p>
                  <p className="font-medium text-gray-900">{detailedTransaction.reason || '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Realizado por</p>
                  <p className="font-medium text-gray-900">{detailedTransaction.performedByName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Stock Anterior</p>
                  <p className="font-medium text-gray-900 font-mono">{detailedTransaction.stockBefore !== undefined ? detailedTransaction.stockBefore.toLocaleString('es-CL') : '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Stock Nuevo</p>
                  <p className="font-medium text-gray-900 font-mono">{detailedTransaction.stockAfter !== undefined ? detailedTransaction.stockAfter.toLocaleString('es-CL') : '—'}</p>
                </div>
              </div>
            </section>
          </div>
        )}
      </Dialog>
    </>
  );
}