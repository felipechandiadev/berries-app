'use server';

import { ProductiveUnit } from '../../data/entities/ProductiveUnit';
import { getDb } from '../../data/db';
import { revalidatePath } from 'next/cache';
import { IsNull } from 'typeorm';

// Types
export interface ProductiveUnitGridData {
  id: string;
  name: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductiveUnitInput {
  name: string;
  location?: string;
}

export interface UpdateProductiveUnitInput {
  id: string;
  name: string;
  location?: string;
}

interface GridDataParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  columnFilters?: string;
}

interface GridDataResult {
  success: boolean;
  data: ProductiveUnitGridData[];
  totalRecords: number;
  page: number;
  limit: number;
  totalPages: number;
  error?: string;
}

interface ActionResult {
  success: boolean;
  data?: ProductiveUnitGridData;
  error?: string;
  message?: string;
}

/**
 * Normalize string for search (remove accents, convert to lowercase)
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Serialize ProductiveUnit for transmission
 */
function serializeProductiveUnit(unit: ProductiveUnit): ProductiveUnitGridData {
  return {
    id: unit.id,
    name: unit.name,
    location: unit.location || undefined,
    createdAt: unit.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: unit.updatedAt?.toISOString() || new Date().toISOString(),
  };
}

/**
 * Get all productive units with pagination, sorting, and filtering
 */
export async function getProductiveUnitsGridData(params: GridDataParams = {}): Promise<GridDataResult> {
  try {
    const {
      page = 1,
      limit = 25,
      sortBy = 'name',
      sortOrder = 'ASC',
      search = '',
      columnFilters = '',
    } = params;

    const db = await getDb();
    const unitRepo = db.getRepository(ProductiveUnit);

    // Build query
    const queryBuilder = unitRepo
      .createQueryBuilder('unit')
      .where('unit.deletedAt IS NULL');

    // Apply search filter
    if (search.trim()) {
      const normalizedSearch = normalizeString(search.trim());
      queryBuilder.andWhere(
        '(LOWER(unit.name) LIKE :search OR LOWER(unit.location) LIKE :search)',
        { search: `%${normalizedSearch}%` }
      );
    }

    // Apply column filters
    if (columnFilters) {
      const filters = columnFilters.split(',');
      for (const filter of filters) {
        const [field, ...valueParts] = filter.split('-');
        const value = valueParts.join('-');
        if (field && value) {
          const normalizedValue = normalizeString(decodeURIComponent(value));
          if (['name', 'location'].includes(field)) {
            queryBuilder.andWhere(`LOWER(unit.${field}) LIKE :${field}`, { [field]: `%${normalizedValue}%` });
          }
        }
      }
    }

    // Apply sorting
    const validSortFields = ['name', 'location', 'createdAt', 'updatedAt'];
    const actualSortBy = validSortFields.includes(sortBy) ? sortBy : 'name';
    queryBuilder.orderBy(`unit.${actualSortBy}`, sortOrder);

    // Get total count
    const totalRecords = await queryBuilder.getCount();

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Execute query
    const units = await queryBuilder.getMany();

    // Serialize results
    const data = units.map(serializeProductiveUnit);

    return {
      success: true,
      data,
      totalRecords,
      page,
      limit,
      totalPages: Math.ceil(totalRecords / limit),
    };
  } catch (error) {
    console.error('[getProductiveUnitsGridData] Error:', error);
    return {
      success: false,
      data: [],
      totalRecords: 0,
      page: 1,
      limit: 25,
      totalPages: 0,
      error: error instanceof Error ? error.message : 'Error al obtener unidades productivas',
    };
  }
}

/**
 * Get all productive units (for select dropdowns)
 */
export async function getProductiveUnits(): Promise<{ success: boolean; data: ProductiveUnitGridData[]; error?: string }> {
  try {
    const db = await getDb();
    const unitRepo = db.getRepository(ProductiveUnit);

    const units = await unitRepo.find({
      where: { deletedAt: IsNull() },
      order: { name: 'ASC' },
    });

    return {
      success: true,
      data: units.map(serializeProductiveUnit),
    };
  } catch (error) {
    console.error('[getProductiveUnits] Error:', error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Error al obtener unidades productivas',
    };
  }
}

/**
 * Get productive units for select (with label format)
 */
