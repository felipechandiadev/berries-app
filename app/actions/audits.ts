// Server Actions para consultar auditorías
'use server'

import { Audit } from '../../data/entities/Audit';
import { User } from '../../data/entities/User';
import { AuditActionType } from '../../data/entities/audit.types';
import { getDb } from '../../data/db';
import { DataSource, SelectQueryBuilder } from 'typeorm';

export interface AuditGridFilters {
  page?: number;
  limit?: number;
  search?: string;
  action?: string | AuditActionType;
  entityName?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: string; // Column filters in format: "column1-value1,column2-value2"
}

export interface AuditGridResponse {
  data: Audit[];
  total: number;
  pages: number;
  currentPage: number;
  limit: number;
  filters: {
    search?: string;
    action?: string;
    entityName?: string;
  };
}

/**
 * Mapa seguro de columnas permitidas para filtrado dinámico
 * Previene inyección SQL usando nombres de columna validados
 */
const AUDIT_COLUMN_MAP: Record<string, string> = {
  entityName: 'audit.entityName',
  action: 'audit.action',
  description: 'audit.description',
  userId: 'audit.userId',
  createdAt: 'audit.createdAt',
};

/**
 * Campos permitidos para ordenamiento
 */
const VALID_SORT_FIELDS = ['entityName', 'action', 'description', 'userId', 'createdAt', 'id'];

/**
 * Campos permitidos para filtrado por columna
 */
const VALID_FILTER_COLUMNS = Object.keys(AUDIT_COLUMN_MAP);

/**
 * Parsea filtros de columnas desde formato URL: "column1-value1,column2-value2"
 * @param filtersStr String con filtros codificados
 * @returns Objeto con columnas y valores
 */
function parseColumnFilters(filtersStr: string): Record<string, string> {
  if (!filtersStr) return {};
  
  const columnFilters: Record<string, string> = {};
  const pairs = filtersStr.split(',');
  
  pairs.forEach(pair => {
    const [column, ...valueParts] = pair.split('-');
    // Solo permitir columnas validadas
    if (column && VALID_FILTER_COLUMNS.includes(column) && valueParts.length > 0) {
      columnFilters[column] = decodeURIComponent(valueParts.join('-'));
    }
  });
  
  return columnFilters;
}

/**
 * Construye un QueryBuilder base con filtros aplicados
 * Reutilizable en getAuditGridData y getAuditExportData
 * 
 * IMPORTANTE: Retorna un QueryBuilder cloneado para permitir múltiples usos
 */
function buildAuditQuery(
  dataSource: DataSource,
  filters: AuditGridFilters
): SelectQueryBuilder<Audit> {
  // Normalizar parámetros
  const search = filters?.search?.trim() || '';
  const action = filters?.action || '';
  const entityName = filters?.entityName || '';
  const filtersParam = filters?.filters || '';

  // Parse column filters con validación
  const columnFilters = parseColumnFilters(filtersParam);

  // Crear QueryBuilder con join a user
  let query = dataSource.getRepository(Audit).createQueryBuilder('audit')
    .leftJoinAndSelect('audit.user', 'user', 'user.id = audit.userId');

  // Aplicar filtro de búsqueda
  if (search) {
    query = query.where('LOWER(audit.description) LIKE LOWER(:search)', {
      search: `%${search}%`,
    });
  }

  // Aplicar filtro de action
  if (action) {
    const whereMethod = search ? 'andWhere' : 'where';
    query = query[whereMethod]('audit.action = :action', { action });
  }

  // Aplicar filtro de entityName
  if (entityName) {
    const whereMethod = search || action ? 'andWhere' : 'where';
    query = query[whereMethod]('audit.entityName = :entityName', { entityName });
  }

  // Aplicar filtros dinámicos por columna (con validación estricta)
  let filterIndex = 0;
  Object.entries(columnFilters).forEach(([column, value]) => {
    if (!AUDIT_COLUMN_MAP[column] || !value.trim()) {
      return; // Skip si columna no validada o valor vacío
    }

    const paramKey = `filter${filterIndex}`;
    const whereMethod = search || action || entityName || filterIndex > 0 ? 'andWhere' : 'where';
    const columnPath = AUDIT_COLUMN_MAP[column];

    // Manejo especial para fechas
    if (column === 'createdAt') {
      query = query[whereMethod](`DATE(${columnPath}) = :${paramKey}`, { 
        [paramKey]: value 
      });
    } else {
      query = query[whereMethod](`LOWER(${columnPath}) LIKE LOWER(:${paramKey})`, {
        [paramKey]: `%${value}%`,
      });
    }

    filterIndex++;
  });

  return query;
}

