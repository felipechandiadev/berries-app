// Server Actions para CRUD de la entidad Transaction
'use server';

import { Transaction, TransactionType, TransactionDirection, TransactionUnit, TrayDeliveryMetadata, TrayReceptionMetadata } from '../../data/entities/Transaction';
import { Season } from '../../data/entities/Season';
import { Producer } from '../../data/entities/Producer';
import { Customer } from '../../data/entities/Customer';
import { User } from '../../data/entities/User';
import { Tray } from '../../data/entities/Tray';
import { Audit } from '../../data/entities/Audit';
import { AuditActionType } from '../../data/entities/audit.types';
import { getDb } from '../../data/db';
import moment from 'moment-timezone';
import { revalidatePath } from 'next/cache';
import { getCurrentUserSession } from './auth.server';
import { EntityManager, Like, IsNull, SelectQueryBuilder } from 'typeorm';
import { getActiveSeason } from './seasons';
import { translateTransactionType, generateTransactionAuditDescription } from '@/lib/transactionUtils';

const APP_TIMEZONE = 'America/Santiago';

/**
 * Convierte una entidad Transaction a un objeto plano serializable
 */
function serializeTransaction(transaction: Transaction): any {
  return JSON.parse(JSON.stringify({
    id: transaction.id,
    type: transaction.type,
    seasonId: transaction.seasonId,
    producerId: transaction.producerId,
    clientId: transaction.clientId,
    direction: transaction.direction,
    amount: transaction.amount,
    unit: transaction.unit,
    metadata: transaction.metadata,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
    deletedAt: transaction.deletedAt,
  }));
}

/**
 * Convierte un array de entidades Transaction a objetos planos serializables
 */
function serializeTransactions(transactions: Transaction[]): any[] {
  return transactions.map(transaction => serializeTransaction(transaction));
}

export interface CreateTransactionInput {
  type: TransactionType;
  seasonId?: string;
  producerId?: string;
  clientId?: string;
  formatId?: number;
  direction: TransactionDirection;
  amount: number;
  unit: TransactionUnit;
  metadata?: any;
}

export interface UpdateTransactionInput {
  id: bigint;
  type?: TransactionType;
  seasonId?: string;
  producerId?: string;
  clientId?: string;
  direction?: TransactionDirection;
  amount?: number;
  unit?: TransactionUnit;
  metadata?: any;
  createdAt?: Date | string;
}

