'use client';

import React from 'react';
import { PrintProducerDetailButton } from './PrintProducerDetailButton';
import { ProducerDetailData } from './types';
import { Button } from '@/app/baseComponents/Button/Button';

interface HeaderProps {
  data: ProducerDetailData;
  onClose: () => void;
}

export const Header: React.FC<HeaderProps> = ({ data, onClose }) => {
  const { producer } = data;
  return (
    <header className="flex flex-col gap-4 px-6 py-4 border-b border-gray-200 bg-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col">
          <h2 className="text-xl font-semibold text-gray-900">{producer.name}</h2>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{producer.dni}</span>
            {producer.mail && (
              <>
                <span>•</span>
                <span>{producer.mail}</span>
              </>
            )}
            {producer.phone && (
              <>
                <span>•</span>
                <span>{producer.phone}</span>
              </>
            )}
          </div>
          {producer.address && (
            <div className="text-sm text-gray-500 mt-1">
              <span className="font-medium">Dirección:</span> {producer.address}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <Button variant="outlined" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-end">
        <PrintProducerDetailButton data={data} />
      </div>
    </header>
  );
};