export async function getProductiveUnitsForSelect(): Promise<{ id: string; label: string }[]> {
  try {
    const db = await getDb();
    const unitRepo = db.getRepository(ProductiveUnit);

    const units = await unitRepo.find({
      where: { deletedAt: IsNull() },
      order: { name: 'ASC' },
    });

    return units.map(unit => ({
      id: unit.id,
      label: unit.name + (unit.location ? ` (${unit.location})` : ''),
    }));
  } catch (error) {
    console.error('[getProductiveUnitsForSelect] Error:', error);
    return [];
  }
}

/**
 * Get productive unit by ID
 */
export async function getProductiveUnitById(id: string): Promise<ActionResult> {
  try {
    if (!id?.trim()) {
      return { success: false, error: 'ID de unidad productiva requerido' };
    }

    const db = await getDb();
    const unitRepo = db.getRepository(ProductiveUnit);

    const unit = await unitRepo.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!unit) {
      return { success: false, error: 'Unidad productiva no encontrada' };
    }

    return {
      success: true,
      data: serializeProductiveUnit(unit),
    };
  } catch (error) {
    console.error('[getProductiveUnitById] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener unidad productiva',
    };
  }
}

/**
 * Create a new productive unit
 */
export async function createProductiveUnit(input: CreateProductiveUnitInput): Promise<ActionResult> {
  try {
    // Validations
    if (!input.name?.trim()) {
      return { success: false, error: 'El nombre es requerido' };
    }

    const db = await getDb();
    const unitRepo = db.getRepository(ProductiveUnit);

    // Check if name already exists
    const existingName = await unitRepo.findOne({
      where: { name: input.name.trim(), deletedAt: IsNull() },
    });
    if (existingName) {
      return { success: false, error: 'Ya existe una unidad productiva con ese nombre' };
    }

    // Create unit
    const unit = unitRepo.create({
      name: input.name.trim(),
      location: input.location?.trim() || undefined,
    });

    const savedUnit = await unitRepo.save(unit);

    revalidatePath('/home/productiveManagement/productiveUnits');

    return {
      success: true,
      data: serializeProductiveUnit(savedUnit),
      message: 'Unidad productiva creada exitosamente',
    };
  } catch (error) {
    console.error('[createProductiveUnit] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear unidad productiva',
    };
  }
}

/**
 * Update an existing productive unit
 */
export async function updateProductiveUnit(input: UpdateProductiveUnitInput): Promise<ActionResult> {
  try {
    // Validations
    if (!input.id?.trim()) {
      return { success: false, error: 'ID de unidad productiva requerido' };
    }

    if (!input.name?.trim()) {
      return { success: false, error: 'El nombre es requerido' };
    }

    const db = await getDb();
    const unitRepo = db.getRepository(ProductiveUnit);

    // Find existing unit
    const unit = await unitRepo.findOne({
      where: { id: input.id, deletedAt: IsNull() },
    });

    if (!unit) {
      return { success: false, error: 'Unidad productiva no encontrada' };
    }

    // Check if name already exists (if different)
    if (input.name.trim() !== unit.name) {
      const existingName = await unitRepo.findOne({
        where: { name: input.name.trim(), deletedAt: IsNull() },
      });
      if (existingName && existingName.id !== input.id) {
        return { success: false, error: 'Ya existe una unidad productiva con ese nombre' };
      }
    }

    // Update unit
    unit.name = input.name.trim();
    unit.location = input.location?.trim() || undefined;

    const savedUnit = await unitRepo.save(unit);

    revalidatePath('/home/productiveManagement/productiveUnits');

    return {
      success: true,
      data: serializeProductiveUnit(savedUnit),
      message: 'Unidad productiva actualizada exitosamente',
    };
  } catch (error) {
    console.error('[updateProductiveUnit] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar unidad productiva',
    };
  }
}

/**
 * Delete a productive unit (soft delete)
 */
export async function deleteProductiveUnit(id: string): Promise<ActionResult> {
  try {
    if (!id?.trim()) {
      return { success: false, error: 'ID de unidad productiva requerido' };
    }

    const db = await getDb();
    const unitRepo = db.getRepository(ProductiveUnit);

    const unit = await unitRepo.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!unit) {
      return { success: false, error: 'Unidad productiva no encontrada' };
    }

    // Soft delete
    await unitRepo.softDelete(id);

    revalidatePath('/home/productiveManagement/productiveUnits');

    return {
      success: true,
      message: 'Unidad productiva eliminada exitosamente',
    };
  } catch (error) {
    console.error('[deleteProductiveUnit] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar unidad productiva',
    };
  }
}
