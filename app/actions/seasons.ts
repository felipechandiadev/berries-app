// Server Actions para CRUD de la entidad Season
'use server';

import { Season } from '../../data/entities/Season';
import { Audit } from '../../data/entities/Audit';
import { AuditActionType } from '../../data/entities/audit.types';
import { getDb } from '../../data/db';
import moment from 'moment-timezone';
import { revalidatePath } from 'next/cache';
import { getCurrentUserSession } from './auth.server';
import { EntityManager, Like, IsNull, Between } from 'typeorm';

const APP_TIMEZONE = 'America/Santiago';

/**
 * Convierte una entidad Season a un objeto plano serializable
 */
function serializeSeason(season: Season): any {
  return JSON.parse(JSON.stringify({
    id: season.id,
    name: season.name,
    startDate: season.startDate,
    endDate: season.endDate,
    description: season.description,
    active: season.active,
    createdAt: season.createdAt,
    updatedAt: season.updatedAt,
    deletedAt: season.deletedAt,
  }));
}

/**
 * Convierte un array de entidades Season a objetos planos serializables
 */
function serializeSeasons(seasons: Season[]): any[] {
  return seasons.map(season => JSON.parse(JSON.stringify({
    id: season.id,
    name: season.name,
    startDate: season.startDate,
    endDate: season.endDate,
    description: season.description,
    active: season.active,
    createdAt: season.createdAt,
    updatedAt: season.updatedAt,
    deletedAt: season.deletedAt,
  })));
}

export interface CreateSeasonInput {
  name: string;
  startDate: Date;
  endDate: Date;
  description?: string;
  active?: boolean;
}

export interface UpdateSeasonInput {
  id: string;
  name?: string;
  startDate?: Date;
  endDate?: Date;
  description?: string;
  active?: boolean;
}

export interface GetSeasonsFilters {
  name?: string;
  description?: string;
  active?: boolean;
  startDate?: Date;
  endDate?: Date;
  currentDate?: Date; // Para buscar temporadas activas en una fecha específica
}

export interface SeasonResult {
  success: boolean;
  message?: string;
  data?: Season | Season[] | null;
  error?: string;
}

/**
 * Helper function to log audit for seasons
 * Uses Chile timezone (America/Santiago) for consistent timestamp handling
 */
async function logSeasonAudit(
  manager: EntityManager,
  entityId: string,
  action: AuditActionType,
  userId: string | undefined,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>
) {
  try {
    console.log('[logSeasonAudit] Iniciando registro de auditoría. userId:', userId, 'action:', action);

    // Calcular cambios si es una actualización
    let changeCount = 0;
    const fields: string[] = [];

    if (action === AuditActionType.UPDATE && oldValues && newValues) {
      for (const key in newValues) {
        if (oldValues[key] !== newValues[key]) {
          changeCount++;
          fields.push(key);
        }
      }
    }

    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const audit = manager.create(Audit, {
      id: auditId,
      entityName: 'Season',
      entityId: entityId,
      userId: userId,
      action: action,
      oldValues: oldValues,
      newValues: newValues,
      changes: changeCount > 0 ? fields : undefined,
      description: `${action} season ${entityId}`,
      createdAt: new Date(moment.tz(APP_TIMEZONE).format('YYYY-MM-DD HH:mm:ss')), // Use Chile timezone for consistent timestamp
    });

    await manager.save(Audit, audit);
    console.log('[logSeasonAudit] Auditoría registrada exitosamente');
  } catch (error) {
    console.error('[logSeasonAudit] Error al registrar auditoría:', error);
  }
}

/**
 * READ - Obtener todas las temporadas con filtros opcionales
 */
