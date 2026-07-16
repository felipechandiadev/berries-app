'use client';

import React, { useMemo, useState } from 'react';
import { formatAuditDateLocaleES } from '@/lib/dateTimeUtils';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import { DispatchWithRelations } from '../types';
import UpdateDispatchDateDialog from './UpdateDispatchDateDialog';

interface GeneralInfoSectionProps {
    data: DispatchWithRelations;
}

interface InfoRow {
    key: string;
    label: string;
    value: string;
}

export const GeneralInfoSection: React.FC<GeneralInfoSectionProps> = ({ data }) => {
    const { metadata, createdAt, updatedAt } = data;
    const [isDateEditDialogOpen, setIsDateEditDialogOpen] = useState(false);

    const generalInfoRows = useMemo<InfoRow[]>(() => {
        return [
            {
                key: 'client',
                label: 'Cliente',
                value: metadata.client?.name || '—',
            },
            {
                key: 'rut',
                label: 'RUT Cliente',
                value: metadata.client?.rut || '—',
            },
            {
                key: 'variety',
                label: 'Variedad',
                value: metadata.variety?.name || '—',
            },
            {
                key: 'format',
                label: 'Formato',
                value: metadata.format?.name || '—',
            },
            {
                key: 'registeredBy',
                label: 'Registrado por',
                value: metadata.history?.[0]?.userName || '—',
            },
        ];
    }, [metadata]);

    return (
        <div className="space-y-6">
            <section className="space-y-3">
                <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <p className="text-xs uppercase tracking-wide text-gray-500">Despacho</p>
                            <p className="text-xl font-semibold text-gray-900">#{String(data.id)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs uppercase tracking-wide text-gray-500">Fecha de registro</p>
                            <div className="text-sm font-medium text-gray-900">
                                {formatAuditDateLocaleES(String(createdAt))}
                            </div>
                            {updatedAt && String(updatedAt) !== String(createdAt) && (
                                <p className="mt-1 text-xs text-gray-500">
                                    Actualizado {formatAuditDateLocaleES(String(updatedAt))}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center">
                            <IconButton
                                icon="edit"
                                variant="basicSecondary"
                                size="sm"
                                title="Editar fecha de registro"
                                onClick={() => setIsDateEditDialogOpen(true)}
                            />
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {generalInfoRows.map((row) => (
                            <div key={row.key} className="flex flex-col">
                                <span className="text-xs uppercase tracking-wide text-gray-500">{row.label}</span>
                                <span className="text-sm font-medium text-gray-900">{row.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {metadata.notes && (
                <section className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                        Notas
                    </h3>
                    <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
                        <p className="text-sm text-amber-900 whitespace-pre-wrap">{metadata.notes}</p>
                    </div>
                </section>
            )}

            <UpdateDispatchDateDialog
                dispatch={data}
                open={isDateEditDialogOpen}
                onClose={() => setIsDateEditDialogOpen(false)}
                onSuccess={() => {
                    // Aquí podríamos agregar lógica para refrescar los datos
                    window.location.reload();
                }}
            />


        </div>
    );
};
