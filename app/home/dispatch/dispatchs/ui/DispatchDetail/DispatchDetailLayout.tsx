'use client';

import React, { useState, useMemo } from 'react';
import { DispatchWithRelations } from './types';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { GeneralInfoSection } from './sections/GeneralInfoSection';
import { SummarySection } from './sections/SummarySection';
import { PalletsSection } from './sections/PalletsSection';
import { HistorySection } from './sections/HistorySection';

interface DispatchDetailLayoutProps {
  data: DispatchWithRelations;
  onClose: () => void;
  onRefresh?: () => void;
}

export const DispatchDetailLayout: React.FC<DispatchDetailLayoutProps> = ({ data, onClose, onRefresh }) => {
  const [activeSection, setActiveSection] = useState('general');

  const sections = useMemo(() => [
    { id: 'general', label: 'Datos Generales', component: GeneralInfoSection },
    { id: 'summary', label: 'Resumen', component: SummarySection },
    { id: 'pallets', label: 'Pallets', component: PalletsSection },
    { id: 'history', label: 'Historial', component: HistorySection },
  ], []);

  const ActiveComponent = sections.find(s => s.id === activeSection)?.component || GeneralInfoSection;

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