export async function getSeasons(filters?: GetSeasonsFilters): Promise<SeasonResult> {
  try {
    const db = await getDb();
    const repo = db.getRepository(Season);

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

    // Filtro por rango de fechas
    if (filters?.startDate && filters?.endDate) {
      where.startDate = Between(filters.startDate, filters.endDate);
    } else if (filters?.startDate) {
      where.startDate = filters.startDate;
    } else if (filters?.endDate) {
      where.endDate = filters.endDate;
    }

    // Filtro para temporadas activas en una fecha específica
    if (filters?.currentDate) {
      const currentDate = filters.currentDate;
      where.startDate = IsNull(); // Reset previous date filter
      where.endDate = IsNull();   // Reset previous date filter
      // Temporada activa si currentDate está entre startDate y endDate
      // Esto requiere una condición más compleja que manejaremos en el query
    }

    // Excluir registros soft-deleted
    where.deletedAt = IsNull();

    let seasons: Season[];

    if (filters?.currentDate) {
      // Query especial para temporadas activas en una fecha específica
      const currentDate = filters.currentDate;
      seasons = await repo
        .createQueryBuilder('season')
        .where('season.deletedAt IS NULL')
        .andWhere('season.active = :active', { active: true })
        .andWhere('season.startDate <= :currentDate', { currentDate })
        .andWhere('season.endDate >= :currentDate', { currentDate })
        .orderBy('season.name', 'ASC')
        .getMany();
    } else {
      seasons = await repo.find({
        where,
        order: { name: 'ASC' }
      });
    }

    return {
      success: true,
      data: serializeSeasons(seasons),
    };
  } catch (error: any) {
    console.error('[getSeasons] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al obtener las temporadas',
    };
  }
}

/**
 * CREATE - Crear una nueva temporada
 */
export async function createSeason(data: CreateSeasonInput, auditUserId?: string): Promise<SeasonResult> {
  try {
    // Validaciones
    if (!data.name?.trim()) {
      return { success: false, error: 'El nombre es requerido' };
    }

    if (data.name.trim().length > 255) {
      return { success: false, error: 'El nombre no puede tener más de 255 caracteres' };
    }

    if (!data.startDate) {
      return { success: false, error: 'La fecha de inicio es requerida' };
    }

    if (!data.endDate) {
      return { success: false, error: 'La fecha de término es requerida' };
    }

    if (data.startDate >= data.endDate) {
      return { success: false, error: 'La fecha de inicio debe ser anterior a la fecha de término' };
    }

    if (data.description && data.description.length > 500) {
      return { success: false, error: 'La descripción no puede tener más de 500 caracteres' };
    }

    const db = await getDb();

    // Verificar que no exista una temporada con el mismo nombre (case insensitive)
    const existingSeason = await db.getRepository(Season).findOne({
      where: {
        name: Like(data.name.trim()),
        deletedAt: IsNull()
      }
    });

    if (existingSeason) {
      return { success: false, error: 'Ya existe una temporada con ese nombre' };
    }

    // Verificar que no haya solapamiento de fechas con otras temporadas activas
    const overlappingSeason = await db.getRepository(Season).findOne({
      where: [
        {
          startDate: Between(data.startDate, data.endDate),
          active: true,
          deletedAt: IsNull()
        },
        {
          endDate: Between(data.startDate, data.endDate),
          active: true,
          deletedAt: IsNull()
        },
        {
          startDate: IsNull(), // Reset for complex condition
          endDate: IsNull(),
          active: true,
          deletedAt: IsNull()
        }
      ]
    });

    // Check for overlapping seasons with a more complex query
    if (!overlappingSeason) {
      const complexOverlap = await db.getRepository(Season)
        .createQueryBuilder('season')
        .where('season.deletedAt IS NULL')
        .andWhere('season.active = :active', { active: true })
        .andWhere('((season.startDate <= :startDate AND season.endDate >= :startDate) OR (season.startDate <= :endDate AND season.endDate >= :endDate) OR (season.startDate >= :startDate AND season.endDate <= :endDate))', {
          startDate: data.startDate,
          endDate: data.endDate
        })
        .getOne();

      if (complexOverlap) {
        return { success: false, error: 'Ya existe una temporada activa que se solapa con las fechas especificadas' };
      }
    }

    // Obtener userId para auditoría si no se proporcionó
    let userId = auditUserId;
    if (!userId) {
      try {
        const { userId: sessionUserId } = await getCurrentUserSession();
        userId = sessionUserId;
      } catch (error) {
        console.warn('[createSeason] No se pudo obtener la sesión del usuario para auditoría');
      }
    }

    const seasonData = {
      name: data.name.trim(),
      startDate: data.startDate,
      endDate: data.endDate,
      description: data.description?.trim() || null,
      active: data.active !== undefined ? data.active : true,
    };

    const result = await db.transaction(async (manager) => {
      // Si la temporada se crea como activa, desactivar todas las demás activas
      if (seasonData.active) {
        await manager.update(Season, { active: true }, { active: false });
      }

      const season = manager.create(Season, seasonData);
      const savedSeason = await manager.save(Season, season);

      // Registrar auditoría
      await logSeasonAudit(
        manager,
        savedSeason.id,
        AuditActionType.CREATE,
        userId,
        undefined,
        seasonData
      );

      return savedSeason;
    });

    // Revalidar cache (solo en contexto de request)
    try {
      revalidatePath('/home/seasons');
    } catch (error) {
      // Ignorar error de revalidate en contextos sin request (como scripts)
    }

    return {
      success: true,
      message: 'Temporada creada exitosamente',
      data: result ? serializeSeason(result) : null,
    };
  } catch (error: any) {
    console.error('[createSeason] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al crear la temporada',
    };
  }
}

