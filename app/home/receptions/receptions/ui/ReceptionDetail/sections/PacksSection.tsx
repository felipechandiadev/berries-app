'use client';

import type { ReceptionDetailPack } from '../types';
import { PackCard } from './PackCard';

interface PacksSectionProps {
  packs: ReceptionDetailPack[];
  receptionId: string;
  onPackDeleted?: () => void;
  onPackUpdated?: () => void;
  isSettled?: boolean;
}

export function PacksSection({ packs, receptionId, onPackDeleted, onPackUpdated, isSettled = false }: PacksSectionProps) {
  if (!packs.length) {
    return <p className="text-sm text-gray-500">No hay packs registrados para esta recepción.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {packs.map((pack) => (
        <PackCard
          key={pack.packId}
          pack={pack}
          receptionId={receptionId}
          onPackDeleted={onPackDeleted}
          onPackUpdated={onPackUpdated}
          isSettled={isSettled}
        />
      ))}
    </div>
  );
}
