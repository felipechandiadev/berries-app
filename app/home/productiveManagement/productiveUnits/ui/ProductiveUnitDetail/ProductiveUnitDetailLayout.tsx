'use client';

import React, { useState, useMemo } from 'react';
import { ProductiveUnitDetailData } from './types';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ProducersSection } from './sections/ProducersSection';
import { ReceptionsSection } from './sections/ReceptionsSection';
import { AdvancesSection } from './sections/AdvancesSection';
import { SettlementsSection } from './sections/SettlementsSection';

interface ProductiveUnitDetailLayoutProps {
  data: ProductiveUnitDetailData;
  onClose: () => void;
  onRefresh?: () => void;
}

export const ProductiveUnitDetailLayout: React.FC<ProductiveUnitDetailLayoutProps> = ({
  data,
  onClose,
  onRefresh,
}) => {
  const [activeSection, setActiveSection] = useState('producers');

  const sections = useMemo(
    () => [
      { id: 'producers', label: 'Productores', component: ProducersSection },
      { id: 'receptions', label: 'Recepciones', component: ReceptionsSection },
      { id: 'advances', label: 'Anticipos', component: AdvancesSection },
      { id: 'settlements', label: 'Liquidaciones', component: SettlementsSection },
    ],
    []
  );

  const ActiveComponent =
    sections.find((s) => s.id === activeSection)?.component || ProducersSection;

  return (
    <div className="flex flex-col h-full">
      <Header data={data} onClose={onClose} />

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 border-r border-gray-200 flex-shrink-0 overflow-y-auto py-4">
          <Sidebar
            sections={sections.map((s) => ({ id: s.id, label: s.label }))}
            activeSection={activeSection}
            onSelect={setActiveSection}
          />
        </aside>

        <main className="flex-1 overflow-hidden p-6">
          <div className="h-full overflow-y-auto">
            <ActiveComponent data={data} onRefresh={onRefresh} />
          </div>
        </main>
      </div>
    </div>
  );
};