export interface GetTransactionsFilters {
  type?: TransactionType;
  seasonId?: string;
  producerId?: string;
  clientId?: string;
  direction?: TransactionDirection;
  unit?: TransactionUnit;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface TransactionResult {
  success: boolean;
  message?: string;
  data?: Transaction | Transaction[] | null;
  error?: string;
}

async function ensureTransactionTypeEnum(db: Awaited<ReturnType<typeof getDb>>) {
  try {
    const [columnInfo] = await db.query(`SHOW COLUMNS FROM transactions LIKE 'type'`);
    const columnType: string | undefined = columnInfo?.Type ?? columnInfo?.type;

    if (typeof columnType !== 'string') {
      return;
    }

    const enumValues = Object.values(TransactionType);
    const missingValues = enumValues.filter((value) => !columnType.includes(`'${value}'`));

    if (missingValues.length > 0) {
      console.warn('[ensureTransactionTypeEnum] Updating transactions.type enum to include:', missingValues);
      const enumList = enumValues.map((value) => `'${value}'`).join(', ');
      await db.query(`ALTER TABLE transactions MODIFY COLUMN type ENUM(${enumList}) NOT NULL`);
    }
  } catch (error) {
    console.error('[ensureTransactionTypeEnum] Error ensuring enum values:', error);
  }
}

/**
 * Helper function to log audit for transaction
 */
export async function logTransactionAudit(
  manager: EntityManager,
  entityId: string,
  action: AuditActionType,
  userId: string | undefined,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>
) {
  try {
    const crypto = require('crypto');
    const auditId = crypto.randomUUID();

    // Obtener el tipo de transacción para la descripción
    const transactionType = newValues?.type || oldValues?.type || 'UNKNOWN';

    // Crear los cambios detectados
    const fields: Record<string, any> = {};
    let changeCount = 0;

    if (oldValues && newValues) {
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
      for (const key in newValues) {
        fields[key] = {
          oldValue: null,
          newValue: newValues[key],
        };
        changeCount++;
      }
    } else if (oldValues && !newValues) {
      for (const key in oldValues) {
        fields[key] = {
          oldValue: oldValues[key],
          newValue: null,
        };
        changeCount++;
      }
    }

    // Generar descripción en español con el tipo de transacción
    const description = generateTransactionAuditDescription(action, transactionType, entityId);

    await manager.insert(Audit, {
      entityName: 'Transaction',
      entityId: entityId,
      userId: userId,
      action: action,
      description: description,
      oldValues: oldValues,
      newValues: newValues,
      changes: changeCount > 0 ? fields : undefined,
      createdAt: new Date(moment.tz(APP_TIMEZONE).format('YYYY-MM-DD HH:mm:ss')),
    });
  } catch (error) {
    console.error('[logTransactionAudit] Error al registrar auditoría:', error);
  }
}

/**
 * GET - Obtener todas las transacciones con filtros opcionales
 */
export async function getTransactions(filters?: GetTransactionsFilters): Promise<TransactionResult> {
  try {
    const db = await getDb();
    const repo = db.getRepository(Transaction);

    const queryBuilder = repo.createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.season', 'season')
      .leftJoinAndSelect('transaction.producer', 'producer')
      .leftJoinAndSelect('transaction.client', 'client')
      .leftJoinAndSelect('transaction.user', 'user');

    // Aplicar filtros
    if (filters?.type) {
      queryBuilder.andWhere('transaction.type = :type', { type: filters.type });
    }

    if (filters?.seasonId) {
      queryBuilder.andWhere('transaction.seasonId = :seasonId', { seasonId: filters.seasonId });
    }

    if (filters?.producerId) {
      queryBuilder.andWhere('transaction.producerId = :producerId', { producerId: filters.producerId });
    }

    if (filters?.clientId) {
      queryBuilder.andWhere('transaction.clientId = :clientId', { clientId: filters.clientId });
    }

    if (filters?.direction) {
      queryBuilder.andWhere('transaction.direction = :direction', { direction: filters.direction });
    }

    if (filters?.unit) {
      queryBuilder.andWhere('transaction.unit = :unit', { unit: filters.unit });
    }

    if (filters?.dateFrom) {
      queryBuilder.andWhere('transaction.createdAt >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters?.dateTo) {
      queryBuilder.andWhere('transaction.createdAt <= :dateTo', { dateTo: filters.dateTo });
    }

    // Solo registros no eliminados
    queryBuilder.andWhere('transaction.deletedAt IS NULL');

    // Ordenar por fecha de creación descendente
    queryBuilder.orderBy('transaction.createdAt', 'DESC');

    const transactions = await queryBuilder.getMany();

    return {
      success: true,
      data: serializeTransactions(transactions),
    };
  } catch (error: any) {
    console.error('[getTransactions] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al obtener las transacciones',
    };
  }
}

/**
 * GET - Obtener una transacción por ID
 */
export async function getTransactionById(id: bigint): Promise<TransactionResult> {
  try {
    if (!id || id <= 0) {
      return { success: false, error: 'ID inválido' };
    }

    const db = await getDb();
    const transaction = await db.getRepository(Transaction).findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['season', 'producer', 'client', 'user'],
    });

    if (!transaction) {
      return { success: false, error: 'Transacción no encontrada' };
    }

    return {
      success: true,
      data: serializeTransaction(transaction),
    };
  } catch (error: any) {
    console.error('[getTransactionById] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al obtener la transacción',
    };
  }
}

/**
 * POST - Crear una nueva transacción
 */
async function resolveSeasonId(providedSeasonId?: string): Promise<string> {
  if (providedSeasonId && providedSeasonId.trim() !== '') {
    return providedSeasonId;
  }

  const activeSeasonResult = await getActiveSeason();
  const seasonPayload = Array.isArray(activeSeasonResult.data)
    ? activeSeasonResult.data[0]
    : activeSeasonResult.data;

  if (!activeSeasonResult.success || !seasonPayload || !('id' in seasonPayload) || !seasonPayload.id) {
    const reason = activeSeasonResult.error || 'No hay temporada activa configurada';
    throw new Error(reason);
  }

  return seasonPayload.id as string;
}

