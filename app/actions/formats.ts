// Server Actions para CRUD de la entidad Format
'use server';

import { Format } from '../../data/entities/Format';
import { Variety } from '../../data/entities/Variety';
import { Audit } from '../../data/entities/Audit';
import { AuditActionType } from '../../data/entities/audit.types';
import { getDb } from '../../data/db';
import moment from 'moment-timezone';
import { revalidatePath } from 'next/cache';
import { getCurrentUserSession } from './auth.server';
import { EntityManager, Like, IsNull, Not } from 'typeorm';

const APP_TIMEZONE = 'America/Santiago';

/**
 * Convierte una entidad Format a un objeto plano serializable
 */
function serializeFormat(format: Format): any {
  return JSON.parse(JSON.stringify({
    id: format.id,
    name: format.name,
    description: format.description,
    priceCLP: format.priceCLP,
    priceUSD: format.priceUSD,
    active: format.active,
    varietyId: (format as any).varietyId || null,
    varietyName: format.variety ? format.variety.name : null,
    createdAt: format.createdAt,
    updatedAt: format.updatedAt,
    deletedAt: format.deletedAt,
  }));
}

/**
 * Convierte un array de entidades Format a objetos planos serializables
 */
function serializeFormats(formats: Format[]): any[] {
  return formats.map(format => JSON.parse(JSON.stringify({
    id: format.id,
    name: format.name,
    description: format.description,
    priceCLP: format.priceCLP,
    priceUSD: format.priceUSD,
    active: format.active,
    varietyId: (format as any).varietyId || null,
    varietyName: format.variety ? format.variety.name : null,
    createdAt: format.createdAt,
    updatedAt: format.updatedAt,
    deletedAt: format.deletedAt,
  })));
}

export interface CreateFormatInput {
  name: string;
  description?: string;
  priceCLP?: number;
  priceUSD?: number;
  active?: boolean;
  varietyId?: number;
}

export interface UpdateFormatInput {
  id: number;
  name?: string;
  description?: string;
  priceCLP?: number;
  priceUSD?: number;
  active?: boolean;
  varietyId?: number | null;
}

export interface GetFormatsFilters {
  name?: string;
  description?: string;
  active?: boolean;
}

export interface FormatResult {
  success: boolean;
  message?: string;
  data?: Format | Format[] | null;
  error?: string;
}

/**
 * Helper function to log audit for format
 * Uses Chile timezone (America/Santiago) for consistent timestamp handling
 */
async function logFormatAudit(
  manager: EntityManager,
  entityId: string,
  action: AuditActionType,
  userId: string | undefined,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>
) {
  try {
    console.log('[logFormatAudit] Iniciando registro de auditoría. userId:', userId, 'action:', action);

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
      entityName: 'Format',
      entityId: entityId,
      userId: userId,
      action: action,
      description: `${action} format ${entityId}`,
      oldValues: oldValues,
      newValues: newValues,
      changes: changeCount > 0 ? fields : undefined,
      createdAt: new Date(moment.tz(APP_TIMEZONE).format('YYYY-MM-DD HH:mm:ss')), // Use Chile timezone for consistent timestamp
    });

    await manager.save(Audit, audit);
    console.log('[logFormatAudit] Auditoría registrada exitosamente');
  } catch (error) {
    console.error('[logFormatAudit] Error al registrar auditoría:', error);
    // No fallar la operación principal por error de auditoría
  }
}

/**
 * READ - Obtener todos los formatos con filtros opcionales
 */
export async function getFormats(filters?: GetFormatsFilters): Promise<FormatResult> {
  try {
    const db = await getDb();
    const repo = db.getRepository(Format);

    const where: any = {};

    // Aplicar filtros con homologación a minúsculas
    if (filters?.name?.trim()) {
      where.name = Like(`%${filters.name.trim().toLowerCase()}%`);
    }

    if (filters?.description?.trim()) {
      where.description = Like(`%${filters.description.trim().toLowerCase()}%`);
    }

    if (filters?.active !== undefined) {
      where.active = filters.active;
    }

    // Excluir registros soft-deleted
    where.deletedAt = IsNull();

    const format = await repo.find({
      where,
      relations: ['variety'],
      order: { name: 'ASC' }
    });

    return {
      success: true,
      data: serializeFormats(format),
    };
  } catch (error: any) {
    console.error('[getFormats] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al obtener formatos',
      data: [],
    };
  }
}

/**
 * READ - Obtener un formato por ID
 */
export async function getFormatById(id: number): Promise<FormatResult> {
  try {
    if (!id || id <= 0) {
      return { success: false, error: 'ID inválido', data: null };
    }

    const db = await getDb();
    const format = await db.getRepository(Format).findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['variety']
    });

    if (!format) {
      return { success: false, error: 'Formato no encontrado', data: null };
    }

    return {
      success: true,
      data: format,
    };
  } catch (error: any) {
    console.error('[getFormatById] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al obtener el formato',
      data: null,
    };
  }
}

