/**
 * Reception ticket print options / presets.
 * Persisted in localStorage so the last choice sticks across sessions.
 */

export type ReceptionPrintProfile = 'producer' | 'warehouse' | 'full';

export interface ReceptionPrintOptions {
  profile: ReceptionPrintProfile;
  showLogo: boolean;
  showPallets: boolean;
  showPackDetails: boolean;
  showPrices: boolean;
  showTrayDevolutions: boolean;
  showGuideDriver: boolean;
}

export const PRINT_PROFILE_LABELS: Record<ReceptionPrintProfile, string> = {
  producer: 'Productor',
  warehouse: 'Bodega',
  full: 'Completo',
};

const STORAGE_KEY = 'berries.receptionPrintOptions';

const PROFILE_DEFAULTS: Record<
  ReceptionPrintProfile,
  Omit<ReceptionPrintOptions, 'profile'>
> = {
  producer: {
    showLogo: true,
    showPallets: false,
    showPackDetails: false,
    showPrices: true,
    showTrayDevolutions: true,
    showGuideDriver: false,
  },
  warehouse: {
    showLogo: true,
    showPallets: true,
    showPackDetails: true,
    showPrices: false,
    showTrayDevolutions: true,
    showGuideDriver: true,
  },
  full: {
    showLogo: true,
    showPallets: true,
    showPackDetails: true,
    showPrices: true,
    showTrayDevolutions: true,
    showGuideDriver: true,
  },
};

/** Default: Completo so pallets and totals both appear. */
export function getDefaultReceptionPrintOptions(): ReceptionPrintOptions {
  return { profile: 'full', ...PROFILE_DEFAULTS.full };
}

export function applyPrintProfile(profile: ReceptionPrintProfile): ReceptionPrintOptions {
  return { profile, ...PROFILE_DEFAULTS[profile] };
}

export function loadReceptionPrintOptions(): ReceptionPrintOptions {
  if (typeof window === 'undefined') {
    return getDefaultReceptionPrintOptions();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultReceptionPrintOptions();
    const parsed = JSON.parse(raw) as Partial<ReceptionPrintOptions>;
    const base = getDefaultReceptionPrintOptions();
    return {
      profile: (parsed.profile as ReceptionPrintProfile) || base.profile,
      showLogo: parsed.showLogo ?? base.showLogo,
      showPallets: parsed.showPallets ?? base.showPallets,
      showPackDetails: parsed.showPackDetails ?? base.showPackDetails,
      showPrices: parsed.showPrices ?? base.showPrices,
      showTrayDevolutions: parsed.showTrayDevolutions ?? base.showTrayDevolutions,
      showGuideDriver: parsed.showGuideDriver ?? base.showGuideDriver,
    };
  } catch {
    return getDefaultReceptionPrintOptions();
  }
}

export function saveReceptionPrintOptions(options: ReceptionPrintOptions): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
  } catch {
    // ignore quota / private mode
  }
}

export interface AggregatedPalletLine {
  palletId: number;
  traysAssigned: number;
  grossWeightKg: number;
  packNumbers: number[];
}

export function aggregatePalletLines(
  packs: Array<{
    packNumber?: number | null;
    palletAssignments?: Array<{
      palletId?: number;
      traysAssigned?: number;
      grossWeightKg?: number;
    }> | null;
  }>
): AggregatedPalletLine[] {
  const map = new Map<number, AggregatedPalletLine>();

  packs.forEach((pack, index) => {
    const packNumber = pack.packNumber || index + 1;
    const assignments = Array.isArray(pack.palletAssignments) ? pack.palletAssignments : [];
    assignments.forEach((assignment) => {
      const palletId = Number(assignment.palletId);
      const trays = Number(assignment.traysAssigned ?? 0);
      const gross = Number(assignment.grossWeightKg ?? 0);
      if (!Number.isFinite(palletId) || palletId <= 0 || !(trays > 0)) return;

      const current = map.get(palletId) ?? {
        palletId,
        traysAssigned: 0,
        grossWeightKg: 0,
        packNumbers: [],
      };
      current.traysAssigned += trays;
      if (Number.isFinite(gross) && gross > 0) {
        current.grossWeightKg += gross;
      }
      if (!current.packNumbers.includes(packNumber)) {
        current.packNumbers.push(packNumber);
      }
      map.set(palletId, current);
    });
  });

  return Array.from(map.values()).sort((a, b) => a.palletId - b.palletId);
}
