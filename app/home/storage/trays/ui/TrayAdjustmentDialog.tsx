'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import UpdateBaseForm, { BaseUpdateFormFieldGroup } from '@/app/baseComponents/BaseForm/UpdateBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { createTrayAdjustment } from '@/app/actions/transactions';
import { getActiveSeason } from '@/app/actions/seasons';

interface Tray {
  id: string;
  name: string;
  weight: number;
  stock: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface TrayAdjustmentDialogProps {
  open: boolean;
  onClose: () => void;
  tray: Tray;
  onSuccess?: () => void;
  mode?: 'adjustment' | 'receive' | 'return';
  'data-test-id'?: string;
}

const TrayAdjustmentDialog: React.FC<TrayAdjustmentDialogProps> = ({
  open,
  onClose,
  tray,
  onSuccess,
  mode = 'adjustment',
  'data-test-id': dataTestId
}) => {
  const router = useRouter();
  const { success, error } = useAlert();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const getTitle = () => {
    switch (mode) {
      case 'receive': return `Recibir Bandejas - ${tray.name}`;
      case 'return': return `Devolver Bandejas - ${tray.name}`;
      default: return `Ajustar Stock - ${tray.name}`;
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'receive': return `Stock actual: ${tray.stock} bandejas`;
      case 'return': return `Stock actual: ${tray.stock} bandejas`;
      default: return `Stock actual: ${tray.stock} bandejas`;
    }
  };

  const getFieldLabel = () => {
    switch (mode) {
      case 'receive': return 'Cantidad a recibir';
      case 'return': return 'Cantidad a devolver';
      default: return 'Nuevo stock';
    }
  };

  const getSubmitLabel = () => {
    switch (mode) {
      case 'receive': return 'Recibir Bandejas';
      case 'return': return 'Devolver Bandejas';
      default: return 'Aplicar Ajuste';
    }
  };

  const initialState = {
    amount: mode === 'adjustment' ? tray.stock : 0,
    reason: '',
    notes: '',
  };

  const formFields: BaseUpdateFormFieldGroup[] = [
    {
      id: 'operation-info',
      title: mode === 'adjustment' ? 'Ajuste de Stock' : mode === 'receive' ? 'Recepción de Bandejas' : 'Devolución de Bandejas',
      subtitle: getSubtitle(),
      columns: 1,
        fields: [
        {
          name: 'amount',
          label: getFieldLabel(),
          type: mode === 'adjustment' ? 'numberStepper' : 'number',
          required: true,
          min: mode === 'adjustment' ? 0 : 1,
          step: 1,
          startIcon: mode === 'receive' ? 'arrow_upward' : mode === 'return' ? 'arrow_downward' : 'settings',
        },
        {
          name: 'reason',
          label: mode === 'receive' ? 'Motivo de recepción' : mode === 'return' ? 'Motivo de devolución' : 'Razón del Ajuste',
          type: 'text',
          required: true,
        },
        {
          name: 'notes',
          label: 'Notas Adicionales',
          type: 'textarea',
          required: false,
          rows: 3,
        },
      ],
    },
  ];

  const handleSubmit = async (data: Record<string, unknown>) => {
    if (!currentUserId) {
      error('Usuario no autenticado');
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      // Obtener temporada activa
      const seasonResult = await getActiveSeason();
      if (!seasonResult.success || !seasonResult.data) {
        error(seasonResult.error || 'No se pudo obtener la temporada activa');
        return;
      }

      const amountValue = Number(data.amount);
      if (isNaN(amountValue) || amountValue < (mode === 'adjustment' ? 0 : 1)) {
        error(`El valor debe ser un número válido ${mode === 'adjustment' ? 'mayor o igual a 0' : 'mayor a 0'}`);
        return;
      }

      let adjustmentValue: number;
      let newStock: number;

      if (mode === 'adjustment') {
        newStock = amountValue;
        adjustmentValue = newStock - tray.stock;
      } else if (mode === 'receive') {
        adjustmentValue = amountValue; // positivo
        newStock = tray.stock + amountValue;
      } else { // return
        adjustmentValue = -amountValue; // negativo
        newStock = tray.stock - amountValue;
        if (newStock < 0) {
          error(`La devolución resultaría en stock negativo (${newStock}). Stock actual: ${tray.stock}`);
          return;
        }
      }

      const result = await createTrayAdjustment({
        trayId: tray.id,
        seasonId: (seasonResult.data as any).id,
        userId: currentUserId,
        amount: adjustmentValue,
        metadata: {
          reason: data.reason as string,
          notes: data.notes as string || undefined,
          operation: mode,
        },
      });

      if (result.success) {
        success(`${mode === 'receive' ? 'Recepción' : mode === 'return' ? 'Devolución' : 'Ajuste'} realizado exitosamente`);
        onSuccess?.();
      } else {
        error(result.error || `Error al realizar la ${mode === 'receive' ? 'recepción' : mode === 'return' ? 'devolución' : 'ajuste'}`);
      }
    } catch (err: any) {
      console.error(`Error ${mode}ing tray stock:`, err);
      error(err?.message || `Error inesperado al ${mode === 'receive' ? 'recibir' : mode === 'return' ? 'devolver' : 'ajustar'} stock`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setErrors([]);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={getTitle()}
      size="md"
      data-test-id={dataTestId}
    >
      <UpdateBaseForm
        fields={formFields}
        initialState={initialState}
        onSubmit={handleSubmit}
        onCancel={handleClose}
        submitLabel={getSubmitLabel()}
        cancelButtonText="Cancelar"
        isSubmitting={isSubmitting}
        errors={errors}
        data-test-id={`${dataTestId}-form`}
      />
    </Dialog>
  );
};

export default TrayAdjustmentDialog;