/**
 * CREATE - Crear un nuevo formato
 */
export async function createFormat(data: CreateFormatInput, auditUserId?: string): Promise<FormatResult> {
  try {
    // Validaciones
    if (!data.name?.trim()) {
      return { success: false, error: 'El nombre es requerido' };
    }

    if (data.name.trim().length > 100) {
      return { success: false, error: 'El nombre no puede tener más de 100 caracteres' };
    }

    if (data.description && data.description.length > 255) {
      return { success: false, error: 'La descripción no puede tener más de 255 caracteres' };
    }

    const db = await getDb();

    // Verificar que no exista un formato con el mismo nombre para la misma variedad
    const existingFormat = await db.getRepository(Format).findOne({
      where: {
        name: Like(data.name.trim()),
        varietyId: data.varietyId !== undefined ? data.varietyId : IsNull(),
        deletedAt: IsNull()
      }
    });

    if (existingFormat) {
      return { success: false, error: 'Ya existe un formato con ese nombre' };
    }

    // Obtener userId para auditoría si no se proporcionó
    let userId = auditUserId;
    if (!userId) {
      try {
        const { userId: sessionUserId } = await getCurrentUserSession();
        userId = sessionUserId;
      } catch (error) {
        console.warn('[createFormat] No se pudo obtener la sesión del usuario para auditoría');
      }
    }

    // Validar precios
    if (data.priceCLP !== undefined && (isNaN(data.priceCLP) || data.priceCLP < 0)) {
      return { success: false, error: 'El precio CLP debe ser un número válido mayor o igual a 0' };
    }

    if (data.priceUSD !== undefined && (isNaN(data.priceUSD) || data.priceUSD < 0)) {
      return { success: false, error: 'El precio USD debe ser un número válido mayor o igual a 0' };
    }

    const formatData: Partial<Format> = {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      priceCLP: data.priceCLP || 0,
      priceUSD: data.priceUSD || 0,
      active: data.active !== undefined ? data.active : true,
      varietyId: data.varietyId ? data.varietyId : undefined,
    };

    const result = await db.transaction(async (manager) => {
      // If a varietyId was provided, validate it exists
      if (formatData.varietyId) {
        const varietyExists = await manager.findOne(Variety, { where: { id: formatData.varietyId } });
        if (!varietyExists) {
          throw new Error('Variety not found');
        }
      }

      const format = manager.create(Format, formatData);
      const savedFormat = await manager.save(Format, format);

      // Registrar auditoría
      await logFormatAudit(
        manager,
        savedFormat.id.toString(),
        AuditActionType.CREATE,
        userId,
        undefined,
        formatData
      );

      return savedFormat;
    });

    // Revalidar cache (solo en contexto de request)
    try {
      revalidatePath('/home/formats');
    } catch (error) {
      // Ignorar error de revalidate en contextos sin request (como scripts)
    }

    return {
      success: true,
      message: 'Formato creado exitosamente',
      data: result ? serializeFormat(result) : null,
    };
  } catch (error: any) {
    console.error('[createFormat] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al crear el formato',
    };
  }
}

/**
 * UPDATE - Actualizar un formato existente
 */