export async function createTransaction(data: CreateTransactionInput, auditUserId?: string): Promise<TransactionResult> {
  try {
    const db = await getDb();
    await ensureTransactionTypeEnum(db);
    const { userId: sessionUserId } = await getCurrentUserSession();

    if (!sessionUserId) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    // Validaciones básicas
    if (!data.type || !data.direction || data.amount === undefined || !data.unit) {
      return { success: false, error: 'Datos requeridos faltantes' };
    }

    if (data.amount <= 0) {
      return { success: false, error: 'El monto debe ser mayor a 0' };
    }

    let seasonId: string;
    try {
      seasonId = await resolveSeasonId(data.seasonId);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'No se pudo determinar la temporada activa',
      };
    }

    await db.manager.transaction(async (manager) => {
      const transactionData: Partial<Transaction> = {
        type: data.type,
        seasonId,
        direction: data.direction,
        amount: data.amount,
        unit: data.unit,
        userId: sessionUserId,
      };

      // Agregar campos opcionales solo si tienen valor
      if (data.producerId) transactionData.producerId = data.producerId;
      if (data.clientId) transactionData.clientId = data.clientId;
      if (data.formatId) transactionData.formatId = data.formatId;
      if (data.metadata) transactionData.metadata = data.metadata;

      const transaction = manager.create(Transaction, transactionData);

      const savedTransaction = await manager.save(Transaction, transaction);

      // Registrar auditoría
      await logTransactionAudit(
        manager,
        savedTransaction.id.toString(),
        AuditActionType.CREATE,
        auditUserId || sessionUserId,
        undefined,
        {
          type: data.type,
          seasonId,
          producerId: data.producerId,
          clientId: data.clientId,
          direction: data.direction,
          amount: data.amount,
          unit: data.unit,
        }
      );
    });

    revalidatePath('/home/transactions');

    return {
      success: true,
      message: 'Transacción creada exitosamente',
    };
  } catch (error: any) {
    console.error('[createTransaction] Error:', error);
    const message = error?.message || '';
    if (error?.code === 'WARN_DATA_TRUNCATED' || message.includes("Data truncated for column 'type'")) {
      return {
        success: false,
        error: 'No fue posible registrar la transacción porque la columna transactions.type no admite el valor DISPATCH. Ejecuta la actualización de esquema (ALTER TABLE transactions MODIFY COLUMN type ...) y vuelve a intentar.',
      };
    }
    return {
      success: false,
      error: error?.message || 'Error al crear la transacción',
    };
  }
}

/**
 * PUT - Actualizar una transacción
 */
export async function updateTransaction(data: UpdateTransactionInput, auditUserId?: string): Promise<TransactionResult> {
  try {
    const db = await getDb();
    const { userId: sessionUserId } = await getCurrentUserSession();

    if (!sessionUserId) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    if (!data.id || data.id <= 0) {
      return { success: false, error: 'ID inválido' };
    }

    const existingTransaction = await db.getRepository(Transaction).findOne({
      where: { id: data.id, deletedAt: IsNull() },
    });

    if (!existingTransaction) {
      return { success: false, error: 'Transacción no encontrada' };
    }

    // Validar amount si se proporciona
    if (data.amount !== undefined && data.amount <= 0) {
      return { success: false, error: 'El monto debe ser mayor a 0' };
    }

    const oldValues = {
      type: existingTransaction.type,
      seasonId: existingTransaction.seasonId,
      producerId: existingTransaction.producerId,
      clientId: existingTransaction.clientId,
      direction: existingTransaction.direction,
      amount: existingTransaction.amount,
      unit: existingTransaction.unit,
      metadata: existingTransaction.metadata,
      createdAt: existingTransaction.createdAt,
    };

    await db.manager.transaction(async (manager) => {
      const updateData: Partial<Transaction> = {
        type: data.type || existingTransaction.type,
        seasonId: data.seasonId || existingTransaction.seasonId,
        producerId: data.producerId !== undefined ? data.producerId : existingTransaction.producerId,
        clientId: data.clientId !== undefined ? data.clientId : existingTransaction.clientId,
        direction: data.direction || existingTransaction.direction,
        amount: data.amount !== undefined ? data.amount : existingTransaction.amount,
        unit: data.unit || existingTransaction.unit,
        metadata: data.metadata !== undefined ? data.metadata : existingTransaction.metadata,
      };

      // Solo actualizar createdAt si se proporciona
      if (data.createdAt !== undefined) {
        const createdAtDate = typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt;
        if (!isNaN(createdAtDate.getTime())) {
          updateData.createdAt = createdAtDate;
        }
      }

      await manager.update(Transaction, data.id, updateData);

      // Registrar auditoría
      await logTransactionAudit(
        manager,
        data.id.toString(),
        AuditActionType.UPDATE,
        auditUserId || sessionUserId,
        oldValues,
        {
          type: data.type,
          seasonId: data.seasonId,
          producerId: data.producerId,
          clientId: data.clientId,
          direction: data.direction,
          amount: data.amount,
          unit: data.unit,
          metadata: data.metadata,
          createdAt: data.createdAt,
        }
      );
    });

    revalidatePath('/home/transactions');

    return {
      success: true,
      message: 'Transacción actualizada exitosamente',
    };
  } catch (error: any) {
    console.error('[updateTransaction] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al actualizar la transacción',
    };
  }
}

/**
 * DELETE - Eliminar una transacción (soft delete)
 */
