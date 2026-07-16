'use client';

import { useCallback, useMemo, useState } from 'react';
import { ReceptionDetailHeader } from './Header';
import { ReceptionDetailSidebar } from './Sidebar';
import type { ReceptionDetailData } from './types';
import {
  GeneralInfoSection,
  SummarySection,
  PacksSection,
  TrayReturnsSection,
  HistorySection,
} from './sections';

interface ReceptionDetailLayoutProps {
  data: ReceptionDetailData;
  onClose: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

interface SectionConfig {
  id: string;
  label: string;
  render: React.ReactNode;
}

export function ReceptionDetailLayout({ data, onClose, onRefresh, refreshing = false }: ReceptionDetailLayoutProps) {
  const isSettled = data.summary.isSettled ?? false;

  const sections = useMemo<SectionConfig[]>(() => [
    {
      id: 'general',
      label: 'Datos generales',
      render: (
        <GeneralInfoSection
          summary={data.summary}
          documents={data.documents}
          producer={data.producer ?? null}
          packs={data.packs}
          onRefresh={onRefresh}
          isSettled={isSettled}
        />
      ),
    },
    {
      id: 'summary',
      label: 'Resumen',
      render: (
        <SummarySection
          summary={data.summary}
          totals={data.totals ?? null}
          documents={data.documents}
          packs={data.packs}
          onRefresh={onRefresh}
          isSettled={isSettled}
        />
      ),
    },
    {
      id: 'packs',
      label: 'Packs',
      render: (
        <PacksSection
          packs={data.packs}
          receptionId={data.summary.id}
          onPackDeleted={onRefresh}
          onPackUpdated={onRefresh}
          isSettled={isSettled}
        />
      ),
    },
    {
      id: 'tray-returns',
      label: 'Devoluciones de bandejas',
      render: <TrayReturnsSection trayReturns={data.trayReturns} isSettled={isSettled} />,
    },
    {
      id: 'history',
      label: 'Historial de cambios',
      render: <HistorySection history={data.history} />,
    },
  ], [data, onRefresh, isSettled]);

  const [activeSection, setActiveSection] = useState<string>('summary');

  const activeSectionData = sections.find(section => section.id === activeSection);

  const handleSelectSection = useCallback((id: string) => {
    setActiveSection(id);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <ReceptionDetailHeader
        summary={data.summary}
        totals={data.totals ?? null}
        data={data}
        onClose={onClose}
      />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 border-r border-gray-200 flex-shrink-0 overflow-y-auto py-4">
          <ReceptionDetailSidebar
            sections={sections.map((section) => ({ id: section.id, label: section.label }))}
            activeSection={activeSection}
            onSelect={handleSelectSection}
          />
        </aside>
        <main className="flex-1 overflow-hidden p-6">
          <div className="h-full overflow-y-auto">
            {activeSectionData && (
              <div className="h-full">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 lg:hidden">
                  {activeSectionData.label}
                </h3>
                <div className="h-full overflow-y-auto">
                  {activeSectionData.render}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