/**
 * UPDATE - Actualizar una temporada existente
 */
export async function updateSeason(data: UpdateSeasonInput, auditUserId?: string): Promise<SeasonResult> {
  try {
    if (!data.id) {
      return { success: false, error: 'El ID de la temporada es requerido' };
    }

    const db = await getDb();
    const repo = db.getRepository(Season);

    // Buscar la temporada existente
    const existingSeason = await repo.findOne({
      where: {
        id: data.id,
        deletedAt: IsNull()
      }
    });

    if (!existingSeason) {
      return { success: false, error: 'Temporada no encontrada' };
    }

    // Validaciones
    const newName = data.name?.trim();
    if (newName && newName.length > 255) {
      return { success: false, error: 'El nombre no puede tener más de 255 caracteres' };
    }

    if (data.description && data.description.length > 500) {
      return { success: false, error: 'La descripción no puede tener más de 500 caracteres' };
    }

    // Validar fechas si se proporcionan
    const newStartDate = data.startDate || existingSeason.startDate;
    const newEndDate = data.endDate || existingSeason.endDate;

    if (newStartDate >= newEndDate) {
      return { success: false, error: 'La fecha de inicio debe ser anterior a la fecha de término' };
    }

    // Verificar nombre único si cambió
    if (newName && newName !== existingSeason.name) {
      const nameConflict = await repo.findOne({
        where: {
          name: Like(newName),
          deletedAt: IsNull()
        }
      });

      if (nameConflict) {
        return { success: false, error: 'Ya existe una temporada con ese nombre' };
      }
    }

    // Verificar solapamiento de fechas si cambiaron
    if (data.startDate || data.endDate) {
      const complexOverlap = await repo
        .createQueryBuilder('season')
        .where('season.deletedAt IS NULL')
        .andWhere('season.active = :active', { active: true })
        .andWhere('season.id != :currentId', { currentId: data.id })
        .andWhere('((season.startDate <= :startDate AND season.endDate >= :startDate) OR (season.startDate <= :endDate AND season.endDate >= :endDate) OR (season.startDate >= :startDate AND season.endDate <= :endDate))', {
          startDate: newStartDate,
          endDate: newEndDate
        })
        .getOne();

      if (complexOverlap) {
        return { success: false, error: 'Ya existe una temporada activa que se solapa con las nuevas fechas' };
      }
    }

    // Obtener userId para auditoría si no se proporcionó
    let userId = auditUserId;
    if (!userId) {
      try {
        const { userId: sessionUserId } = await getCurrentUserSession();
        userId = sessionUserId;
      } catch (error) {
        console.warn('[updateSeason] No se pudo obtener la sesión del usuario para auditoría');
      }
    }

    const oldValues = {
      name: existingSeason.name,
      startDate: existingSeason.startDate,
      endDate: existingSeason.endDate,
      description: existingSeason.description,
      active: existingSeason.active,
    };

    const updateData: Partial<Season> = {};
    if (newName) updateData.name = newName;
    if (data.startDate) updateData.startDate = data.startDate;
    if (data.endDate) updateData.endDate = data.endDate;
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.active !== undefined) updateData.active = data.active;
    updateData.updatedAt = new Date();

    const result = await db.transaction(async (manager) => {
      // Si la temporada se actualiza como activa, desactivar todas las demás activas (excepto esta)
      if (data.active) {
        await manager.update(Season, { active: true }, { active: false });
        // Luego activar esta específicamente
        updateData.active = true;
      }

      await manager.update(Season, data.id, updateData);

      const updatedSeason = await manager.findOne(Season, {
        where: { id: data.id }
      });

      if (!updatedSeason) {
        throw new Error('Error al actualizar la temporada');
      }

      // Registrar auditoría
      await logSeasonAudit(
        manager,
        updatedSeason.id,
        AuditActionType.UPDATE,
        userId,
        oldValues,
        {
          name: updatedSeason.name,
          startDate: updatedSeason.startDate,
          endDate: updatedSeason.endDate,
          description: updatedSeason.description,
          active: updatedSeason.active,
        }
      );

      return updatedSeason;
    });

    // Revalidar cache
    try {
      revalidatePath('/home/seasons');
    } catch (error) {
      // Ignorar error de revalidate
    }

    return {
      success: true,
      message: 'Temporada actualizada exitosamente',
      data: result ? serializeSeason(result) : null,
    };
  } catch (error: any) {
    console.error('[updateSeason] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al actualizar la temporada',
    };
  }
}