export async function deleteTransaction(id: bigint, auditUserId?: string): Promise<TransactionResult> {
  try {
    const db = await getDb();
    const { userId: sessionUserId } = await getCurrentUserSession();

    if (!sessionUserId) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    if (!id || id <= 0) {
      return { success: false, error: 'ID inválido' };
    }

    const existingTransaction = await db.getRepository(Transaction).findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!existingTransaction) {
      return { success: false, error: 'Transacción no encontrada' };
    }

    const oldValues = {
      type: existingTransaction.type,
      seasonId: existingTransaction.seasonId,
      producerId: existingTransaction.producerId,
      clientId: existingTransaction.clientId,
      direction: existingTransaction.direction,
      amount: existingTransaction.amount,
      unit: existingTransaction.unit,
      metadata: existingTransaction.metadata,
    };

    await db.manager.transaction(async (manager) => {
      await manager.update(Transaction, id, {
        deletedAt: new Date(),
      });

      // Registrar auditoría
      await manager.insert(Audit, {
        entityName: 'Transaction',
        entityId: String(id),
        userId: sessionUserId,
        action: AuditActionType.DELETE,
        description: `Transacción ${id} eliminada.`,
        oldValues: {
          id: id,
          type: existingTransaction.type,
          amount: existingTransaction.amount,
        } as any,
        newValues: undefined,
        changes: {
          fields: {},
          summary: `Transacción eliminada`,
          changeCount: 0,
        } as any,
        createdAt: new Date(),
      });
    });

    revalidatePath('/home/transactions');

    return {
      success: true,
      message: 'Transacción eliminada exitosamente',
    };
  } catch (error: any) {
    console.error('[deleteTransaction] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al eliminar la transacción',
    };
  }
}

/**
 * Interface para crear ajuste de stock de bandejas
 */
export interface CreateTrayAdjustmentInput {
  trayId: string;
  seasonId: string;
  userId: string;
  amount: number; // Positivo = agregar stock, Negativo = quitar
  metadata: {
    reason: string;
    notes?: string;
    operation?: string; // Tipo de operación: 'receive', 'return', 'adjustment'
  };
}

export type TrayMovementCounterparty = 'producer' | 'client';

export interface CreateTrayDeliveryInput {
  trayId: string;
  seasonId: string;
  userId: string;
  amount: number;
  counterpartyType: TrayMovementCounterparty;
  counterpartyId: string;
  metadata?: {
    reason?: string;
  };
}

export interface CreateTrayReceptionInput {
  trayId: string;
  seasonId: string;
  userId: string;
  amount: number;
  counterpartyType: TrayMovementCounterparty;
  counterpartyId: string;
  metadata?: {
    reason?: string;
    notes?: string;
    receptionNote?: string;
    qualityCheckPassed?: boolean;
    qualityIssues?: string[];
    driver?: string | null;
  };
}

/**
 * Crea un ajuste de stock para una bandeja específica
 * Actualiza el stock de la bandeja y registra la transacción
 */
