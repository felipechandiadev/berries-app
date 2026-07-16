// Server Actions para CRUD de la entidad Storage
'use server';

import { Storage } from '../../data/entities/Storage';
import { Audit } from '../../data/entities/Audit';
import { AuditActionType } from '../../data/entities/audit.types';
import { getDb } from '../../data/db';
import moment from 'moment-timezone';
import { revalidatePath } from 'next/cache';
import { getCurrentUserSession } from './auth.server';
import { EntityManager, Like, IsNull, Not } from 'typeorm';

const APP_TIMEZONE = 'America/Santiago';

/**
 * Convierte una entidad Storage a un objeto plano serializable
 */
function serializeStorage(storage: Storage): any {
  return JSON.parse(JSON.stringify({
    id: storage.id,
    name: storage.name,
    capacityPallets: storage.capacityPallets,
    location: storage.location,
    active: storage.active,
    createdAt: storage.createdAt,
    updatedAt: storage.updatedAt,
    deletedAt: storage.deletedAt,
  }));
}

/**
 * Convierte un array de entidades Storage a objetos planos serializables
 */
function serializeStorages(storages: Storage[]): any[] {
  return storages.map(storage => JSON.parse(JSON.stringify({
    id: storage.id,
    name: storage.name,
    capacityPallets: storage.capacityPallets,
    location: storage.location,
    active: storage.active,
    createdAt: storage.createdAt,
    updatedAt: storage.updatedAt,
    deletedAt: storage.deletedAt,
  })));
}

export interface CreateStorageInput {
  name: string;
  capacityPallets?: number;
  location?: string;
  active?: boolean;
}

export interface UpdateStorageInput {
  id: string;
  name?: string;
  capacityPallets?: number;
  location?: string;
  active?: boolean;
}

export interface GetStoragesFilters {
  name?: string;
  active?: boolean;
}

export interface StorageResult {
  success: boolean;
  message?: string;
  data?: Storage | Storage[] | null;
  error?: string;
}

/**
 * Helper function to log audit for storage
 * Uses Chile timezone (America/Santiago) for consistent timestamp handling
 */
async function logStorageAudit(
  manager: EntityManager,
  entityId: string,
  action: AuditActionType,
  userId: string | undefined,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>
) {
  try {
    console.log('[logStorageAudit] Iniciando registro de auditoría. userId:', userId, 'action:', action);

    const crypto = require('crypto');
    const auditId = crypto.randomUUID();

    // Crear los cambios detectados
    const fields: Record<string, any> = {};
    let changeCount = 0;

    if (oldValues && newValues) {
      // Para UPDATE, comparar valores viejos y nuevos
      for (const key in newValues) {
        if (oldValues[key] !== newValues[key]) {
          fields[key] = {
            oldValue: oldValues[key],
            newValue: newValues[key],
          };
          changeCount++;
        }
      }
    } else if (newValues && !oldValues) {
      // Para CREATE, todos los valores son nuevos
      for (const key in newValues) {
        fields[key] = {
          oldValue: null,
          newValue: newValues[key],
        };
        changeCount++;
      }
    } else if (oldValues && !newValues) {
      // Para DELETE, todos los valores se eliminan
      for (const key in oldValues) {
        fields[key] = {
          oldValue: oldValues[key],
          newValue: null,
        };
        changeCount++;
      }
    }

    const audit = manager.create(Audit, {
      id: auditId,
      entityName: 'Storage',
      entityId: entityId,
      userId: userId,
      action: action,
      description: `${action} storage ${entityId}`,
      oldValues: oldValues,
      newValues: newValues,
      changes: changeCount > 0 ? fields : undefined,
      createdAt: new Date(moment.tz(APP_TIMEZONE).format('YYYY-MM-DD HH:mm:ss')), // Use Chile timezone for consistent timestamp
    });

    await manager.save(Audit, audit);
    console.log('[logStorageAudit] Auditoría registrada exitosamente');
  } catch (error) {
    console.error('[logStorageAudit] Error al registrar auditoría:', error);
    // No fallar la operación principal por error de auditoría
  }
}

/**
 * GET - Obtener todos los storages con filtros opcionales
 */
