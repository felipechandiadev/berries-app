'use client';

import React from 'react';
import Switch from '@/app/baseComponents/Switch/Switch';
import {
  PRINT_PROFILE_LABELS,
  applyPrintProfile,
  type ReceptionPrintOptions,
  type ReceptionPrintProfile,
} from '@/lib/printing/printOptions';

interface PrintOptionsPanelProps {
  options: ReceptionPrintOptions;
  onChange: (next: ReceptionPrintOptions) => void;
}

const PROFILES: ReceptionPrintProfile[] = ['producer', 'warehouse', 'full'];

const PrintOptionsPanel: React.FC<PrintOptionsPanelProps> = ({ options, onChange }) => {
  const setProfile = (profile: ReceptionPrintProfile) => {
    onChange(applyPrintProfile(profile));
  };

  const setFlag = (key: keyof Omit<ReceptionPrintOptions, 'profile'>, value: boolean) => {
    onChange({ ...options, [key]: value });
  };

  return (
    <div
      className="mb-4 rounded-md border border-border bg-muted/30 p-3 text-sm"
      data-test-id="print-options-panel"
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Configurar impresión
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        {PROFILES.map((profile) => {
          const active = options.profile === profile;
          return (
            <button
              key={profile}
              type="button"
              onClick={() => setProfile(profile)}
              aria-pressed={active}
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                  : 'border-border bg-white text-foreground hover:border-emerald-500/50 hover:bg-emerald-50'
              }`}
              data-test-id={`print-profile-${profile}`}
            >
              {PRINT_PROFILE_LABELS[profile]}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        <Switch
          label="Logo"
          labelPosition="right"
          checked={options.showLogo}
          onChange={(v) => setFlag('showLogo', v)}
          data-test-id="print-opt-logo"
        />
        <Switch
          label="Pallets asociados"
          labelPosition="right"
          checked={options.showPallets}
          onChange={(v) => setFlag('showPallets', v)}
          data-test-id="print-opt-pallets"
        />
        <Switch
          label="Detalle de packs"
          labelPosition="right"
          checked={options.showPackDetails}
          onChange={(v) => setFlag('showPackDetails', v)}
          data-test-id="print-opt-packs"
        />
        <Switch
          label="Precios / totales"
          labelPosition="right"
          checked={options.showPrices}
          onChange={(v) => setFlag('showPrices', v)}
          data-test-id="print-opt-prices"
        />
        <Switch
          label="Devolución bandejas"
          labelPosition="right"
          checked={options.showTrayDevolutions}
          onChange={(v) => setFlag('showTrayDevolutions', v)}
          data-test-id="print-opt-devolutions"
        />
        <Switch
          label="Guía / conductor"
          labelPosition="right"
          checked={options.showGuideDriver}
          onChange={(v) => setFlag('showGuideDriver', v)}
          data-test-id="print-opt-guide"
        />
      </div>
    </div>
  );
};

export default PrintOptionsPanel;