export async function createTrayAdjustment(input: CreateTrayAdjustmentInput): Promise<TransactionResult> {
  try {
    const db = await getDb();
    const queryRunner = db.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Validar season activa
      const season = await queryRunner.manager.findOne(Season, {
        where: { id: input.seasonId, active: true, deletedAt: IsNull() }
      });
      if (!season) {
        await queryRunner.rollbackTransaction();
        return { success: false, error: 'Temporada no encontrada o no activa' };
      }

      // 2. Validar user
      const user = await queryRunner.manager.findOne(User, {
        where: { id: input.userId, deletedAt: IsNull() }
      });
      if (!user) {
        await queryRunner.rollbackTransaction();
        return { success: false, error: 'Usuario no encontrado' };
      }

      // 3. Validar y obtener bandeja
      const tray = await queryRunner.manager.findOne(Tray, {
        where: { id: input.trayId, deletedAt: IsNull() }
      });
      if (!tray) {
        await queryRunner.rollbackTransaction();
        return { success: false, error: 'Bandeja no encontrada' };
      }

      // 4. Calcular nuevo stock
      const newStock = tray.stock + input.amount;
      if (newStock < 0) {
        await queryRunner.rollbackTransaction();
        return { success: false, error: 'Stock insuficiente para el ajuste' };
      }

      // 5. Actualizar stock de la bandeja
      await queryRunner.manager.update(Tray, input.trayId, { stock: newStock });

      // 6. Crear transacción de auditoría
      const transaction = await queryRunner.manager.save(Transaction, {
        type: TransactionType.TRAY_ADJUSTMENT,
        seasonId: input.seasonId,
        userId: input.userId,
        direction: input.amount >= 0 ? TransactionDirection.IN : TransactionDirection.OUT,
        amount: input.amount,
        unit: TransactionUnit.TRAY,
        metadata: {
          ...input.metadata,
          trayId: input.trayId,
          trayLabel: tray.name,
          previousStock: tray.stock,
          newStock: newStock
        }
      });

      // 7. Crear registro de auditoría
      await queryRunner.manager.insert(Audit, {
        entityName: 'Tray',
        entityId: tray.id,
        userId: input.userId,
        action: AuditActionType.UPDATE,
        description: `Ajuste de stock de bandeja: ${tray.stock} → ${newStock} (${input.metadata.reason})`,
        oldValues: { stock: tray.stock } as any,
        newValues: { stock: newStock } as any,
        changes: {
          fields: ['stock'],
          summary: `Stock ajustado de ${tray.stock} a ${newStock}`,
          changeCount: 1,
        } as any,
        createdAt: new Date(),
      });

      await queryRunner.commitTransaction();

      console.log(`Tray adjustment created: ${transaction.id} by ${user.userName} - Stock: ${tray.stock} → ${newStock}`);

      return {
        success: true,
        message: 'Ajuste de stock creado exitosamente',
        data: serializeTransaction(transaction)
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

  } catch (error: any) {
    console.error('[createTrayAdjustment] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al crear ajuste de stock'
    };
  }
}

export async function createTrayDelivery(input: CreateTrayDeliveryInput): Promise<TransactionResult> {
  try {
    const amount = Number(input.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: 'La cantidad a entregar debe ser mayor a 0' };
    }

    if (input.counterpartyType !== 'producer' && input.counterpartyType !== 'client') {
      return { success: false, error: 'Tipo de destinatario inválido' };
    }

    if (!input.counterpartyId?.trim()) {
      return { success: false, error: 'Debes seleccionar el destinatario de la entrega' };
    }

    const db = await getDb();
    const queryRunner = db.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedTransaction: Transaction | null = null;

    try {
      const season = await queryRunner.manager.findOne(Season, {
        where: { id: input.seasonId, active: true, deletedAt: IsNull() },
      });

      if (!season) {
        throw new Error('Temporada no encontrada o no activa');
      }

      const user = await queryRunner.manager.findOne(User, {
        where: { id: input.userId, deletedAt: IsNull() },
        relations: ['person'],
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      const tray = await queryRunner.manager.findOne(Tray, {
        where: { id: input.trayId, deletedAt: IsNull() },
      });

      if (!tray) {
        throw new Error('Bandeja no encontrada');
      }

      const stockBefore = Number(tray.stock ?? 0);
      const newStock = stockBefore - amount;

      if (newStock < 0) {
        throw new Error('Stock insuficiente para registrar la entrega');
      }

      let counterpartyName: string | undefined;

      if (input.counterpartyType === 'producer') {
        const producer = await queryRunner.manager.findOne(Producer, {
          where: { id: input.counterpartyId, deletedAt: IsNull() },
        });

        if (!producer) {
          throw new Error('Productor no encontrado');
        }

        counterpartyName = producer.name?.trim() || undefined;
      } else {
        const customer = await queryRunner.manager.getRepository(Customer).findOne({
          where: { id: input.counterpartyId, deletedAt: IsNull() },
          relations: ['person'],
        });

        if (!customer) {
          throw new Error('Cliente no encontrado');
        }

        counterpartyName = customer.person?.name?.trim() || undefined;
      }

      await queryRunner.manager.update(Tray, input.trayId, { stock: newStock });

      const clean = (value?: string) => (value && value.trim() !== '' ? value.trim() : undefined);

      const metadata: TrayDeliveryMetadata = {
        trayId: input.trayId,
        trayLabel: tray.name,
        quantity: amount,
        stockBefore,
        stockAfter: newStock,
        reason: clean(input.metadata?.reason),
        performedBy: input.userId,
        performedByName: user.person?.name ?? user.userName,
        performedAt: new Date().toISOString(),
        counterpartyType: input.counterpartyType,
        counterpartyId: input.counterpartyId,
        counterpartyName,
      };

      savedTransaction = await queryRunner.manager.save(Transaction, {
        type: input.counterpartyType === 'producer'
          ? TransactionType.TRAY_DELIVERY_TO_PRODUCER
          : TransactionType.TRAY_DELIVERY_TO_CLIENT,
        seasonId: input.seasonId,
        userId: input.userId,
        producerId: input.counterpartyType === 'producer' ? input.counterpartyId : undefined,
        clientId: input.counterpartyType === 'client' ? input.counterpartyId : undefined,
        direction: TransactionDirection.OUT,
        amount,
        unit: TransactionUnit.TRAY,
        metadata,
      });

      await queryRunner.manager.insert(Audit, {
        entityName: 'Tray',
        entityId: tray.id,
        userId: input.userId,
        action: AuditActionType.UPDATE,
        description: `Entrega de bandeja: ${tray.stock} → ${newStock}`,
        oldValues: { stock: tray.stock } as any,
        newValues: { stock: newStock } as any,
        changes: {
          fields: ['stock'],
          summary: `Stock ajustado de ${tray.stock} a ${newStock} por entrega`,
          changeCount: 1,
        } as any,
        createdAt: new Date(),
      });

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    if (!savedTransaction) {
      return { success: false, error: 'No se pudo registrar la entrega de bandejas' };
    }

    revalidatePath('/home/storage/trays');

    return {
      success: true,
      message: 'Entrega de bandejas registrada exitosamente',
      data: serializeTransaction(savedTransaction),
    };
  } catch (error: any) {
    console.error('[createTrayDelivery] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al registrar la entrega de bandejas',
    };
  }
}

export async function createTrayReception(input: CreateTrayReceptionInput): Promise<TransactionResult> {
  try {
    const amount = Number(input.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: 'La cantidad a recibir debe ser mayor a 0' };
    }

    if (input.counterpartyType !== 'producer' && input.counterpartyType !== 'client') {
      return { success: false, error: 'Tipo de origen inválido' };
    }

    if (!input.counterpartyId?.trim()) {
      return { success: false, error: 'Debes seleccionar el origen de la recepción' };
    }

    const db = await getDb();
    const queryRunner = db.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedTransaction: Transaction | null = null;

    try {
      const season = await queryRunner.manager.findOne(Season, {
        where: { id: input.seasonId, active: true, deletedAt: IsNull() },
      });

      if (!season) {
        throw new Error('Temporada no encontrada o no activa');
      }

      const user = await queryRunner.manager.findOne(User, {
        where: { id: input.userId, deletedAt: IsNull() },
        relations: ['person'],
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      const tray = await queryRunner.manager.findOne(Tray, {
        where: { id: input.trayId, deletedAt: IsNull() },
      });

      if (!tray) {
        throw new Error('Bandeja no encontrada');
      }

      const stockBefore = Number(tray.stock ?? 0);
      const newStock = stockBefore + amount;

      let counterpartyName: string | undefined;

      if (input.counterpartyType === 'producer') {
        const producer = await queryRunner.manager.findOne(Producer, {
          where: { id: input.counterpartyId, deletedAt: IsNull() },
        });

        if (!producer) {
          throw new Error('Productor no encontrado');
        }

        counterpartyName = producer.name?.trim() || undefined;
      } else {
        const customer = await queryRunner.manager.getRepository(Customer).findOne({
          where: { id: input.counterpartyId, deletedAt: IsNull() },
          relations: ['person'],
        });

        if (!customer) {
          throw new Error('Cliente no encontrado');
        }

        counterpartyName = customer.person?.name?.trim() || undefined;
      }

      await queryRunner.manager.update(Tray, input.trayId, { stock: newStock });

      const clean = (value?: string) => (value && value.trim() !== '' ? value.trim() : undefined);

      const qualityIssues = input.metadata?.qualityIssues
        ?.map((issue) => issue.trim())
        .filter((issue) => issue !== '');

      const rawDriver = input.metadata?.driver;
      const driver = rawDriver === null ? null : clean(rawDriver);

      const metadata: TrayReceptionMetadata = {
        trayId: input.trayId,
        quantity: amount,
        stockBefore,
        stockAfter: newStock,
        reason: clean(input.metadata?.reason),
        notes: clean(input.metadata?.notes),
        receptionNote: clean(input.metadata?.receptionNote),
        driver: driver ?? null,
        qualityCheckPassed: input.metadata?.qualityCheckPassed ?? true,
        qualityIssues: qualityIssues && qualityIssues.length > 0 ? qualityIssues : undefined,
        performedBy: input.userId,
        performedByName: user.person?.name ?? user.userName,
        performedAt: new Date().toISOString(),
        counterpartyType: input.counterpartyType,
        counterpartyId: input.counterpartyId,
        counterpartyName,
      };

      savedTransaction = await queryRunner.manager.save(Transaction, {
        type: input.counterpartyType === 'producer'
          ? TransactionType.TRAY_RECEPTION_FROM_PRODUCER
          : TransactionType.TRAY_RECEPTION_FROM_CLIENT,
        seasonId: input.seasonId,
        userId: input.userId,
        producerId: input.counterpartyType === 'producer' ? input.counterpartyId : undefined,
        clientId: input.counterpartyType === 'client' ? input.counterpartyId : undefined,
        direction: TransactionDirection.IN,
        amount,
        unit: TransactionUnit.TRAY,
        metadata,
      });

      await queryRunner.manager.insert(Audit, {
        entityName: 'Tray',
        entityId: tray.id,
        userId: input.userId,
        action: AuditActionType.UPDATE,
        description: `Recepción de bandeja: ${tray.stock} → ${newStock}`,
        oldValues: { stock: tray.stock } as any,
        newValues: { stock: newStock } as any,
        changes: {
          fields: ['stock'],
          summary: `Stock ajustado de ${tray.stock} a ${newStock} por recepción`,
          changeCount: 1,
        } as any,
        createdAt: new Date(),
      });

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    if (!savedTransaction) {
      return { success: false, error: 'No se pudo registrar la recepción de bandejas' };
    }

    revalidatePath('/home/storage/trays');

    return {
      success: true,
      message: 'Recepción de bandejas registrada exitosamente',
      data: serializeTransaction(savedTransaction),
    };
  } catch (error: any) {
    console.error('[createTrayReception] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al registrar la recepción de bandejas',
    };
  }
}

export interface TrayTransactionRow {
  id: string;
  createdAt: Date;
  type: string; // User-friendly type name
  direction: TransactionDirection;
  amount: number;
  trayName: string;
  counterpartyName: string;
  reason?: string;
  performedByName: string;
  stockBefore?: number;
  stockAfter?: number;
}

export interface GetTrayTransactionsParams {
  page?: number;
  limit?: number;
  sort?: 'asc' | 'desc';
  sortField?: string;
  search?: string;
  filters?: string;
}

export interface GetTrayTransactionsResult {
  success: boolean;
  data?: TrayTransactionRow[];
  total?: number;
  error?: string;
}

/**
 * GET - Obtener todas las transacciones relacionadas con bandejas con filtros y paginación
 */
export async function getTrayTransactions(params?: GetTrayTransactionsParams): Promise<GetTrayTransactionsResult> {
  try {
    const db = await getDb();
    const page = params?.page || 1;
    const limit = params?.limit || 25;
    const sortField = params?.sortField || 'createdAt';
    const sortOrder = params?.sort || 'DESC';
    const search = params?.search || '';
    const filters = params?.filters || '';

    const trayTransactionTypes = [
      TransactionType.TRAY_ADJUSTMENT,
      TransactionType.TRAY_IN_FROM_PRODUCER,
      TransactionType.TRAY_OUT_TO_PRODUCER,
      TransactionType.TRAY_OUT_TO_CLIENT,
      TransactionType.TRAY_IN_FROM_CLIENT,
      TransactionType.TRAY_RECEPTION_FROM_PRODUCER,
      TransactionType.TRAY_RECEPTION_FROM_CLIENT,
      TransactionType.TRAY_DELIVERY_TO_PRODUCER,
      TransactionType.TRAY_DELIVERY_TO_CLIENT,
    ];

    let query = db.getRepository(Transaction)
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.season', 'season')
      .leftJoinAndSelect('transaction.producer', 'producer')
      .leftJoin('producer.person', 'producerPerson')
      .addSelect('producerPerson.name', 'producerPerson_name')
      .leftJoinAndSelect('transaction.client', 'client')
      .leftJoin('client.person', 'clientPerson')
      .addSelect('clientPerson.name', 'clientPerson_name')
      .leftJoinAndSelect('transaction.user', 'user')
      .where('transaction.deletedAt IS NULL')
      .andWhere('transaction.type IN (:...types)', { types: trayTransactionTypes });

    // Apply global search
    if (search) {
      query = query.andWhere(
        '(CAST(transaction.id AS CHAR) LIKE :search OR ' +
        'producer.name LIKE :search OR ' +
        'producerPerson.name LIKE :search OR ' +
        'clientPerson.name LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Parse and apply column filters
    if (filters) {
      const filterPairs = filters.split(',');
      filterPairs.forEach(pair => {
        const [column, ...valueParts] = pair.split('-');
        if (column && valueParts.length > 0) {
          const value = decodeURIComponent(valueParts.join('-'));
          
          switch (column) {
            case 'id':
              query = query.andWhere('CAST(transaction.id AS CHAR) LIKE :idFilter', { idFilter: `%${value}%` });
              break;
            case 'type':
              query = query.andWhere('transaction.type LIKE :typeFilter', { typeFilter: `%${value}%` });
              break;
            case 'direction':
              query = query.andWhere('transaction.direction LIKE :directionFilter', { directionFilter: `%${value}%` });
              break;
            case 'amount':
              query = query.andWhere('CAST(transaction.amount AS CHAR) LIKE :amountFilter', { amountFilter: `%${value}%` });
              break;
          }
        }
      });
    }

    // Get total count before pagination
    const total = await query.getCount();

    // Apply sorting
    const sortFieldMap: Record<string, string> = {
      id: 'transaction.id',
      createdAt: 'transaction.createdAt',
      type: 'transaction.type',
      direction: 'transaction.direction',
      amount: 'transaction.amount',
    };
    const actualSortField = sortFieldMap[sortField] || 'transaction.createdAt';
    query = query.orderBy(actualSortField, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    // Apply pagination
    query = query.skip((page - 1) * limit).take(limit);

    const transactions = await query.getMany();

    const rows: TrayTransactionRow[] = [];

    for (const transaction of transactions) {
      const metadata = transaction.metadata as any;

      // Get tray name from metadata or related entities
      let trayName = 'Desconocida';
      if (metadata?.trayId) {
        const tray = await db.getRepository(Tray).findOne({
          where: { id: metadata.trayId, deletedAt: IsNull() },
        });
        trayName = tray?.name || 'Desconocida';
      }

      // Get counterparty name
      let counterpartyName = '—';
      if (metadata?.counterpartyName) {
        counterpartyName = metadata.counterpartyName;
      } else if (transaction.producer) {
        counterpartyName = transaction.producer.name || 'Productor sin nombre';
      } else if (transaction.client?.person) {
        counterpartyName = transaction.client.person.name || 'Cliente sin nombre';
      }

      const row: TrayTransactionRow = {
        id: transaction.id.toString(),
        createdAt: transaction.createdAt,
        type: translateTransactionType(transaction.type),
        direction: transaction.direction,
        amount: Number(transaction.amount),
        trayName,
        counterpartyName,
        reason: metadata?.reason,
        performedByName: transaction.user?.person?.name || transaction.user?.userName || 'Usuario desconocido',
        stockBefore: metadata?.stockBefore !== undefined ? Number(metadata.stockBefore) : undefined,
        stockAfter: metadata?.stockAfter !== undefined ? Number(metadata.stockAfter) : undefined,
      };

      rows.push(row);
    }

    return {
      success: true,
      data: rows,
      total,
    };
  } catch (error: any) {
    console.error('[getTrayTransactions] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al obtener las transacciones de bandejas',
    };
  }
}

export interface DetailedTrayTransaction {
  id: string;
  type: string;
  direction: string;
  amount: number;
  unit: string;
  seasonName?: string;
  producerName?: string;
  clientName?: string;
  userName: string;
  createdAt: Date;
  updatedAt: Date;
  trayName?: string;
  trayType?: string;
  counterpartyName?: string;
  reason?: string;
  performedByName?: string;
  stockBefore?: number;
  stockAfter?: number;
  metadata?: any;
}

export interface GetDetailedTrayTransactionResult {
  success: boolean;
  data?: DetailedTrayTransaction;
  error?: string;
}

export async function getDetailedTrayTransaction(id: string): Promise<GetDetailedTrayTransactionResult> {
  try {
    if (!id) {
      return { success: false, error: 'ID inválido' };
    }

    const db = await getDb();
    const transaction = await db.getRepository(Transaction).findOne({
      where: { id: BigInt(id), deletedAt: IsNull() },
      relations: ['season', 'producer', 'client', 'user', 'producer.person', 'client.person', 'user.person'],
    });

    if (!transaction) {
      return { success: false, error: 'Transacción no encontrada' };
    }

    // Obtener información adicional de la bandeja si existe
    let trayInfo = null;
    let metadata: any = {};
    
    if (transaction.metadata) {
      if (typeof transaction.metadata === 'string') {
        try {
          metadata = JSON.parse(transaction.metadata);
        } catch (e) {
          metadata = {};
        }
      } else {
        metadata = transaction.metadata;
      }
    }

    const trayId = metadata.trayId || metadata.tray_id;
    
    if (trayId) {
      const trayRepo = db.getRepository(Tray);
      const tray = await trayRepo.findOne({
        where: { id: trayId, deletedAt: IsNull() },
        relations: ['variety', 'format'],
      });
      
      if (tray) {
        trayInfo = {
          name: tray.name,
          varietyName: tray.variety?.name,
          formatName: tray.format?.name,
        };
      }
    }

    const detailedTransaction: DetailedTrayTransaction = {
      id: String(transaction.id),
      type: transaction.type,
      direction: transaction.direction === 'IN' ? 'Entrada' : 'Salida',
      amount: transaction.amount,
      unit: transaction.unit,
      seasonName: transaction.season?.name,
      producerName: transaction.producer?.person?.name,
      clientName: transaction.client?.person?.name,
      userName: transaction.user?.person?.name || transaction.user?.userName || 'Sistema',
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      trayName: trayInfo?.name || metadata.trayLabel || metadata.trayName || 'Desconocida',
      trayType: trayInfo?.varietyName || trayInfo?.formatName || '—',
      counterpartyName: metadata.counterpartyName || '—',
      reason: metadata.reason || '—',
      performedByName: metadata.performedByName || transaction.user?.person?.name || transaction.user?.userName || '—',
      stockBefore: metadata.stockBefore,
      stockAfter: metadata.stockAfter,
      metadata: transaction.metadata,
    };

    return {
      success: true,
      data: detailedTransaction,
    };
  } catch (error: any) {
    console.error('[getDetailedTrayTransaction] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al obtener el detalle de la transacción',
    };
  }
}