export async function getAuditGridData(
  filters?: AuditGridFilters
): Promise<AuditGridResponse> {
  try {
    const startTime = Date.now();
    const dataSource = await getDb();

    // Normalizar parámetros de paginación
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.min(Math.max(5, filters?.limit || 10), 100);
    const sortBy = filters?.sortBy || 'createdAt';
    // Por defecto ordenar por fecha más nueva arriba (DESC)
    const sortOrder = (filters?.sortOrder || 'DESC').toUpperCase() as 'ASC' | 'DESC';

    // Validar sortBy para evitar SQL injection
    const safeSortBy = VALID_SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAt';

    // Construir QueryBuilder base (una sola vez)
    const baseQuery = buildAuditQuery(dataSource, filters || {});

    // Ejecutar count y data en paralelo usando clone()
    // ✨ OPTIMIZACIÓN: clone() crea una copia del query sin ejecutarlo
    // Esto evita duplicar la construcción del query
    const [total, data] = await Promise.all([
      baseQuery.getCount(),
      baseQuery
        .clone() // ← Clona el QueryBuilder sin reinicializar filtros
        .orderBy(`audit.${safeSortBy}`, sortOrder)
        .skip((page - 1) * limit)
        .take(limit)
        .getMany(),
    ]);

    const pages = Math.ceil(total / limit);
    
    // Serializar datos (remover proxies de TypeORM)
    const serializedData = JSON.parse(JSON.stringify(data));

    const duration = Date.now() - startTime;
    console.log(`[getAuditGridData] Tiempo: ${duration}ms, Total: ${total} registros, Página: ${page}/${pages}`);

    return {
      data: serializedData,
      total,
      pages,
      currentPage: page,
      limit,
      filters: {
        search: filters?.search?.trim() || undefined,
        action: filters?.action || undefined,
        entityName: filters?.entityName || undefined,
      },
    };
  } catch (error) {
    console.error('[getAuditGridData] Error:', error);
    return {
      data: [],
      total: 0,
      pages: 0,
      currentPage: 1,
      limit: 10,
      filters: {},
    };
  }
}

/**
 * Server action para obtener datos de auditoría para exportar a Excel
 * Retorna los datos sin formatear XLSX (eso se hace en el cliente)
 */
export async function getAuditExportData(filters?: AuditGridFilters): Promise<{
  success: boolean;
  data?: any[];
  recordCount?: number;
  error?: string;
}> {
  try {
    const dataSource = await getDb();
    const maxRows = 10000;

    // Normalizar parámetros (sin paginación)
    const sortBy = filters?.sortBy || 'createdAt';
    const sortOrder = (filters?.sortOrder || 'DESC').toUpperCase() as 'ASC' | 'DESC';

    // Validar sortBy
    const safeSortBy = VALID_SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAt';

    // Reutilizar la lógica de construcción de query
    const query = buildAuditQuery(dataSource, filters || {});

    // Obtener todos los registros (limitado a maxRows)
    const allAudits = await query
      .orderBy(`audit.${safeSortBy}`, sortOrder)
      .take(maxRows + 1) // Obtener uno más para detectar si hay más
      .getMany();

    // Validar límite
    if (allAudits.length > maxRows) {
      return {
        success: false,
        error: `Total de registros (${allAudits.length}) excede el límite permitido de ${maxRows}. Refine los filtros.`,
      };
    }

    // Serializar datos (remover proxies de TypeORM)
    const serializedData = JSON.parse(JSON.stringify(allAudits));

    console.log(`[getAuditExportData] Exportando ${serializedData.length} registros`);

    return {
      success: true,
      data: serializedData,
      recordCount: serializedData.length,
    };
  } catch (error) {
    console.error('[getAuditExportData] Error:', error);
    return {
      success: false,
      error: `Error al obtener datos: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Obtiene estadísticas generales de auditoría para el dashboard
 */
export async function getAuditStats(): Promise<{
  total: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
  byStatus: Record<string, number>;
}> {
  try {
    const db = await getDb();

    // Consulta para obtener estadísticas
    const statsQuery = `
      SELECT
        COUNT(*) as total,
        action,
        entityName
      FROM audits
      GROUP BY action, entityName
    `;

    const statsResult = await db.query(statsQuery);

    // Procesar resultados
    const byAction: Record<string, number> = {};
    const byEntityType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let total = 0;

    // El resultado puede ser un array directo o estar envuelto en otro array
    const rows = Array.isArray(statsResult[0]) ? statsResult[0] : statsResult;

    for (const row of rows as any[]) {
      total += parseInt(row.total);
      byAction[row.action] = (byAction[row.action] || 0) + parseInt(row.total);
      byEntityType[row.entityName] = (byEntityType[row.entityName] || 0) + parseInt(row.total);
      // Note: No status field in the database, so byStatus remains empty
    }

    return {
      total,
      byAction,
      byEntityType,
      byStatus,
    };
  } catch (error) {
    console.error('[getAuditStats] Error:', error);
    return {
      total: 0,
      byAction: {},
      byEntityType: {},
      byStatus: {},
    };
  }
}

