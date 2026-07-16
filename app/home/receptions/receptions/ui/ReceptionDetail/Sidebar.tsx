'use client';

import React from 'react';

interface SidebarSection {
  id: string;
  label: string;
  disabled?: boolean;
}

interface ReceptionDetailSidebarProps {
  sections: SidebarSection[];
  activeSection: string;
  onSelect: (id: string) => void;
}

export function ReceptionDetailSidebar({ sections, activeSection, onSelect }: ReceptionDetailSidebarProps) {
  return (
    <nav className="flex flex-col gap-1 px-2">
      {sections.map((section) => {
        const isActive = section.id === activeSection;
        return (
          <button
            key={section.id}
            type="button"
            className={`w-full text-right px-4 py-2 text-sm transition-colors duration-150 ${
              isActive
                ? 'bg-secondary text-background font-medium border border-secondary shadow-sm'
                : 'text-gray-700 border border-transparent hover:border-secondary hover:bg-[#a2b94580] hover:text-gray-900'
            } ${section.disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            onClick={() => {
              if (!section.disabled) {
                onSelect(section.id);
              }
            }}
            disabled={section.disabled}
          >
            {section.label}
          </button>
        );
      })}
    </nav>
  );
}
