'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import UpdateBaseForm, { BaseUpdateFormField } from '@/app/baseComponents/BaseForm/UpdateBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { updateTransaction } from '@/app/actions/transactions';
import type { DispatchWithRelations } from '../types';

interface UpdatePricePerKgDialogProps {
  dispatch: DispatchWithRelations;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const UpdatePricePerKgDialog: React.FC<UpdatePricePerKgDialogProps> = ({ dispatch, open, onClose, onSuccess }) => {
  const router = useRouter();
  const { success, error: showError } = useAlert();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const currentUserName = (session?.user as any)?.name || 'Usuario';
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clpFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  });

  const formFields: BaseUpdateFormField[] = [
    {
      name: 'pricePerKg',
      label: 'Precio por Kg',
      type: 'currency' as const,
      required: true,
      currencySymbol: '$',
    },
  ];

  const handleSubmit = async (values: Record<string, any>) => {
    if (!dispatch?.id) {
      showError('Despacho no identificado');
      return;
    }

    setIsSubmitting(true);

    try {
      const newPrice = Number(values.pricePerKg);
      const oldPrice = dispatch.metadata.sale?.pricePerKg || 0;
      const totalNetWeight = dispatch.metadata.sale?.totalNetWeight || 0;
      const oldTotalAmount = dispatch.metadata.sale?.totalAmount || 0;
      const newTotalAmount = Math.round(totalNetWeight * newPrice);

      const historyEntry = {
        date: new Date().toISOString(),
        userId: String(currentUserId || 'unknown'),
        userName: currentUserName,
        action: 'Actualización de precio por Kg',
        details: `Se actualizó el precio por Kg de ${clpFormatter.format(oldPrice)} a ${clpFormatter.format(newPrice)}. Total venta anterior: ${clpFormatter.format(oldTotalAmount)}, nuevo: ${clpFormatter.format(newTotalAmount)}.`,
      };

      const updatedMetadata = {
        ...dispatch.metadata,
        sale: {
          ...dispatch.metadata.sale,
          pricePerKg: newPrice,
          totalAmount: newTotalAmount,
        },
        history: [...(dispatch.metadata?.history || []), historyEntry],
      };

      const result = await updateTransaction({
        id: dispatch.id,
        amount: newTotalAmount,
        metadata: updatedMetadata,
      }, currentUserId);

      if (result.success) {
        success('Precio por Kg actualizado exitosamente');
        setTimeout(() => {
          onClose();
          onSuccess?.();
          router.refresh();
          setIsSubmitting(false);
        }, 500);
      } else {
        showError(result.error || 'Error al actualizar el precio');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      showError(err?.message || 'Error desconocido');
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Editar Precio por Kg" maxWidth="sm">
      <UpdateBaseForm
        fields={formFields}
        initialState={{ pricePerKg: dispatch.metadata.sale?.pricePerKg || 0 }}
        onSubmit={handleSubmit}
        onCancel={onClose}
        cancelButton={true}
        isSubmitting={isSubmitting}
        submitLabel="Actualizar Precio"
      />
    </Dialog>
  );
};

export default UpdatePricePerKgDialog;
