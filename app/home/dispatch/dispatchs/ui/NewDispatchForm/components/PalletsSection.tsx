'use client';

import React, { useMemo } from 'react';
import { Button } from '@/app/baseComponents/Button/Button';
import PalletCard from './PalletCard';
import type { DispatchPalletForm, TrayOption } from '../types';

interface PalletsSectionProps {
  pallets: DispatchPalletForm[];
  trayOptions: TrayOption[];
  onAdd: () => void;
  onTrayChange: (id: string, trayId: string | null) => void;
  onChange: (id: string, changes: Partial<DispatchPalletForm>) => void;
  onRemove: (id: string) => void;
}

const PalletsSection: React.FC<PalletsSectionProps> = ({ pallets, trayOptions, onAdd, onTrayChange, onChange, onRemove }) => {
  const cards = useMemo(() => pallets.map((pallet, index) => (
    <PalletCard
      key={pallet.id}
      index={index}
      pallet={pallet}
      trayOptions={trayOptions}
      onTrayChange={(trayId) => onTrayChange(pallet.id, trayId)}
      onChange={(changes) => onChange(pallet.id, changes)}
      onRemove={() => onRemove(pallet.id)}
    />
  )), [pallets, trayOptions, onTrayChange, onChange, onRemove]);

  const placeholders = useMemo(() => {
    const visibleSlots = 3;
    const remaining = Math.max(visibleSlots - pallets.length, 0);
    return Array.from({ length: remaining }, (_, index) => (
      <div
        key={`placeholder-${index}`}
        className="flex min-h-[180px] rounded-md border border-dashed border-border bg-white/40"
        data-test-id="dispatch-pallet-placeholder"
      />
    ));
  }, [pallets.length]);

  return (
    <section className="flex h-full w-full flex-col rounded-lg border border-border bg-gray-50 p-4 shadow-sm" data-test-id="dispatch-pallets-section">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Pallets</h3>
          <p className="text-sm text-muted-foreground">Administra cada pallet y su peso</p>
        </div>
        <Button
          variant="outlined"
          className="inline-flex items-center gap-1 rounded-full px-3 py-1"
          onClick={onAdd}
          data-test-id="dispatch-add-pallet"
        >
          + Pallet
        </Button>
      </div>
      <div className="mt-4 grid flex-1 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[...cards, ...placeholders]}
      </div>
    </section>
  );
};

export default PalletsSection;
