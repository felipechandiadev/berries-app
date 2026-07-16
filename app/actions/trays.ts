// Server Actions para CRUD de la entidad Tray
'use server';

import { Tray } from '../../data/entities/Tray';
import { Audit } from '../../data/entities/Audit';
import { AuditActionType } from '../../data/entities/audit.types';
import { getDb } from '../../data/db';
import moment from 'moment-timezone';
import { revalidatePath } from 'next/cache';
import { getCurrentUserSession } from './auth.server';
import { EntityManager, Like, IsNull, Not } from 'typeorm';

const APP_TIMEZONE = 'America/Santiago';

/**
 * Convierte una entidad Tray a un objeto plano serializable
 */
function serializeTray(tray: Tray): any {
  return JSON.parse(JSON.stringify({
    id: tray.id,
    name: tray.name,
    weight: tray.weight,
    stock: tray.stock,
    active: tray.active,
    createdAt: tray.createdAt,
    updatedAt: tray.updatedAt,
    deletedAt: tray.deletedAt,
  }));
}

/**
 * Convierte un array de entidades Tray a objetos planos serializables
 */
function serializeTrays(trays: Tray[]): any[] {
  return trays.map(tray => JSON.parse(JSON.stringify({
    id: tray.id,
    name: tray.name,
    weight: tray.weight,
    stock: tray.stock,
    active: tray.active,
    createdAt: tray.createdAt,
    updatedAt: tray.updatedAt,
    deletedAt: tray.deletedAt,
  })));
}

export interface CreateTrayInput {
  name: string;
  weight: number;
  stock: number;
  active?: boolean;
}

export interface UpdateTrayInput {
  id: string;
  name?: string;
  weight?: number;
  stock?: number;
  active?: boolean;
}

export interface GetTraysFilters {
  name?: string;
  active?: boolean;
}

export interface TrayResult {
  success: boolean;
  message?: string;
  data?: Tray | Tray[] | null;
  error?: string;
}

/**
 * Helper function to log audit for tray
 * Uses Chile timezone (America/Santiago) for consistent timestamp handling
 */
async function logTrayAudit(
  manager: EntityManager,
  entityId: string,
  action: AuditActionType,
  userId: string | undefined,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>
) {
  try {
    console.log('[logTrayAudit] Iniciando registro de auditoría. userId:', userId, 'action:', action);

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
      entityName: 'Tray',
      entityId: entityId,
      userId: userId,
      action: action,
      description: `${action} tray ${entityId}`,
      oldValues: oldValues,
      newValues: newValues,
      changes: changeCount > 0 ? fields : undefined,
      createdAt: new Date(moment.tz(APP_TIMEZONE).format('YYYY-MM-DD HH:mm:ss')), // Use Chile timezone for consistent timestamp
    });

    await manager.save(Audit, audit);
    console.log('[logTrayAudit] Auditoría registrada exitosamente');
  } catch (error) {
    console.error('[logTrayAudit] Error al registrar auditoría:', error);
    // No fallar la operación principal por error de auditoría
  }
}

/**
 * GET - Obtener todos los trays con filtros opcionales
 */
export async function getTrays(filters?: GetTraysFilters): Promise<TrayResult> {
  try {
    const db = await getDb();
    const repo = db.getRepository(Tray);

    const queryBuilder = repo.createQueryBuilder('tray');

    // Aplicar filtros
    if (filters?.name) {
      queryBuilder.andWhere({ name: Like(`%${filters.name}%`) });
    }

    if (filters?.active !== undefined) {
      queryBuilder.andWhere('tray.active = :active', { active: filters.active });
    }

    // Solo registros no eliminados
    queryBuilder.andWhere('tray.deletedAt IS NULL');

    // Ordenar por nombre
    queryBuilder.orderBy('tray.name', 'ASC');

    const trays = await queryBuilder.getMany();

    return {
      success: true,
      data: serializeTrays(trays),
    };
  } catch (error: any) {
    console.error('[getTrays] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al obtener los trays',
    };
  }
}