export async function getStorages(filters?: GetStoragesFilters): Promise<StorageResult> {
  try {
    const db = await getDb();
    const repo = db.getRepository(Storage);

    const queryBuilder = repo.createQueryBuilder('storage');

    // Aplicar filtros
    if (filters?.name) {
      queryBuilder.andWhere('storage.name LIKE :name', { name: `%${filters.name}%` });
    }

    if (filters?.active !== undefined) {
      queryBuilder.andWhere('storage.active = :active', { active: filters.active });
    }

    // Solo registros no eliminados
    queryBuilder.andWhere('storage.deletedAt IS NULL');

    // Ordenar por nombre
    queryBuilder.orderBy('storage.name', 'ASC');

    const storages = await queryBuilder.getMany();

    return {
      success: true,
      data: serializeStorages(storages),
    };
  } catch (error: any) {
    console.error('[getStorages] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al obtener los storages',
    };
  }
}

/**
 * GET - Obtener un storage por ID
 */
export async function getStorageById(id: string): Promise<StorageResult> {
  try {
    if (!id || id.trim() === '') {
      return { success: false, error: 'ID inválido' };
    }

    const db = await getDb();
    const storage = await db.getRepository(Storage).findOne({
      where: { id, deletedAt: IsNull() }
    });

    if (!storage) {
      return { success: false, error: 'Storage no encontrado' };
    }

    return {
      success: true,
      data: storage,
    };
  } catch (error: any) {
    console.error('[getStorageById] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al obtener el storage',
    };
  }
}

/**
 * CREATE - Crear un nuevo storage
 */
export async function createStorage(data: CreateStorageInput, auditUserId?: string): Promise<StorageResult> {
  try {
    // Validaciones
    if (!data.name || data.name.trim() === '') {
      return { success: false, error: 'El nombre es requerido' };
    }

    if (data.name.trim().length > 255) {
      return { success: false, error: 'El nombre no puede tener más de 255 caracteres' };
    }

    if (data.capacityPallets !== undefined && (data.capacityPallets < 0 || !Number.isInteger(data.capacityPallets))) {
      return { success: false, error: 'La capacidad debe ser un número entero positivo' };
    }

    if (data.location && data.location.length > 255) {
      return { success: false, error: 'La ubicación no puede tener más de 255 caracteres' };
    }

    const db = await getDb();

    // Verificar que no exista un storage con el mismo nombre (case insensitive)
    const existingStorage = await db.getRepository(Storage).findOne({
      where: {
        name: Like(data.name.trim()),
        deletedAt: IsNull()
      }
    });

    if (existingStorage) {
      return { success: false, error: 'Ya existe un storage con ese nombre' };
    }

    // Obtener userId para auditoría si no se proporcionó
    let userId = auditUserId;
    if (!userId) {
      try {
        const { userId: sessionUserId } = await getCurrentUserSession();
        userId = sessionUserId;
      } catch (error) {
        console.warn('[createStorage] No se pudo obtener la sesión del usuario para auditoría');
      }
    }

    const storageData = {
      name: data.name.trim(),
      capacityPallets: data.capacityPallets,
      location: data.location?.trim() || undefined,
      active: data.active !== undefined ? data.active : true,
    };

    const result = await db.transaction(async (manager) => {
      const storage = manager.create(Storage, storageData);
      const savedStorage = await manager.save(Storage, storage);

      // Registrar auditoría
      await logStorageAudit(
        manager,
        savedStorage.id,
        AuditActionType.CREATE,
        userId,
        undefined,
        storageData
      );

      return savedStorage;
    });

    revalidatePath('/home/storages');

    return {
      success: true,
      message: 'Storage creado exitosamente',
      data: result ? serializeStorage(result) : null,
    };
  } catch (error: any) {
    console.error('[createStorage] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al crear el storage',
    };
  }
}

/**
 * UPDATE - Actualizar un storage existente
 */