/**
 * DELETE - Eliminar una temporada (soft delete)
 */
export async function deleteSeason(id: string, auditUserId?: string): Promise<SeasonResult> {
  try {
    if (!id) {
      return { success: false, error: 'El ID de la temporada es requerido' };
    }

    const db = await getDb();
    const repo = db.getRepository(Season);

    // Buscar la temporada
    const season = await repo.findOne({
      where: {
        id,
        deletedAt: IsNull()
      }
    });

    if (!season) {
      return { success: false, error: 'Temporada no encontrada' };
    }

    // Obtener userId para auditoría si no se proporcionó
    let userId = auditUserId;
    if (!userId) {
      try {
        const { userId: sessionUserId } = await getCurrentUserSession();
        userId = sessionUserId;
      } catch (error) {
        console.warn('[deleteSeason] No se pudo obtener la sesión del usuario para auditoría');
      }
    }

    const oldValues = {
      name: season.name,
      startDate: season.startDate,
      endDate: season.endDate,
      description: season.description,
      active: season.active,
    };

    const result = await db.transaction(async (manager) => {
      // Soft delete
      await manager.update(Season, id, {
        deletedAt: new Date(),
        updatedAt: new Date()
      });

      // Registrar auditoría
      await logSeasonAudit(
        manager,
        id,
        AuditActionType.DELETE,
        userId,
        oldValues,
        undefined
      );

      return season;
    });

    // Revalidar cache
    try {
      revalidatePath('/home/seasons');
    } catch (error) {
      // Ignorar error de revalidate
    }

    return {
      success: true,
      message: 'Temporada eliminada exitosamente',
      data: result ? serializeSeason(result) : null,
    };
  } catch (error: any) {
    console.error('[deleteSeason] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al eliminar la temporada',
    };
  }
}

/**
 * Obtiene la temporada activa actual
 */
export async function getActiveSeason(): Promise<SeasonResult> {
  try {
    const db = await getDb();
    const seasonRepository = db.getRepository(Season);

    const activeSeason = await seasonRepository.findOne({
      where: {
        active: true,
        deletedAt: IsNull(),
      },
    });

    if (!activeSeason) {
      return {
        success: false,
        error: 'No hay temporada activa configurada',
      };
    }

    return {
      success: true,
      message: 'Temporada activa obtenida exitosamente',
      data: serializeSeason(activeSeason),
    };
  } catch (error: any) {
    console.error('[getActiveSeason] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al obtener la temporada activa',
    };
  }
}

/**
 * Obtiene una lista simplificada de temporadas para selectores
 */
export async function getSeasonsSimpleList() {
  try {
    const db = await getDb();
    const seasons = await db.getRepository(Season)
      .find({
        where: { deletedAt: IsNull() },
        select: ['id', 'name', 'startDate', 'endDate', 'active'],
        order: { startDate: 'DESC' },
      });

    return {
      success: true,
      data: seasons.map(season => ({
        id: season.id,
        name: season.name,
        startDate: season.startDate,
        endDate: season.endDate,
        active: season.active,
      })),
    };
  } catch (error: any) {
    console.error('[getSeasonsSimpleList] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al obtener la lista de temporadas',
    };
  }
}