/**
 * GET - Obtener un tray por ID
 */
export async function getTrayById(id: string): Promise<TrayResult> {
  try {
    if (!id || id.trim() === '') {
      return { success: false, error: 'ID inválido' };
    }

    const db = await getDb();
    const tray = await db.getRepository(Tray).findOne({
      where: { id, deletedAt: IsNull() }
    });

    if (!tray) {
      return { success: false, error: 'Tray no encontrado' };
    }

    return {
      success: true,
      data: tray,
    };
  } catch (error: any) {
    console.error('[getTrayById] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al obtener el tray',
    };
  }
}

/**
 * CREATE - Crear un nuevo tray
 */
export async function createTray(data: CreateTrayInput, auditUserId?: string): Promise<TrayResult> {
  try {
    // Validaciones
    if (!data.name || data.name.trim() === '') {
      return { success: false, error: 'El nombre es requerido' };
    }

    if (data.name.trim().length > 255) {
      return { success: false, error: 'El nombre no puede tener más de 255 caracteres' };
    }

    if (data.weight === undefined || data.weight < 0) {
      return { success: false, error: 'El peso debe ser un número positivo' };
    }

    if (data.stock === undefined || data.stock < 0 || !Number.isInteger(data.stock)) {
      return { success: false, error: 'El stock debe ser un número entero positivo' };
    }

    const db = await getDb();

    // Verificar que no exista un tray con el mismo nombre (case insensitive)
    const existingTray = await db.getRepository(Tray).findOne({
      where: {
        name: Like(data.name.trim()),
        deletedAt: IsNull()
      }
    });

    if (existingTray) {
      return { success: false, error: 'Ya existe un tray con ese nombre' };
    }

    // Obtener userId para auditoría si no se proporcionó
    let userId = auditUserId;
    if (!userId) {
      try {
        const { userId: sessionUserId } = await getCurrentUserSession();
        userId = sessionUserId;
      } catch (error) {
        console.warn('[createTray] No se pudo obtener la sesión del usuario para auditoría');
      }
    }

    const trayData = {
      name: data.name.trim(),
      weight: data.weight,
      stock: data.stock,
      active: data.active !== undefined ? data.active : true,
    };

    const result = await db.transaction(async (manager) => {
      const tray = manager.create(Tray, trayData);
      const savedTray = await manager.save(Tray, tray);

      // Registrar auditoría
      await logTrayAudit(
        manager,
        savedTray.id,
        AuditActionType.CREATE,
        userId,
        undefined,
        trayData
      );

      return savedTray;
    });

    revalidatePath('/home/trays');

    return {
      success: true,
      message: 'Tray creado exitosamente',
      data: result ? serializeTray(result) : null,
    };
  } catch (error: any) {
    console.error('[createTray] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al crear el tray',
    };
  }
}

/**
 * UPDATE - Actualizar un tray existente
 */
