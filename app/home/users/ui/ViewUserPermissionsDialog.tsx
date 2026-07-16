'use client';

import React from 'react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { Button } from '@/app/baseComponents/Button/Button';
import DotProgress from '@/app/baseComponents/DotProgress/DotProgress';
import { usePermissions } from '@/app/state/hooks/usePermissions';
import { PERMISSION_DEFINITIONS, PermissionDefinition } from '@/lib/permissions';

interface ViewUserPermissionsDialogProps {
  open: boolean;
  onClose: () => void;
  userName: string;
}

// Mapeo de categorías en inglés a español
const CATEGORY_LABELS: Record<string, string> = {
  dashboard: 'Panel Principal',
  receptions: 'Recepciones',
  producers: 'Productores',
  productiveunits: 'Unidades Productivas',
  seasons: 'Temporadas',
  advances: 'Anticipos',
  customers: 'Clientes',
  dispatches: 'Despachos',
  varieties: 'Variedades',
  formats: 'Formatos',
  trays: 'Bandejas',
  storages: 'Almacenes',
  pallets: 'Pallets',
  reports: 'Reportes',
  users: 'Usuarios',
  audit: 'Auditoría',
  settlements: 'Liquidaciones',
  admin: 'Administración',
  transactions: 'Transacciones',
};

const ViewUserPermissionsDialog: React.FC<ViewUserPermissionsDialogProps> = ({
  open,
  onClose,
  userName,
}) => {
  const { permissions, isLoading } = usePermissions();

  const groupedPermissions = React.useMemo(() => {
    const groups: Record<string, PermissionDefinition[]> = {};

    PERMISSION_DEFINITIONS.forEach((def) => {
      const category = def.ability.split('_')[0].toLowerCase(); // Extract category from ability name
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(def);
    });

    return groups;
  }, []);

  return (
    <Dialog open={open} onClose={onClose} title={`Permisos de ${userName}`} size="xxl" scroll="body" overflowBehavior="visible">
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <DotProgress />
          </div>
        ) : (
          <div>
            {Object.entries(groupedPermissions).map(([category, defs]) => (
              <div key={category} className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 capitalize">
                  {CATEGORY_LABELS[category] || category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {defs.map((def) => {
                    const hasPermission = permissions.includes(def.ability);
                    return (
                      <div
                        key={def.ability}
                        className={`flex flex-col justify-between p-3 rounded-lg border h-full ${hasPermission
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-100 border-red-200'
                          }`}
                      >
                        <div className="mb-2">
                          <div className="font-medium text-gray-900">
                            {def.label}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {def.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button onClick={onClose} variant="primary">
            Cerrar
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default ViewUserPermissionsDialog;