export async function updateFormat(data: UpdateFormatInput, auditUserId?: string): Promise<FormatResult> {
  try {
    if (!data.id || data.id <= 0) {
      return { success: false, error: 'ID inválido' };
    }

    const db = await getDb();

    // Obtener el formato actual
    const existingFormat = await db.getRepository(Format).findOne({
      where: { id: data.id, deletedAt: IsNull() }
    });

    if (!existingFormat) {
      return { success: false, error: 'Formato no encontrado' };
    }

    // Validaciones
    const updates: Partial<Format> = {};

    if (data.name !== undefined) {
      if (!data.name.trim()) {
        return { success: false, error: 'El nombre es requerido' };
      }

      if (data.name.trim().length > 100) {
        return { success: false, error: 'El nombre no puede tener más de 100 caracteres' };
      }

      // Verificar que no exista otro formato con el mismo nombre (case insensitive)
      const duplicateFormat = await db.getRepository(Format).findOne({
        where: {
          name: Like(data.name.trim()),
          deletedAt: IsNull(),
          id: Not(data.id) // Excluir el registro actual
        }
      });

      if (duplicateFormat) {
        return { success: false, error: 'Ya existe otro formato con ese nombre' };
      }

      updates.name = data.name.trim();
    }

    if (data.varietyId !== undefined) {
      // allow null clearing
      updates.varietyId = data.varietyId as any;
    }

    if (data.description !== undefined) {
      if (data.description && data.description.length > 255) {
        return { success: false, error: 'La descripción no puede tener más de 255 caracteres' };
      }

      updates.description = data.description?.trim() || null;
    }

    if (data.priceCLP !== undefined) {
      if (isNaN(data.priceCLP) || data.priceCLP < 0) {
        return { success: false, error: 'El precio CLP debe ser un número válido mayor o igual a 0' };
      }
      updates.priceCLP = data.priceCLP;
    }

    if (data.priceUSD !== undefined) {
      if (isNaN(data.priceUSD) || data.priceUSD < 0) {
        return { success: false, error: 'El precio USD debe ser un número válido mayor o igual a 0' };
      }
      updates.priceUSD = data.priceUSD;
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
        console.warn('[updateFormat] No se pudo obtener la sesión del usuario para auditoría');
      }
    }

    const oldValues = {
      name: existingFormat.name,
      description: existingFormat.description,
      priceCLP: existingFormat.priceCLP,
      priceUSD: existingFormat.priceUSD,
      active: existingFormat.active,
      varietyId: (existingFormat as any).varietyId || null,
    };

    const result = await db.transaction(async (manager) => {
      // If varietyId provided, validate existence
      if (updates.varietyId !== undefined && updates.varietyId !== null) {
        const v = await manager.findOne(Variety, { where: { id: updates.varietyId } });
        if (!v) {
          throw new Error('Variety not found');
        }
      }

      await manager.update(Format, data.id, updates);

      const updatedFormat = await manager.findOne(Format, {
        where: { id: data.id }
      });

      // Registrar auditoría
      await logFormatAudit(
        manager,
        data.id.toString(),
        AuditActionType.UPDATE,
        userId,
        oldValues,
        updates
      );

      return updatedFormat;
    });

    // Revalidar cache (solo en contexto de request)
    try {
      revalidatePath('/home/formats');
    } catch (error) {
      // Ignorar error de revalidate en contextos sin request (como scripts)
    }

    return {
      success: true,
      message: 'Formato actualizado exitosamente',
      data: result ? serializeFormat(result) : null,
    };
  } catch (error: any) {
    console.error('[updateFormat] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al actualizar el formato',
    };
  }
}

/**
 * DELETE - Eliminar un formato (soft delete)
 */
export async function deleteFormat(id: number, auditUserId?: string): Promise<FormatResult> {
  try {
    if (!id || id <= 0) {
      return { success: false, error: 'ID inválido' };
    }

    const db = await getDb();

    // Obtener el formato actual
    const existingFormat = await db.getRepository(Format).findOne({
      where: { id, deletedAt: IsNull() }
    });

    if (!existingFormat) {
      return { success: false, error: 'Formato no encontrado' };
    }

    // Obtener userId para auditoría si no se proporcionó
    let userId = auditUserId;
    if (!userId) {
      try {
        const { userId: sessionUserId } = await getCurrentUserSession();
        userId = sessionUserId;
      } catch (error) {
        console.warn('[deleteFormat] No se pudo obtener la sesión del usuario para auditoría');
      }
    }

    const oldValues = {
      name: existingFormat.name,
      description: existingFormat.description,
      active: existingFormat.active,
    };

    const result = await db.transaction(async (manager) => {
      // Soft delete
      await manager.update(Format, id, {
        deletedAt: new Date(),
      });

      // Registrar auditoría
      await logFormatAudit(
        manager,
        id.toString(),
        AuditActionType.DELETE,
        userId,
        oldValues,
        undefined
      );

      return existingFormat;
    });

    // Revalidar cache (solo en contexto de request)
    try {
      revalidatePath('/home/formats');
    } catch (error) {
      // Ignorar error de revalidate en contextos sin request (como scripts)
    }

    return {
      success: true,
      message: 'Formato eliminado exitosamente',
      data: result ? serializeFormat(result) : null,
    };
  } catch (error: any) {
    console.error('[deleteFormat] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al eliminar el formato',
    };
  }
}

/**
 * READ - Obtener formatos como lista simple (id, label, priceCLP, priceUSD)
 */
export async function getFormatsSimpleList(): Promise<{ id: number; label: string; priceCLP: number; priceUSD: number }[]> {
  try {
    const db = await getDb();
    const repo = db.getRepository(Format);

    const formats = await repo.find({
      select: ['id', 'name', 'priceCLP', 'priceUSD'],
      where: { active: true, deletedAt: IsNull() },
      order: { name: 'ASC' },
    });

    return formats.map((format) => ({
      id: format.id,
      label: format.name,
      priceCLP: format.priceCLP,
      priceUSD: format.priceUSD,
    }));
  } catch (error: any) {
    console.error('[getFormatsSimpleList] Error:', error);
    return [];
  }
}