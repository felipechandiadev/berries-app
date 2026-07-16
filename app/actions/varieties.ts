// Server Actions para CRUD de la entidad Variety
'use server';

import { Variety, Currency } from '../../data/entities/Variety';
import { Audit } from '../../data/entities/Audit';
import { AuditActionType } from '../../data/entities/audit.types';
import { getDb } from '../../data/db';
import moment from 'moment-timezone';
import { revalidatePath } from 'next/cache';
import { getCurrentUserSession } from './auth.server';
import { EntityManager, Like } from 'typeorm';

const APP_TIMEZONE = 'America/Santiago';

/**
 * Convierte una entidad Variety a un objeto plano serializable
 */
function serializeVariety(variety: Variety): any {
  return JSON.parse(JSON.stringify({
    id: variety.id,
    name: variety.name,
    description: variety.description,
    deletedAt: variety.deletedAt,
  }));
}

/**
 * Convierte un array de entidades Variety a objetos planos serializables
 */
function serializeVarieties(varieties: Variety[]): any[] {
  return varieties.map(variety => JSON.parse(JSON.stringify({
    id: variety.id,
    name: variety.name,
    description: variety.description,
    deletedAt: variety.deletedAt,
  })));
}

export interface CreateVarietyInput {
  name: string;
  description?: string;
}

export interface UpdateVarietyInput {
  id: number;
  name?: string;
  description?: string;
}

export interface GetVarietiesFilters {
  name?: string;
}

export interface VarietyResult {
  success: boolean;
  message?: string;
  data?: Variety | Variety[] | null;
  error?: string;
}

/**
 * Helper function to log audit for variety
 * Uses Chile timezone (America/Santiago) for consistent timestamp handling
 */
async function logVarietyAudit(
  manager: EntityManager,
  entityId: string,
  action: AuditActionType,
  userId: string | undefined,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>
) {
  try {
    console.log('[logVarietyAudit] Iniciando registro de auditoría. userId:', userId, 'action:', action);

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
      entityName: 'Variety',
      entityId: entityId,
      userId: userId,
      action: action,
      description: `${action} variety ${entityId}`,
      oldValues: oldValues,
      newValues: newValues,
      changes: changeCount > 0 ? fields : undefined,
      createdAt: new Date(moment.tz(APP_TIMEZONE).format('YYYY-MM-DD HH:mm:ss')), // Use Chile timezone for consistent timestamp
    });

    await manager.save(Audit, audit);
    console.log('[logVarietyAudit] Auditoría registrada exitosamente');
  } catch (error) {
    console.error('[logVarietyAudit] Error al registrar auditoría:', error);
    // No fallar la operación principal por error de auditoría
  }
}

/**
 * READ - Obtener todas las variedades con filtros opcionales
 */
export async function getVarieties(filters?: GetVarietiesFilters): Promise<VarietyResult> {
  try {
    const db = await getDb();
    const repo = db.getRepository(Variety);

    const where: any = {};

    if (filters?.name?.trim()) {
      where.name = Like(`%${filters.name.trim()}%`);
    }

    const variety = await repo.find({
      where,
      order: { id: 'ASC' }
    });

    return {
      success: true,
      data: serializeVarieties(variety),
    };
  } catch (error: any) {
    console.error('[getVarieties] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al obtener variedades',
      data: [],
    };
  }
}

/**
 * READ - Obtener una variedad por ID
 */
export async function getVarietyById(id: number): Promise<VarietyResult> {
  try {
    if (!id || id <= 0) {
      return { success: false, error: 'ID inválido', data: null };
    }

    const db = await getDb();
    const variety = await db.getRepository(Variety).findOne({ where: { id } });

    if (!variety) {
      return { success: false, error: 'Variedad no encontrada', data: null };
    }

    return {
      success: true,
      data: serializeVariety(variety),
    };
  } catch (error: any) {
    console.error('[getVarietyById] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al obtener la variedad',
      data: null,
    };
  }
}

/**
 * CREATE - Crear una nueva variedad
 */