export async function updateStorage(data: UpdateStorageInput, auditUserId?: string): Promise<StorageResult> {
  try {
    if (!data.id || data.id.trim() === '') {
      return { success: false, error: 'ID inválido' };
    }

    const db = await getDb();

    // Obtener el storage actual
    const existingStorage = await db.getRepository(Storage).findOne({
      where: { id: data.id, deletedAt: IsNull() }
    });

    if (!existingStorage) {
      return { success: false, error: 'Storage no encontrado' };
    }

    // Validaciones
    const updates: Partial<Storage> = {};

    if (data.name !== undefined) {
      if (!data.name.trim()) {
        return { success: false, error: 'El nombre es requerido' };
      }

      if (data.name.trim().length > 255) {
        return { success: false, error: 'El nombre no puede tener más de 255 caracteres' };
      }

      // Verificar que no exista otro storage con el mismo nombre (case insensitive)
      const duplicateStorage = await db.getRepository(Storage).findOne({
        where: {
          name: Like(data.name.trim()),
          deletedAt: IsNull(),
          id: Not(data.id) // Excluir el registro actual
        }
      });

      if (duplicateStorage) {
        return { success: false, error: 'Ya existe otro storage con ese nombre' };
      }

      updates.name = data.name.trim();
    }

    if (data.capacityPallets !== undefined) {
      if (data.capacityPallets < 0 || !Number.isInteger(data.capacityPallets)) {
        return { success: false, error: 'La capacidad debe ser un número entero positivo' };
      }
      updates.capacityPallets = data.capacityPallets;
    }

    if (data.location !== undefined) {
      if (data.location && data.location.length > 255) {
        return { success: false, error: 'La ubicación no puede tener más de 255 caracteres' };
      }
      updates.location = data.location?.trim() || undefined;
    }

    if (data.active !== undefined) {
      updates.active = data.active;
    }

    // Verificar que haya cambios
    const hasChanges = Object.keys(updates).length > 0;
    if (!hasChanges) {
      return { success: false, error: 'No se detectaron cambios' };
    }

    // Obtener userId para auditoría si no se proporcionó
    let userId = auditUserId;
    if (!userId) {
      try {
        const { userId: sessionUserId } = await getCurrentUserSession();
        userId = sessionUserId;
      } catch (error) {
        console.warn('[updateStorage] No se pudo obtener la sesión del usuario para auditoría');
      }
    }

    const oldValues = {
      name: existingStorage.name,
      capacityPallets: existingStorage.capacityPallets,
      location: existingStorage.location,
      active: existingStorage.active,
    };

    const result = await db.transaction(async (manager) => {
      await manager.update(Storage, data.id, updates);

      const updatedStorage = await manager.findOne(Storage, {
        where: { id: data.id }
      });

      // Registrar auditoría
      await logStorageAudit(
        manager,
        data.id,
        AuditActionType.UPDATE,
        userId,
        oldValues,
        updates
      );

      return updatedStorage;
    });

    revalidatePath('/home/storages');

    return {
      success: true,
      message: 'Storage actualizado exitosamente',
      data: result ? serializeStorage(result) : null,
    };
  } catch (error: any) {
    console.error('[updateStorage] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al actualizar el storage',
    };
  }
}

/**
 * DELETE - Eliminar un storage (soft delete)
 */
export async function deleteStorage(id: string, auditUserId?: string): Promise<StorageResult> {
  try {
    if (!id || id.trim() === '') {
      return { success: false, error: 'ID inválido' };
    }

    const db = await getDb();

    // Obtener el storage actual
    const existingStorage = await db.getRepository(Storage).findOne({
      where: { id, deletedAt: IsNull() }
    });

    if (!existingStorage) {
      return { success: false, error: 'Storage no encontrado' };
    }

    // Obtener userId para auditoría si no se proporcionó
    let userId = auditUserId;
    if (!userId) {
      try {
        const { userId: sessionUserId } = await getCurrentUserSession();
        userId = sessionUserId;
      } catch (error) {
        console.warn('[deleteStorage] No se pudo obtener la sesión del usuario para auditoría');
      }
    }

    const oldValues = {
      name: existingStorage.name,
      capacityPallets: existingStorage.capacityPallets,
      location: existingStorage.location,
      active: existingStorage.active,
    };

    const result = await db.transaction(async (manager) => {
      // Soft delete
      await manager.update(Storage, id, {
        deletedAt: new Date(),
      });

      // Registrar auditoría
      await logStorageAudit(
        manager,
        id,
        AuditActionType.DELETE,
        userId,
        oldValues,
        undefined
      );

      return existingStorage;
    });

    revalidatePath('/home/storages');

    return {
      success: true,
      message: 'Storage eliminado exitosamente',
      data: result ? serializeStorage(result) : null,
    };
  } catch (error: any) {
    console.error('[deleteStorage] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al eliminar el storage',
    };
  }
}