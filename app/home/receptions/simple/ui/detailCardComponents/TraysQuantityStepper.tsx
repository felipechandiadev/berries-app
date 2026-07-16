import React from 'react';
import NumberStepper from '@/app/baseComponents/NumberStepper/NumberStepper';

interface TraysQuantityStepperProps {
  traysQuantity: number;
  unitTrayWeight: number;
  onQuantityChange: (quantity: number) => void;
  allowNegative?: boolean;
  min?: number;
}

const TraysQuantityStepper: React.FC<TraysQuantityStepperProps> = ({
  traysQuantity,
  unitTrayWeight,
  onQuantityChange,
  allowNegative = false,
  min,
}) => {
  const normalizedUnitWeight = Number.isFinite(unitTrayWeight) ? unitTrayWeight : Number(unitTrayWeight) || 0;
  const formatWeight = (weight: number) => {
    return new Intl.NumberFormat('es-CL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(weight);
  };

  const totalTrayWeight = normalizedUnitWeight * Math.max(0, traysQuantity);
  const showTrayWeight = normalizedUnitWeight > 0 && traysQuantity > 0;
  const labelSuffix = showTrayWeight ? ` (${formatWeight(totalTrayWeight)} Kg)` : '';

  return (
    <div>
      <NumberStepper
        label={`Bandejas${labelSuffix}`}
        value={traysQuantity}
        allowNegative={allowNegative}
        min={min ?? (allowNegative ? undefined : 0)}
        onChange={(value) => {
          onQuantityChange(value);
        }}
        data-test-id="pack-trays-quantity"
      />
    </div>
  );
};

export default TraysQuantityStepper;