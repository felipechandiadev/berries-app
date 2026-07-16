'use client';

import React, { useState, useMemo } from 'react';
import { ProducerDetailData } from './types';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ReceptionsSection } from './sections/ReceptionsSection';
import { AdvancesSection } from './sections/AdvancesSection';
import { SettlementsSection } from './sections/SettlementsSection';
import { TraysSection } from './sections/TraysSection';
import { BankAccountsSection } from './sections/BankAccountsSection';

interface ProducerDetailLayoutProps {
  data: ProducerDetailData;
  onClose: () => void;
  onRefresh?: () => void;
}

export const ProducerDetailLayout: React.FC<ProducerDetailLayoutProps> = ({ data, onClose, onRefresh }) => {
  const [activeSection, setActiveSection] = useState('receptions');

  const sections = useMemo(() => [
    { id: 'receptions', label: 'Recepciones', component: ReceptionsSection },
    { id: 'advances', label: 'Anticipos', component: AdvancesSection },
    { id: 'settlements', label: 'Liquidaciones', component: SettlementsSection },
    { id: 'trays', label: 'Bandejas', component: TraysSection },
    { id: 'bankAccounts', label: 'Cuentas Bancarias', component: BankAccountsSection },
  ], []);

  const ActiveComponent = sections.find(s => s.id === activeSection)?.component || ReceptionsSection;

  return (
    <div className="flex flex-col h-full">
      <Header data={data} onClose={onClose} />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-gray-200 flex-shrink-0 overflow-y-auto py-4">
          <Sidebar
            sections={sections.map(s => ({ id: s.id, label: s.label }))}
            activeSection={activeSection}
            onSelect={setActiveSection}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden p-6">
          <div className="h-full overflow-y-auto">
            <ActiveComponent data={data} onRefresh={onRefresh} />
          </div>
        </main>
      </div>
    </div>
  );
};
