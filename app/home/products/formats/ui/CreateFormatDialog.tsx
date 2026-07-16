'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import CreateBaseForm, { BaseFormField } from '@/app/baseComponents/BaseForm/CreateBaseForm';
import { useAlert } from '@/app/state/hooks/useAlert';
import { createFormat } from '@/app/actions/formats';
import { getVarietiesSimpleList } from '@/app/actions/varieties';
import type { Option } from '@/app/baseComponents/AutoComplete/AutoComplete';

interface CreateFormatDialogProps {
  open: boolean;
  onClose: () => void;
}

const CreateFormatDialog: React.FC<CreateFormatDialogProps> = ({ open, onClose }) => {
  const router = useRouter();
  const { success, error } = useAlert();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [varietyOptions, setVarietyOptions] = useState<Option[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priceCLP: 0,
    priceUSD: 0,
    active: true,
    varietyId: null as number | null,
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

  const formFields: BaseFormField[] = [
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

  const handleSubmit = async () => {
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
      const result = await createFormat({
        name: formData.name,
        description: formData.description || undefined,
        priceCLP: parseCurrencyValue(formData.priceCLP),
        priceUSD: parseCurrencyValue(formData.priceUSD),
        active: formData.active,
        varietyId: formData.varietyId ? Number(formData.varietyId) : undefined,
      }, currentUserId);

      if (result.success) {
        success(result.message || 'Formato creado exitosamente');
        onClose();
        setFormData({
          name: '',
          description: '',
          priceCLP: 0,
          priceUSD: 0,
          active: true,
          varietyId: null,
        });
        // Refresh the page to show the new format
        router.refresh();
      } else {
        error(result.error || 'Error al crear el formato');
      }
    } catch (err: any) {
      error('Error inesperado al crear el formato');
      console.error('Create format error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setFormData({
        name: '',
        description: '',
        priceCLP: 0,
        priceUSD: 0,
        active: true,
        varietyId: null,
      });
      setErrors([]);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Crear Nuevo Formato"
      maxWidth="md"
      data-test-id="create-format-dialog"
    >
      <CreateBaseForm
        fields={formFields}
        values={formData}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onCancel={handleClose}
        isSubmitting={isSubmitting}
        cancelButton={true}
        errors={errors}
        submitLabel="Crear Formato"
        cancelButtonText="Cancelar"
      />
    </Dialog>
  );
};

export default CreateFormatDialog;