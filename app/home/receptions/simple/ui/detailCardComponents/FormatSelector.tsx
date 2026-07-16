import React, { useEffect, useRef, useState } from 'react';
import Select from '@/app/baseComponents/Select/Select';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import { Currency } from '@/data/entities/Variety';
import { usePermissions } from '@/app/state/hooks/usePermissions';

interface FormatSelectorProps {
  formatId: number | null;
  onFormatChange: (id: number | null, price: number, currency: Currency | null) => void;
  onPriceChange: (price: number) => void;
  onCurrencyChange: (currency: Currency) => void;
  currentPrice: number;
  currentCurrency: Currency;
  dataTestIdPrefix?: string;
  formatOptions: { id: number; label: string; priceCLP: number; priceUSD: number }[];
}

const FormatSelector: React.FC<FormatSelectorProps> = ({ 
  formatId, 
  onFormatChange, 
  onPriceChange, 
  onCurrencyChange, 
  currentPrice, 
  currentCurrency,
  dataTestIdPrefix,
  formatOptions
}) => {
  const [priceInput, setPriceInput] = useState<string>('');
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const isUserEditingPriceRef = useRef(false);
  const { has } = usePermissions();
  const canEditPrice = has('RECEPTIONS_UPDATE_PRICE');

  useEffect(() => {
    setIsEditingPrice(false);
  }, [formatId]);

  const currencyOptions = [
    { id: Currency.CLP, label: 'CLP' },
    { id: Currency.USD, label: 'USD' },
  ];

  const getCurrencySymbol = (currency: Currency) => {
    switch (currency) {
      case Currency.CLP:
        return '$';
      case Currency.USD:
        return 'US$';
      default:
        return '$';
    }
  };

  const allowDecimalComma = currentCurrency === Currency.USD;

  useEffect(() => {
    if (isUserEditingPriceRef.current) {
      isUserEditingPriceRef.current = false;
      return;
    }

    if (!formatId) {
      setPriceInput('');
      return;
    }

    if (!Number.isFinite(currentPrice)) {
      setPriceInput('');
      return;
    }

    if (currentCurrency === Currency.USD) {
      // Para USD: formato con coma decimal (ej: 1234,56)
      const integerPart = Math.floor(currentPrice);
      const decimalPart = Math.round((currentPrice - integerPart) * 100);
      const formattedInteger = integerPart.toLocaleString('es-CL');
      const formattedDecimals = decimalPart.toString().padStart(2, '0');
      setPriceInput(`${formattedInteger},${formattedDecimals}`);
    } else {
      // Para CLP: formato entero con separadores de miles (ej: 1.234.567)
      const integerValue = Math.trunc(currentPrice);
      setPriceInput(integerValue.toLocaleString('es-CL'));
    }
  }, [formatId, currentPrice, currentCurrency]);

  return (
    <div>
      <div className="w-full mb-2">
        <Select
          label="Formato"
          options={formatOptions.map((f) => ({ id: f.id, label: f.label }))}
          placeholder="Selecciona un formato"
          value={formatId || null}
          onChange={(value) => {
            const selectedId = value ? parseInt(value.toString(), 10) : null;
            const format = formatOptions.find((f) => f.id === selectedId);
            if (format) {
              // Default logic: prefer CLP if > 0, else USD, else 0/CLP
              let price = format.priceCLP;
              let currency = Currency.CLP;
              
              if (price === 0 && format.priceUSD > 0) {
                price = format.priceUSD;
                currency = Currency.USD;
              }
              
              onFormatChange(selectedId, price, currency);
            } else {
              onFormatChange(null, 0, null);
            }
          }}
          allowClear
          data-test-id={dataTestIdPrefix ? `${dataTestIdPrefix}-format-select` : 'format-select'}
        />
      </div>
      
      {/* Primera fila: Precio + botón editar */}
      <div className="flex items-end gap-2 mb-2">
        <div className="flex-1">
          <TextField
            label="Precio"
            type="currency"
            currencySymbol={getCurrencySymbol(currentCurrency)}
            value={priceInput}
            onChange={(e) => {
              const rawValue = e.target.value;
              setPriceInput(rawValue);
              isUserEditingPriceRef.current = true;

              // Función para parsear el valor según la moneda
              const parseCurrencyValue = (value: string): number => {
                if (!value || value.trim() === '') return 0;
                
                // Remover símbolos de moneda
                const cleaned = value.replace(/[$US]/g, '').replace(/\s+/g, '').trim();
                
                if (currentCurrency === Currency.USD && cleaned.includes(',')) {
                  // Formato USD con coma decimal: 1.234,56
                  const parts = cleaned.split(',');
                  const integerPart = parts[0].replace(/\./g, ''); // Remover puntos de miles
                  const decimalPart = parts[1] || '';
                  const normalized = integerPart + '.' + decimalPart;
                  const parsed = parseFloat(normalized);
                  return isNaN(parsed) ? 0 : parsed;
                } else {
                  // Formato CLP: 1.234.567 (solo remover puntos de miles)
                  const normalized = cleaned.replace(/\./g, '');
                  const parsed = parseFloat(normalized);
                  return isNaN(parsed) ? 0 : parsed;
                }
              };

              const parsedPrice = parseCurrencyValue(rawValue);
              onPriceChange(parsedPrice);
            }}
            allowDecimalComma={allowDecimalComma}
            disabled={!formatId || !isEditingPrice}
            data-test-id={dataTestIdPrefix ? `${dataTestIdPrefix}-format-price` : 'format-price'}
          />
        </div>
        {canEditPrice && (
          <div className="flex items-center justify-center pb-0.5">
            <IconButton
              icon={isEditingPrice ? 'check' : 'edit'}
              variant="basicSecondary"
              size="sm"
              ariaLabel={isEditingPrice ? 'Confirmar precio y moneda' : 'Editar precio y moneda'}
              title={isEditingPrice ? 'Confirmar' : 'Editar precio'}
              onClick={() => setIsEditingPrice(!isEditingPrice)}
              disabled={!formatId}
            />
          </div>
        )}
      </div>

      {/* Segunda fila: Selector de moneda */}
      <div className="w-full">
        <Select
          label="Moneda"
          options={currencyOptions}
          value={currentCurrency}
          onChange={(value) => {
            if (value) {
              onCurrencyChange(value as Currency);
            }
          }}
          disabled={!formatId || !isEditingPrice}
          data-test-id={dataTestIdPrefix ? `${dataTestIdPrefix}-currency-select` : 'format-currency-select'}
        />
      </div>
    </div>
  );
};

export default FormatSelector;