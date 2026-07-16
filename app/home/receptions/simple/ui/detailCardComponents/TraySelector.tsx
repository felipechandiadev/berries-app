import React from 'react';
import Select from '@/app/baseComponents/Select/Select';

interface TraySelectorProps {
  trayId: string | null;
  onTrayChange: (id: string | null, weight: number, label: string | null) => void; // Callback to update trayId, unitTrayWeight, and tray label
  dataTestIdPrefix?: string;
  trayOptions: { id: string; label: string; weight: number }[];
}

const TraySelector: React.FC<TraySelectorProps> = ({ trayId, onTrayChange, dataTestIdPrefix, trayOptions }) => {
  return (
    <Select
      label="Tipo de bandeja"
      options={trayOptions.map(t => ({ id: t.id, label: t.label }))} // Use processed options
      placeholder="Selecciona un tipo de bandeja"
      value={trayId}
      onChange={(value) => {
        const selectedId = value ? value.toString() : null;
        const selectedTray = trayOptions.find((tray) => tray.id === selectedId); // Find in full tray list
        const trayWeight = selectedTray ? Number(selectedTray.weight) : 0;
        onTrayChange(selectedId, Number.isFinite(trayWeight) ? trayWeight : 0, selectedTray?.label ?? null); // Update tray info
      }}
      data-test-id={dataTestIdPrefix ? `${dataTestIdPrefix}-tray-select` : 'tray-select'}
    />
  );
};

export default TraySelector;
