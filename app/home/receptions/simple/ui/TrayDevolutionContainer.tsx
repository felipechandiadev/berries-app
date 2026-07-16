"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/app/baseComponents/Button/Button';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import TrayDevolutionCard, { type TrayOption } from './detailCardComponents/TrayDevolutionCard';

export interface TrayDevolutionItem {
  id: number;
  trayId: string | null;
  quantity: number;
  trayLabel?: string | null;
}

interface TrayDevolutionContainerProps {
  onChange?: (items: TrayDevolutionItem[]) => void;
  className?: string;
  trayOptions: TrayOption[];
}

const TrayDevolutionContainer: React.FC<TrayDevolutionContainerProps> = ({ onChange, className, trayOptions }) => {
  const [items, setItems] = useState<TrayDevolutionItem[]>([]);
  const nextIdRef = useRef(0);

  useEffect(() => {
    onChange?.(items);
  }, [items, onChange]);

  const addItem = useCallback(() => {
    setItems((prev) => {
      const nextId = nextIdRef.current + 1;
      nextIdRef.current = nextId;
      return [...prev, { id: nextId, trayId: null, quantity: 0, trayLabel: null }];
    });
  }, []);

  const updateItem = useCallback((id: number, changes: Partial<Omit<TrayDevolutionItem, 'id'>>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  }, []);

  const removeItem = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const cards = useMemo(() => (
    items.map((item, index) => (
      <TrayDevolutionCard
        key={item.id}
        trayId={item.trayId}
        quantity={item.quantity}
        trayOptions={trayOptions}
        onTrayChange={(trayId) => {
          const selected = trayOptions.find((option) => option.id === trayId);
          updateItem(item.id, {
            trayId,
            trayLabel: selected?.label ?? null,
            quantity: trayId ? item.quantity : 0,
          });
        }}
        onQuantityChange={(quantity) => updateItem(item.id, { quantity })}
        onRemove={() => removeItem(item.id)}
        index={index}
      />
    ))
  ), [items, trayOptions, updateItem, removeItem]);

  const placeholders = useMemo(() => {
    const needed = Math.max(3 - items.length, 0);
    return Array.from({ length: needed }, (_, index) => (
      <div
        key={`placeholder-${index}`}
        className="flex min-h-[170px] items-center justify-center rounded-md border border-dashed border-border bg-white/40"
        data-test-id="tray-devolution-placeholder"
      />
    ));
  }, [items.length]);

  const containerClassName = `${className ? `${className} ` : ''}flex h-full w-full flex-col rounded-lg border border-border bg-gray-50 p-4 shadow-sm`;

  return (
    <div className={containerClassName} data-test-id="tray-devolution-container">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Bandejas devueltas al productor</h3>
        </div>
        <IconButton
          icon="add"
          variant="containedSecondary"
          onClick={addItem}
          data-test-id="tray-devolution-add"
          className="mt-2 sm:mt-0"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards}
        {placeholders}
      </div>
    </div>
  );
};

export default TrayDevolutionContainer;
