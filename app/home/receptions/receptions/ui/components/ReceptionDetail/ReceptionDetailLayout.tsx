'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReceptionDetailHeader } from './Header';
import { ReceptionDetailSidebar } from './Sidebar';
import type { ReceptionDetailData } from './types';
import {
  SummarySection,
  ProducerSection,
  TotalsSection,
  PacksSection,
  TrayReturnsSection,
  RelatedMovementsSection,
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
  const contentRef = useRef<HTMLDivElement>(null);

  const sections = useMemo<SectionConfig[]>(() => [
    {
      id: 'summary',
      label: 'Resumen',
      render: <SummarySection summary={data.summary} totals={data.totals ?? null} documents={data.documents} />,
    },
    {
      id: 'producer',
      label: 'Productor y documentos',
      render: (
        <ProducerSection
          summary={data.summary}
          producer={data.producer ?? null}
          documents={data.documents}
        />
      ),
    },
    {
      id: 'totals',
      label: 'Indicadores',
      render: <TotalsSection totals={data.totals ?? null} />,
    },
    {
      id: 'packs',
      label: 'Packs',
      render: (
        <PacksSection
          packs={data.packs}
          receptionId={data.summary.id}
          onPackDeleted={onRefresh}
        />
      ),
    },
    {
      id: 'tray-returns',
      label: 'Devoluciones de bandejas',
      render: <TrayReturnsSection trayReturns={data.trayReturns} />,
    },
    {
      id: 'related-movements',
      label: 'Movimientos relacionados',
      render: <RelatedMovementsSection groups={data.relatedMovements} />,
    },
    {
      id: 'history',
      label: 'Historial de cambios',
      render: <HistorySection history={data.history} />,
    },
  ], [data]);

  const [activeSection, setActiveSection] = useState<string>(() => sections[0]?.id ?? 'summary');

  useEffect(() => {
    if (!sections.some((section) => section.id === activeSection) && sections.length > 0) {
      setActiveSection(sections[0].id);
    }
  }, [sections, activeSection]);

  const scrollToSection = useCallback((id: string) => {
    if (!contentRef.current) {
      return;
    }

    const target = contentRef.current.querySelector<HTMLElement>(`[data-section="${id}"]`);

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleSelectSection = useCallback((id: string) => {
    setActiveSection(id);
    scrollToSection(id);
  }, [scrollToSection]);

  const handleScroll = useCallback(() => {
    if (!contentRef.current) {
      return;
    }

    const sectionElements = Array.from(contentRef.current.querySelectorAll<HTMLElement>('[data-section]'));
    if (sectionElements.length === 0) {
      return;
    }

    const containerTop = contentRef.current.getBoundingClientRect().top;
    let closestId = activeSection;
    let smallestOffset = Number.POSITIVE_INFINITY;

    sectionElements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const distance = Math.abs(rect.top - containerTop - 24);
      if (distance < smallestOffset) {
        smallestOffset = distance;
        closestId = element.dataset.section || element.id;
      }
    });

    if (closestId && closestId !== activeSection) {
      setActiveSection(closestId);
    }
  }, [activeSection]);

  return (
    <div className="flex flex-col h-full">
      <ReceptionDetailHeader
        summary={data.summary}
        totals={data.totals ?? null}
        onClose={onClose}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />
      <div className="flex flex-1 min-h-0 pt-4">
        <div className="hidden lg:block">
          <ReceptionDetailSidebar
            sections={sections.map((section) => ({ id: section.id, label: section.label }))}
            activeSection={activeSection}
            onSelect={handleSelectSection}
          />
        </div>
        <div className="flex-1 overflow-y-auto pl-0 lg:pl-6" ref={contentRef} onScroll={handleScroll}>
          <div className="flex flex-col gap-8 pb-12">
            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                data-section={section.id}
                className="scroll-mt-24"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  {section.label}
                </h3>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  {section.render}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
