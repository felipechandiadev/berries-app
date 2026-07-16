'use client';

import React, { useState } from 'react';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { formatAuditDateLocaleES } from '@/lib/dateTimeUtils';

interface AuditRecord {
  id: string;
  entityName: string;
  entityId: string;
  userId?: string;
  user?: {
    userName: string;
  };
  action: string;
  changes?: Record<string, any>;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  description?: string;
  createdAt: Date;
}

interface AuditMoreButtonProps {
  audit: AuditRecord;
}

export default function AuditMoreButton({ audit }: AuditMoreButtonProps) {
  const [open, setOpen] = useState(false);

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '—';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <>
      <IconButton
        icon="more_horiz"
        variant="basic"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Ver detalles de auditoría"
      />

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Detalles de Auditoría"
        size="md"
      >
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {/* Información General */}
          <div className="border-b pb-4">
            <h4 className="font-semibold text-base mb-3">Información General</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 font-medium">Acción</p>
                <p className="text-foreground">{audit.action}</p>
              </div>
              <div>
                <p className="text-gray-600 font-medium">Fecha</p>
                <p className="text-foreground">{formatAuditDateLocaleES(audit.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-600 font-medium">Entidad</p>
                <p className="text-foreground">{audit.entityName}</p>
              </div>
              <div>
                <p className="text-gray-600 font-medium">ID Entidad</p>
                <p className="text-foreground text-xs break-all">{audit.entityId}</p>
              </div>
              <div>
                <p className="text-gray-600 font-medium">Usuario</p>
                <p className="text-foreground">{audit.user?.userName || audit.userId || '—'}</p>
              </div>
            </div>
          </div>

          {/* Descripción */}
          {audit.description && (
            <div className="border-b pb-4">
              <h4 className="font-semibold text-base mb-2">Descripción</h4>
              <p className="text-sm text-gray-700 break-words">{audit.description}</p>
            </div>
          )}

          {/* Valores Anteriores */}
          {audit.oldValues && Object.keys(audit.oldValues).length > 0 && (
            <div className="border-b pb-4">
              <h4 className="font-semibold text-base mb-2">Valores Anteriores</h4>
              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
                <pre className="whitespace-pre-wrap text-xs text-gray-700 break-words">
                  {JSON.stringify(audit.oldValues, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Valores Nuevos */}
          {audit.newValues && Object.keys(audit.newValues).length > 0 && (
            <div className="border-b pb-4">
              <h4 className="font-semibold text-base mb-2">Valores Nuevos</h4>
              <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
                <pre className="whitespace-pre-wrap text-xs text-gray-700 break-words">
                  {JSON.stringify(audit.newValues, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Cambios Detectados */}
          {audit.changes && Object.keys(audit.changes).length > 0 && (
            <div>
              <h4 className="font-semibold text-base mb-2">Cambios Detectados</h4>
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                <pre className="whitespace-pre-wrap text-xs text-gray-700 break-words">
                  {JSON.stringify(audit.changes, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
}
