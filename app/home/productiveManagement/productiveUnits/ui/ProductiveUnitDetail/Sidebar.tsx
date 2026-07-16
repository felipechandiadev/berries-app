'use client';

import React from 'react';

interface Section {
  id: string;
  label: string;
}

interface SidebarProps {
  sections: Section[];
  activeSection: string;
  onSelect: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ sections, activeSection, onSelect }) => {
  return (
    <nav className="flex flex-col gap-1 px-2">
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => onSelect(section.id)}
          className={`
            w-full text-left px-4 py-2 text-sm transition-colors duration-150
            ${activeSection === section.id
              ? 'bg-secondary text-background font-medium border border-secondary shadow-sm'
              : 'text-gray-700 border border-transparent hover:border-secondary hover:bg-[#a2b94580] hover:text-gray-900'
            }
          `}
        >
          {section.label}
        </button>
      ))}
    </nav>
  );
};
