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
    <nav className="w-full lg:w-56 flex-shrink-0 border-r border-gray-200 pr-3">
      <ul className="space-y-1">
        {sections.map((section) => {
          const isActive = section.id === activeSection;
          return (
            <li key={section.id}>
              <button
                type="button"
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
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
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
