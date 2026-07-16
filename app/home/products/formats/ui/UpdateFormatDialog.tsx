'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import UpdateBaseForm, { BaseUpdateFormField } from '@/app/baseComponents/BaseForm/UpdateBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { updateFormat } from '@/app/actions/formats';
import { getVarietiesSimpleList } from '@/app/actions/varieties';
import type { Option } from '@/app/baseComponents/AutoComplete/AutoComplete';

interface Format {
  id: number;
  name: string;
  description?: string;
  priceCLP?: number;
  priceUSD?: number;
  active: boolean;
  varietyId?: number | null;
  varietyName?: string | null;
}

interface UpdateFormatDialogProps {
  open: boolean;
  onClose: () => void;
  format: Format;
}

const UpdateFormatDialog: React.FC<UpdateFormatDialogProps> = ({ open, onClose, format }) => {
  const router = useRouter();
  const { success, error } = useAlert();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [varietyOptions, setVarietyOptions] = useState<Option[]>([]);

  const [formData, setFormData] = useState({
    name: format.name,
    description: format.description || '',
    priceCLP: format.priceCLP || 0,
    priceUSD: format.priceUSD || 0,
    active: format.active,
    varietyId: format.varietyId ?? null,
  });

  useEffect(() => {
    const loadVarieties = async () => {
      try {
        const varieties = await getVarietiesSimpleList();
        setVarietyOptions(varieties.map((variety) => ({ id: variety.id, label: variety.label })));
      } catch (error) {
        console.error('Error loading varieties', error);
      }
    };

    void loadVarieties();
  }, []);

  useEffect(() => {
    setFormData({
      name: format.name,
      description: format.description || '',
      priceCLP: format.priceCLP || 0,
      priceUSD: format.priceUSD || 0,
      active: format.active,
      varietyId: format.varietyId ?? null,
    });
  }, [format]);

  const formFields: BaseUpdateFormField[] = [
    {
      name: 'name',
      label: 'Nombre del formato',
      type: 'text',
      required: true
    },
    {
      name: 'description',
      label: 'Descripción',
      type: 'textarea',
      required: false,
      multiline: true,
      rows: 3
    },
    {
      name: 'priceCLP',
      label: 'Precio (CLP)',
      type: 'currency',
      required: true,
      min: 0,
      currencySymbol: '$'
    },
    {
      name: 'priceUSD',
      label: 'Precio (USD)',
      type: 'currency',
      required: true,
      min: 0,
      currencySymbol: 'US$',
      allowDecimalComma: true
    },
    {
      name: 'varietyId',
      label: 'Variedad asociada',
      type: 'select',
      required: false,
      options: varietyOptions,
    },
    {
      name: 'active',
      label: 'Estado activo',
      type: 'switch',
      required: false
    }
  ];

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    setErrors([]);

    // Función para convertir valores de moneda a número
    const parseCurrencyValue = (value: any): number => {
      if (typeof value === 'number') return value;
      if (!value || value === '') return 0;
      
      // Remover símbolos de moneda y espacios
      const cleaned = String(value)
        .replace(/\$\s*/g, '')    // Remover $ y espacios
        .replace(/US\s*/g, '')    // Remover US y espacios
        .trim();
      
      // Detectar si tiene coma decimal (formato USD: 1.234,56)
      if (cleaned.includes(',')) {
        // Formato con coma decimal: separar parte entera y decimal
        const parts = cleaned.split(',');
        const integerPart = parts[0].replace(/\./g, ''); // Remover puntos de miles
        const decimalPart = parts[1] || '';
        const normalized = integerPart + '.' + decimalPart;
        
        const parsed = parseFloat(normalized);
        return isNaN(parsed) ? 0 : parsed;
      } else {
        // Formato sin coma (CLP): solo remover puntos de miles
        const normalized = cleaned.replace(/\./g, '');
        
        const parsed = parseFloat(normalized);
        return isNaN(parsed) ? 0 : parsed;
      }
    };

    try {
      const priceCLP = parseCurrencyValue(values.priceCLP);
      const priceUSD = parseCurrencyValue(values.priceUSD);
      
      const varietyId = values.varietyId !== null && values.varietyId !== undefined && values.varietyId !== ''
        ? Number(values.varietyId)
        : null;

      const result = await updateFormat({
        id: format.id,
        name: values.name,
        description: values.description || undefined,
        priceCLP: priceCLP,
        priceUSD: priceUSD,
        active: values.active,
        varietyId,
      }, currentUserId);

      if (result.success) {
        success(result.message || 'Formato actualizado exitosamente');
        onClose();
        // Refresh the page to show the updated format
        router.refresh();
      } else {
        error(result.error || 'Error al actualizar el formato');
        if (result.error) {
          setErrors([result.error]);
        }
      }
    } catch (err: any) {
      error('Error inesperado al actualizar el formato');
      console.error('Update format error:', err);
      setErrors(['Error inesperado al actualizar el formato']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setErrors([]);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={`Editar Formato: ${format.name}`}
      maxWidth="md"
      data-test-id="update-format-dialog"
    >
      <UpdateBaseForm
        fields={formFields}
        initialState={formData}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onCancel={handleClose}
        isSubmitting={isSubmitting}
        errors={errors}
        submitLabel="Actualizar Formato"
        cancelButtonText="Cancelar"
        cancelButton={true}
      />
    </Dialog>
  );
};

export default UpdateFormatDialog;