export async function createVariety(data: CreateVarietyInput, auditUserId?: string): Promise<VarietyResult> {
  try {
    // Validaciones
    if (!data.name?.trim()) {
      return { success: false, error: 'El nombre es requerido' };
    }

    // Obtener userId para auditoría
    let userId = auditUserId;
    if (!userId) {
      const { userId: sessionUserId } = await getCurrentUserSession();
      userId = sessionUserId;
    }

    // TRANSACCIÓN
    const db = await getDb();
    const queryRunner = db.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      const repo = queryRunner.manager.getRepository(Variety);

      // Validar nombre único
      const existingVariety = await repo.findOne({
        where: { name: data.name.trim() }
      });

      if (existingVariety) {
        await queryRunner.rollbackTransaction();
        return { success: false, error: 'Ya existe una variedad con ese nombre' };
      }

      const variety = repo.create({
        name: data.name.trim(),
        description: data.description?.trim() || null,
      });

      const saved = await repo.save(variety);

      // Auditoría
      await logVarietyAudit(
        queryRunner.manager,
        saved.id.toString(),
        AuditActionType.CREATE,
        userId,
        undefined,
        {
          name: saved.name,
          description: saved.description,
        }
      );

      await queryRunner.commitTransaction();

      revalidatePath('/home/varieties');

      return {
        success: true,
        message: 'Variedad creada exitosamente',
        data: JSON.parse(JSON.stringify(saved)),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  } catch (error: any) {
    console.error('[createVariety] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al crear la variedad',
    };
  }
}

/**
 * UPDATE - Actualizar una variedad existente
 */
export async function updateVariety(data: UpdateVarietyInput, auditUserId?: string): Promise<VarietyResult> {
  try {
    if (!data.id || data.id <= 0) {
      return { success: false, error: 'ID inválido' };
    }

    // Validaciones de campos opcionales
    if (data.name !== undefined && !data.name?.trim()) {
      return { success: false, error: 'El nombre no puede estar vacío' };
    }

    // TRANSACCIÓN
    const db = await getDb();
    const queryRunner = db.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction('SERIALIZABLE');

      // Obtener userId para auditoría
      let userId = auditUserId;
      if (!userId) {
        const { userId: sessionUserId } = await getCurrentUserSession();
        userId = sessionUserId;
      }

      const repo = queryRunner.manager.getRepository(Variety);

      const existingVariety = await repo.findOne({ where: { id: data.id } });
      if (!existingVariety) {
        await queryRunner.rollbackTransaction();
        return { success: false, error: 'Variedad no encontrada' };
      }

      // Validar nombre único si se está cambiando
      if (data.name && data.name.trim() !== existingVariety.name) {
        const nameExists = await repo.findOne({
          where: { name: data.name.trim() }
        });
        if (nameExists) {
          await queryRunner.rollbackTransaction();
          return { success: false, error: 'Ya existe una variedad con ese nombre' };
        }
      }

      const oldValues = {
        name: existingVariety.name,
        description: existingVariety.description,
      };

      // Actualizar campos
      if (data.name !== undefined) existingVariety.name = data.name.trim();
      if (data.description !== undefined) existingVariety.description = data.description?.trim() || null;

      const saved = await repo.save(existingVariety);

      const newValues = {
        name: saved.name,
        description: saved.description,
      };

      // Auditoría
      await logVarietyAudit(
        queryRunner.manager,
        saved.id.toString(),
        AuditActionType.UPDATE,
        userId,
        oldValues,
        newValues
      );

      await queryRunner.commitTransaction();

      revalidatePath('/home/varieties');

      return {
        success: true,
        message: 'Variedad actualizada exitosamente',
        data: serializeVariety(saved),
      };
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  } catch (error: any) {
    console.error('[updateVariety] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al actualizar la variedad',
    };
  }
}

/**
 * DELETE - Eliminar una variedad (soft delete)
 */
export async function deleteVariety(id: number, auditUserId?: string): Promise<VarietyResult> {
  try {
    if (!id || id <= 0) {
      return { success: false, error: 'ID inválido' };
    }

    // Obtener userId para auditoría
    let userId = auditUserId;
    if (!userId) {
      const { userId: sessionUserId } = await getCurrentUserSession();
      userId = sessionUserId;
    }

    // TRANSACCIÓN
    const db = await getDb();
    const queryRunner = db.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      const repo = queryRunner.manager.getRepository(Variety);

      const variety = await repo.findOne({ where: { id }, withDeleted: false });
      if (!variety) {
        await queryRunner.rollbackTransaction();
        return { success: false, error: 'Variedad no encontrada' };
      }

      const oldValues = {
        name: variety.name,
        description: variety.description,
      };

      // Soft delete
      await repo.softDelete(id);

      // Auditoría
      await logVarietyAudit(
        queryRunner.manager,
        id.toString(),
        AuditActionType.DELETE,
        userId,
        oldValues,
        undefined
      );

      await queryRunner.commitTransaction();

      revalidatePath('/home/varieties');

      return {
        success: true,
        message: 'Variedad eliminada exitosamente',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  } catch (error: any) {
    console.error('[deleteVariety] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al eliminar la variedad',
    };
  }
}

/**
 * READ - Obtener variedades como lista simple (id, label)
 */
export async function getVarietiesSimpleList(): Promise<{ id: number; label: string }[]> {
  try {
    const db = await getDb();
    const repo = db.getRepository(Variety);

    const varieties = await repo.find({
      select: ['id', 'name'],
      order: { name: 'ASC' },
    });

    return varieties.map((variety) => ({
      id: variety.id,
      label: variety.name,
    }));
  } catch (error: any) {
    console.error('[getVarietiesSimpleList] Error:', error);
    return [];
  }
}

/**
 * READ - Obtener variedades con precio y moneda
 */
export async function getVarietiesWithPriceAndCurrency(): Promise<{ id: number; label: string }[]> {
  try {
    const db = await getDb();
    const repo = db.getRepository(Variety);

    const varieties = await repo.find({
      select: ['id', 'name'],
      order: { name: 'ASC' },
    });

    return varieties.map((variety) => ({
      id: variety.id,
      label: variety.name,
    }));
  } catch (error: any) {
    console.error('[getVarietiesWithPriceAndCurrency] Error:', error);
    return [];
  }
}