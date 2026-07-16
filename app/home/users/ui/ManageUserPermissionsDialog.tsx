'use client';

import React, { useEffect, useMemo, useState, useTransition } from 'react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { Button } from '@/app/baseComponents/Button/Button';
import DotProgress from '@/app/baseComponents/DotProgress/DotProgress';
import { PERMISSION_DEFINITIONS, PermissionDefinition, AbilityValue } from '@/lib/permissions';
import { getUserPermissions, updateUserPermissions } from '@/app/actions/permissions';
import { useSession } from 'next-auth/react';

interface ManageUserPermissionsDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  onUpdated?: (abilities: AbilityValue[]) => void;
  'data-test-id'?: string;
}

type DragSource = 'available' | 'assigned';

type DragState = {
  ability: AbilityValue;
  source: DragSource;
} | null;

const ManageUserPermissionsDialog: React.FC<ManageUserPermissionsDialogProps> = ({
  open,
  onClose,
  userId,
  userName,
  onUpdated,
  'data-test-id': dataTestId,
}) => {
  const [assignedAbilities, setAssignedAbilities] = useState<AbilityValue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DragState>(null);
  const { data: session, update: updateSession } = useSession();

  useEffect(() => {
    if (!open || !userId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    getUserPermissions(userId)
      .then((abilities) => {
        if (Array.isArray(abilities)) {
          setAssignedAbilities(abilities.filter((ability): ability is AbilityValue => typeof ability === 'string'));
        } else {
          setAssignedAbilities([]);
        }
      })
      .catch((loadError) => {
        console.error('[ManageUserPermissionsDialog] Error loading permissions:', loadError);
        setAssignedAbilities([]);
        setError('No se pudieron cargar los permisos del usuario.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [open, userId]);

  useEffect(() => {
    if (!open) {
      setDragging(null);
    }
  }, [open]);

  const assignedSet = useMemo(() => new Set(assignedAbilities), [assignedAbilities]);

  const availablePermissions = useMemo<PermissionDefinition[]>(() => {
    return PERMISSION_DEFINITIONS.filter((definition) => !assignedSet.has(definition.ability));
  }, [assignedSet]);

  const assignedPermissionDefinitions = useMemo<PermissionDefinition[]>(() => {
    return PERMISSION_DEFINITIONS.filter((definition) => assignedSet.has(definition.ability));
  }, [assignedSet]);

  const handleMoveAbility = (ability: AbilityValue, target: DragSource) => {
    setAssignedAbilities((current) => {
      const hasAbility = current.includes(ability);

      if (target === 'assigned') {
        if (hasAbility) {
          return current;
        }
        return [...current, ability];
      }

      if (!hasAbility) {
        return current;
      }

      return current.filter((currentAbility) => currentAbility !== ability);
    });
  };

  const handleDrop = (target: DragSource) => (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (!dragging) {
      return;
    }

    if (dragging.source === target) {
      setDragging(null);
      return;
    }

    handleMoveAbility(dragging.ability, target);
    setDragging(null);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleSave = () => {
    setError(null);

    startSaving(async () => {
      const response = await updateUserPermissions({
        userId,
        abilities: assignedAbilities,
      });

      if (!response?.success) {
        setError(response?.message || 'Error al guardar los permisos.');
        return;
      }

      if (updateSession) {
        await updateSession({
          user: {
            ...(session?.user || {}),
            permissions: assignedAbilities,
          },
        } as any);
      }

      if (onUpdated) {
        onUpdated(assignedAbilities);
      }

      onClose();
    });
  };

  const handleReset = () => {
    setAssignedAbilities([]);
  };

  const renderPermissionCard = (definition: PermissionDefinition, source: DragSource) => {
    const isAvailable = source === 'available';
    const cardClassName = isAvailable
      ? "border border-neutral-200 rounded-md p-3 bg-white shadow-sm cursor-grab active:cursor-grabbing"
      : "border border-green-200 rounded-md p-3 bg-green-100 shadow-sm cursor-grab active:cursor-grabbing";

    return (
      <div
        key={definition.ability}
        className={cardClassName}
        draggable
        onDragStart={() => setDragging({ ability: definition.ability, source })}
        onDragEnd={() => setDragging(null)}
      >
        <p className="font-semibold text-sm text-foreground">{definition.label}</p>
        <p className="text-xs text-neutral-600 mt-1 leading-snug">{definition.description}</p>
      </div>
    );
  };

  const dialogActions = (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <span className="material-symbols-outlined text-base text-neutral-500">info</span>
        Arrastra un permiso entre las columnas para asignarlo o quitarlo.
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="text"
          className="text-sm"
          onClick={onClose}
          disabled={isSaving}
        >
          Cancelar
        </Button>
        <Button
          variant="outlined"
          className="text-sm"
          onClick={handleReset}
          disabled={isSaving || assignedAbilities.length === 0}
        >
          Limpiar
        </Button>
        <Button
          variant="primary"
          className="text-sm"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Permisos de ${userName}`}
      size="xxl"
      actions={dialogActions}
      data-test-id={dataTestId || 'manage-permissions-dialog'}
    >
      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <DotProgress />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {error && (
            <div className="text-sm text-red-600 border border-red-200 rounded-md bg-red-50 px-3 py-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div
              onDrop={handleDrop('available')}
              onDragOver={handleDragOver}
              className="border border-neutral-200 rounded-lg p-4 bg-white min-h-[240px] flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Permisos disponibles</h4>
                <span className="text-xs text-neutral-500">{availablePermissions.length}</span>
              </div>
              <p className="text-xs text-neutral-500 leading-snug">
                Arrastra un permiso hacia el panel derecho para asignarlo al usuario.
              </p>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto pr-1 content-start">
                {availablePermissions.length === 0 ? (
                  <p className="text-xs text-neutral-400 text-center mt-4 col-span-full">
                    Todos los permisos disponibles ya están asignados.
                  </p>
                ) : (
                  availablePermissions.map((definition) => renderPermissionCard(definition, 'available'))
                )}
              </div>
            </div>

            <div
              onDrop={handleDrop('assigned')}
              onDragOver={handleDragOver}
              className="border border-neutral-200 rounded-lg p-4 bg-white min-h-[240px] flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Permisos asignados</h4>
                <span className="text-xs text-neutral-500">{assignedAbilities.length}</span>
              </div>
              <p className="text-xs text-neutral-500 leading-snug">
                Arrastra un permiso hacia este panel para quitarlo del usuario.
              </p>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto pr-1 content-start">
                {assignedPermissionDefinitions.length === 0 ? (
                  <p className="text-xs text-neutral-400 text-center mt-4 col-span-full">
                    El usuario aún no tiene permisos asignados.
                  </p>
                ) : (
                  assignedPermissionDefinitions.map((definition) => renderPermissionCard(definition, 'assigned'))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
};

export default ManageUserPermissionsDialog;
