'use client';

import type {
  ReceptionDetailDocumentInfo,
  ReceptionDetailProducerInfo,
  ReceptionDetailSummary,
} from '../types';

interface ProducerSectionProps {
  summary: ReceptionDetailSummary;
  producer: ReceptionDetailProducerInfo | null;
  documents: ReceptionDetailDocumentInfo;
}

const infoRow = (label: string, value?: string | null) => (
  <div className="flex flex-col">
    <span className="text-xs uppercase tracking-wide text-gray-500">{label}</span>
    <span className="text-sm text-gray-800">
      {value && value.trim().length > 0 ? value : '—'}
    </span>
  </div>
);

export function ProducerSection({ summary, producer, documents }: ProducerSectionProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">Productor</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {infoRow('Nombre', producer?.name ?? summary.producerName)}
          {infoRow('RUT / DNI', producer?.dni ?? producer?.personDni)}
          {infoRow('Teléfono', producer?.phone)}
          {infoRow('Correo', producer?.mail)}
          {infoRow('Persona asociada', producer?.personName)}
          {infoRow('DNI persona asociada', producer?.personDni)}
        </div>
      </div>
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">Documentos</h4>
        <div className="space-y-3">
          {infoRow('Número de guía', documents.guideNumber ?? summary.guideNumber)}
        </div>
      </div>
    </div>
  );
}