export async function updateTray(data: UpdateTrayInput, auditUserId?: string): Promise<TrayResult> {
  try {
    if (!data.id || data.id.trim() === '') {
      return { success: false, error: 'ID inválido' };
    }

    const db = await getDb();

    // Obtener el tray actual
    const existingTray = await db.getRepository(Tray).findOne({
      where: { id: data.id, deletedAt: IsNull() }
    });

    if (!existingTray) {
      return { success: false, error: 'Tray no encontrado' };
    }

    // Validaciones
    const updates: Partial<Tray> = {};

    if (data.name !== undefined) {
      if (!data.name.trim()) {
        return { success: false, error: 'El nombre es requerido' };
      }

      if (data.name.trim().length > 255) {
        return { success: false, error: 'El nombre no puede tener más de 255 caracteres' };
      }

      // Verificar que no exista otro tray con el mismo nombre (case insensitive)
      const duplicateTray = await db.getRepository(Tray).findOne({
        where: {
          name: Like(data.name.trim()),
          deletedAt: IsNull(),
          id: Not(data.id) // Excluir el registro actual
        }
      });

      if (duplicateTray) {
        return { success: false, error: 'Ya existe otro tray con ese nombre' };
      }

      updates.name = data.name.trim();
    }

    if (data.weight !== undefined) {
      if (data.weight < 0) {
        return { success: false, error: 'El peso debe ser un número positivo' };
      }
      updates.weight = data.weight;
    }

    if (data.stock !== undefined) {
      if (data.stock < 0 || !Number.isInteger(data.stock)) {
        return { success: false, error: 'El stock debe ser un número entero positivo' };
      }
      updates.stock = data.stock;
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
        console.warn('[updateTray] No se pudo obtener la sesión del usuario para auditoría');
      }
    }

    const oldValues = {
      name: existingTray.name,
      weight: existingTray.weight,
      stock: existingTray.stock,
      active: existingTray.active,
    };

    const result = await db.transaction(async (manager) => {
      await manager.update(Tray, data.id, updates);

      const updatedTray = await manager.findOne(Tray, {
        where: { id: data.id }
      });

      // Registrar auditoría
      await logTrayAudit(
        manager,
        data.id,
        AuditActionType.UPDATE,
        userId,
        oldValues,
        updates
      );

      return updatedTray;
    });

    revalidatePath('/home/trays');

    return {
      success: true,
      message: 'Tray actualizado exitosamente',
      data: result ? serializeTray(result) : null,
    };
  } catch (error: any) {
    console.error('[updateTray] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al actualizar el tray',
    };
  }
}

/**
 * DELETE - Eliminar un tray (soft delete)
 */
export async function deleteTray(id: string, auditUserId?: string): Promise<TrayResult> {
  try {
    if (!id || id.trim() === '') {
      return { success: false, error: 'ID inválido' };
    }

    const db = await getDb();

    // Obtener el tray actual
    const existingTray = await db.getRepository(Tray).findOne({
      where: { id, deletedAt: IsNull() }
    });

    if (!existingTray) {
      return { success: false, error: 'Tray no encontrado' };
    }

    // Obtener userId para auditoría si no se proporcionó
    let userId = auditUserId;
    if (!userId) {
      try {
        const { userId: sessionUserId } = await getCurrentUserSession();
        userId = sessionUserId;
      } catch (error) {
        console.warn('[deleteTray] No se pudo obtener la sesión del usuario para auditoría');
      }
    }

    const oldValues = {
      name: existingTray.name,
      weight: existingTray.weight,
      stock: existingTray.stock,
      active: existingTray.active,
    };

    const result = await db.transaction(async (manager) => {
      // Soft delete
      await manager.update(Tray, id, {
        deletedAt: new Date(),
      });

      // Registrar auditoría
      await logTrayAudit(
        manager,
        id,
        AuditActionType.DELETE,
        userId,
        oldValues,
        undefined
      );

      return existingTray;
    });

    revalidatePath('/home/trays');

    return {
      success: true,
      message: 'Tray eliminado exitosamente',
      data: result ? serializeTray(result) : null,
    };
  } catch (error: any) {
    console.error('[deleteTray] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al eliminar el tray',
    };
  }
}

/**
 * READ - Obtener trays como lista simple (id, label)
 */
export async function getTraysSimpleList(): Promise<{ id: string; label: string; weight: number; stock: number }[]> {
  try {
    const db = await getDb();
    const repo = db.getRepository(Tray);

    const trays = await repo.find({
      select: ['id', 'name', 'weight', 'stock'], // Include weight and stock in the selection
      where: { active: true, deletedAt: IsNull() },
      order: { name: 'ASC' },
    });

    // Ensure `id` is included and valid
    const validTrays = trays.map((tray) => ({
      id: tray.id, // Ensure `id` is included as a string
      label: tray.name,
      weight: tray.weight,
      stock: tray.stock || 0,
    }));

    return validTrays;
  } catch (error: any) {
    console.error('[getTraysSimpleList] Error:', error);
    throw error; // Re-throw the error to handle it upstream
  }
}