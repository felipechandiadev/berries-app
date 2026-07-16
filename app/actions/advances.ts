'use server';

import type { DataSource, EntityManager } from 'typeorm';
import { In, IsNull } from 'typeorm';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/data/db';
import {
  Transaction,
  TransactionDirection,
  TransactionType,
  TransactionUnit,
  AdvanceMetadata,
} from '@/data/entities/Transaction';
import { Season } from '@/data/entities/Season';
import { Producer } from '@/data/entities/Producer';
import { AdminBankAccount } from '@/data/entities/AdminBankAccount';
import { User } from '@/data/entities/User';
import { TransactionRelation, TransactionRelationType } from '@/data/entities/TransactionRelation';
import type { PersonBankAccount } from '@/data/entities/Person';

import { AuditActionType } from '@/data/entities/audit.types';
import { logAdvanceAudit } from './audit.advances';

export type AdvancePaymentMethod = 'CASH' | 'TRANSFER' | 'CHECK';

export type AdvanceStatus = 'ACTIVE' | 'APPLIED' | 'CANCELLED';

export interface CreateAdvanceInput {
  producerId: string;
  seasonId?: string;
  amount: number;
  paymentMethod: AdvancePaymentMethod;
  paymentDetails?: AdvanceMetadata['paymentDetails'];
  notes?: string;
  userId: string;
}

export interface AdvanceSummary {
  id: string;
  transactionId: string;
  producerId?: string;
  producerName?: string;
  producerDni?: string;
  seasonId?: string;
  seasonName?: string;
  amount: number;
  paymentMethod: AdvancePaymentMethod;
  paymentReference?: string;
  bankAccountId?: string;
  bankAccountName?: string;
  producerAccountId?: string;
  producerAccountName?: string;
  createdAt: string;
  operatorId?: string;
  operatorName?: string;
  notes?: string;
  appliedAmount: number;
  availableAmount: number;
  status: AdvanceStatus;
}

export interface AdvanceApplication {
  amount: number;
  notes?: string;
  appliedAt: string;
  userId: string;
  userName?: string;
  settlementTransactionId?: string;
}

export interface AdvanceDetail extends AdvanceSummary {
  applications: AdvanceApplication[];
}

export interface ListAdvancesFilters {
  search?: string;
  seasonId?: string;
  producerId?: string;
  paymentMethod?: AdvancePaymentMethod;
  status?: AdvanceStatus;
  from?: string; // ISO date string inclusive
  to?: string;   // ISO date string inclusive
}

export interface DeleteAdvanceInput {
  advanceId: string;
  userId: string;
}

export interface ApplyAdvanceInput {
  advanceId: string;
  settlementTransactionId: string;
  amount: number;
  notes?: string;
  userId: string;
}

interface BuildAdvanceSummaryOptions {
  bankAccountName?: string;
  producerAccountName?: string;
  applications?: AdvanceApplication[];
}

function ensureIntegerCLP(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('El monto del anticipo debe ser mayor que cero.');
  }
  if (!Number.isInteger(amount)) {
    throw new Error('El monto del anticipo debe ser un entero (CLP sin decimales).');
  }
}

function buildPaymentDetails(input: CreateAdvanceInput): AdvanceMetadata['paymentDetails'] {
  const details = input.paymentDetails ?? {};

  if (input.paymentMethod === 'TRANSFER') {
    if (!details.bankAccountId) {
      throw new Error('Debe seleccionar la cuenta bancaria de la administración para transferencias.');
    }
    if (!details.producerAccountId) {
      throw new Error('Debe seleccionar la cuenta bancaria del productor para transferencias.');
    }
  }

  if (input.paymentMethod === 'CHECK') {
    if (!details.bankAccountId) {
      throw new Error('Debe seleccionar la cuenta bancaria emisora del cheque.');
    }
    if (!details.checkNumber) {
      throw new Error('Debe ingresar el número de serie del cheque.');
    }
  }

  return {
    producerAccountId: details.producerAccountId,
    bankAccountId: details.bankAccountId,
    transactionId: details.transactionId,
    checkNumber: details.checkNumber,
  };
}

function resolvePaymentReference(metadata?: AdvanceMetadata): string | undefined {
  if (!metadata) {
    return undefined;
  }

  return metadata.paymentDetails.transactionId ?? metadata.paymentDetails.checkNumber ?? undefined;
}

function parseApplicationContext(relation: TransactionRelation | undefined | null): AdvanceApplication | null {
  if (!relation?.context) {
    return null;
  }

  try {
    const parsed = JSON.parse(relation.context) as AdvanceApplication;
    if (typeof parsed.amount !== 'number') {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('[parseApplicationContext] Invalid context JSON', error);
    return null;
  }
}

function computeAdvanceStatus(amount: number, appliedAmount: number, deletedAt?: Date | null): AdvanceStatus {
  if (deletedAt) {
    return 'CANCELLED';
  }
  if (appliedAmount >= amount) {
    return 'APPLIED';
  }
  return 'ACTIVE';
}

function toTransactionId(id: string): bigint {
  try {
    return BigInt(id);
  } catch (error) {
    throw new Error('Identificador de transacción inválido.');
  }
}

function buildAdvanceSummary(
  transaction: Transaction,
  options: BuildAdvanceSummaryOptions = {},
): AdvanceSummary {
  const metadata = (transaction.metadata as AdvanceMetadata | null) ?? undefined;
  const applications = options.applications ?? [];
  const appliedAmount = applications.reduce((total, app) => total + (app.amount ?? 0), 0);
  const amount = Number(transaction.amount);
  const status = computeAdvanceStatus(amount, appliedAmount, transaction.deletedAt);
  const availableAmount = status === 'CANCELLED' ? 0 : Math.max(amount - appliedAmount, 0);

  return {
    id: String(transaction.id),
    transactionId: String(transaction.id),
    producerId: transaction.producerId,
    producerName: transaction.producer?.name,
    producerDni: transaction.producer?.dni,
    seasonId: transaction.seasonId,
    seasonName: transaction.season?.name,
    amount: Number(transaction.amount),
    paymentMethod: metadata?.paymentMethod ?? 'CASH',
    paymentReference: resolvePaymentReference(metadata),
    bankAccountId: metadata?.paymentDetails.bankAccountId,
    bankAccountName: options.bankAccountName,
    producerAccountId: metadata?.paymentDetails.producerAccountId,
    producerAccountName: options.producerAccountName,
    createdAt: transaction.createdAt.toISOString(),
    operatorId: transaction.userId,
    operatorName: transaction.user?.userName,
    notes: metadata?.notes,
    appliedAmount,
    availableAmount,
    status,
  };
}

async function loadAdvanceDetail(db: DataSource, id: string): Promise<AdvanceDetail> {
  const transactionRepo = db.getRepository(Transaction);
  const transaction = await transactionRepo.findOne({
    where: { id: toTransactionId(id), type: TransactionType.ADVANCE },
    relations: { season: true, producer: { person: true }, user: true },
    withDeleted: true,
  });

  if (!transaction) {
    throw new Error('Anticipo no encontrado');
  }

  const metadata = (transaction.metadata as AdvanceMetadata | null) ?? undefined;
  let bankAccountName: string | undefined;
  if (metadata?.paymentDetails.bankAccountId) {
    const bankAccount = await db.getRepository(AdminBankAccount).findOne({
      where: { id: metadata.paymentDetails.bankAccountId },
      withDeleted: true,
    });
    if (bankAccount) {
      bankAccountName = formatAdminBankAccount(bankAccount);
    }
  }
  let producerAccountName: string | undefined;
  if (metadata?.paymentDetails.producerAccountId) {
    // Load producer bank account from producer.person.bankAccounts
    if (transaction.producer?.person?.bankAccounts) {
      const producerAccount = transaction.producer.person.bankAccounts.find(
        (account: PersonBankAccount) => account.accountNumber === metadata.paymentDetails.producerAccountId
      );
      if (producerAccount) {
        producerAccountName = formatProducerBankAccount(producerAccount);
      }
    }
  }

  const relations = await db.getRepository(TransactionRelation).find({
    where: {
      relationType: TransactionRelationType.ADVANCE_TO_SETTLEMENT,
      parentTransactionId: String(transaction.id),
    },
    order: { createdAt: 'ASC' },
  });

  const applications = relations
    .map((relation) => parseApplicationContext(relation))
    .filter((context): context is AdvanceApplication => Boolean(context));

  const summary = buildAdvanceSummary(transaction, { bankAccountName, producerAccountName, applications });
  return {
    ...summary,
    applications,
  };
}

function formatAdminBankAccount(account: AdminBankAccount): string {
  const base = `${account.bank} - ${account.accountType} - ${account.accountNumber}`;
  return account.alias ? `${base} (${account.alias})` : base;
}

function formatProducerBankAccount(account: PersonBankAccount): string {
  const base = `${account.bank} - ${account.accountType} - ${account.accountNumber}`;
  return account.alias ? `${base} (${account.alias})` : base;
}

export async function getProducerBankAccounts(producerId: string): Promise<Array<{ id: string; label: string }>> {
  if (!producerId) {
    return [];
  }

  const db = await getDb();
  const producer = await db.getRepository(Producer).findOne({
    where: { id: producerId },
    relations: { person: true },
  });

  const bankAccounts = producer?.person?.bankAccounts ?? [];
  return bankAccounts.map((account: PersonBankAccount, index) => {
    const id = account.accountNumber || `account-${index}`;
    return {
      id,
      label: formatProducerBankAccount(account),
    };
  });
}

export async function createAdvance(input: CreateAdvanceInput): Promise<AdvanceDetail> {
  ensureIntegerCLP(input.amount);

  const db = await getDb();

  const seasonRepository = db.getRepository(Season);
  const producerRepository = db.getRepository(Producer);
  const userRepository = db.getRepository(User);

  const [season, producer, user] = await Promise.all([
    input.seasonId
      ? seasonRepository.findOne({ where: { id: input.seasonId, deletedAt: IsNull() }, withDeleted: false })
      : seasonRepository.findOne({ where: { active: true, deletedAt: IsNull() }, withDeleted: false }),
    producerRepository.findOneByOrFail({ id: input.producerId }),
    userRepository.findOneByOrFail({ id: input.userId }),
  ]);

  if (!season) {
    throw new Error('No hay una temporada activa configurada.');
  }

  const paymentDetails = buildPaymentDetails(input);

  if (paymentDetails.bankAccountId) {
    const bankAccount = await db.getRepository(AdminBankAccount).findOne({
      where: { id: paymentDetails.bankAccountId },
    });

    if (!bankAccount || !bankAccount.isActive || bankAccount.deletedAt) {
      throw new Error('La cuenta bancaria de la administración seleccionada no está activa.');
    }
  }

  const metadata: AdvanceMetadata = {
    paymentMethod: input.paymentMethod,
    paymentDetails,
    notes: input.notes,
  };

  const transactionRepo = db.getRepository(Transaction);
  const transaction = transactionRepo.create({
    type: TransactionType.ADVANCE,
    direction: TransactionDirection.OUT,
    unit: TransactionUnit.CLP,
    amount: input.amount,
    seasonId: season.id,
    producerId: producer.id,
    userId: user.id,
    metadata,
  });


  await db.transaction(async (manager) => {
    await manager.getRepository(Transaction).save(transaction);
    // Audit log for creation
    await logAdvanceAudit(
      manager,
      String(transaction.id),
      AuditActionType.CREATE,
      input.userId,
      undefined,
      {
        amount: input.amount,
        producerId: input.producerId,
        seasonId: season.id,
        paymentMethod: input.paymentMethod,
        paymentDetails,
        notes: input.notes,
      }
    );
  });

  revalidatePath('/home/economicManagement/advances');

  return loadAdvanceDetail(db, String(transaction.id));
}

export async function listAdvances(filters: ListAdvancesFilters = {}): Promise<AdvanceSummary[]> {
  const db = await getDb();
  const transactionRepo = db.getRepository(Transaction);

  const qb = transactionRepo
    .createQueryBuilder('transaction')
    .leftJoinAndSelect('transaction.season', 'season')
    .leftJoinAndSelect('transaction.producer', 'producer')
    .leftJoinAndSelect('producer.person', 'person')
    .leftJoinAndSelect('transaction.user', 'user')
    .where('transaction.type = :type', { type: TransactionType.ADVANCE })
    .orderBy('transaction.createdAt', 'DESC')
    .withDeleted();

  if (filters.seasonId) {
    qb.andWhere('transaction.seasonId = :seasonId', { seasonId: filters.seasonId });
  }

  if (filters.producerId) {
    qb.andWhere('transaction.producerId = :producerId', { producerId: filters.producerId });
  }

  if (filters.from) {
    const fromDate = new Date(filters.from);
    if (!Number.isNaN(fromDate.getTime())) {
      qb.andWhere('transaction.createdAt >= :from', { from: fromDate });
    }
  }

  if (filters.to) {
    const toDate = new Date(filters.to);
    if (!Number.isNaN(toDate.getTime())) {
      qb.andWhere('transaction.createdAt <= :to', { to: toDate });
    }
  }

  const transactions = await qb.getMany();

  const bankAccountIds = Array.from(
    new Set(
      transactions
        .map((tx: Transaction) => (tx.metadata as AdvanceMetadata | null)?.paymentDetails.bankAccountId)
        .filter((id: string | undefined): id is string => Boolean(id)),
    ),
  );

  const bankAccounts = bankAccountIds.length
    ? await db.getRepository(AdminBankAccount).find({ where: { id: In(bankAccountIds) } })
    : [];

  const bankAccountMap = new Map(
    bankAccounts.map((account: AdminBankAccount) => [account.id, formatAdminBankAccount(account)]),
  );

  // Create producer account name map
  const producerAccountMap = new Map<string, string>();
  transactions.forEach((transaction) => {
    const metadata = transaction.metadata as AdvanceMetadata | null;
    const producerAccountId = metadata?.paymentDetails.producerAccountId;
    if (producerAccountId && transaction.producer?.person?.bankAccounts) {
      const account = transaction.producer.person.bankAccounts.find(
        (acc) => acc.accountNumber === producerAccountId,
      );
      if (account) {
        producerAccountMap.set(producerAccountId, formatProducerBankAccount(account));
      }
    }
  });

  const advanceIds = transactions.map((transaction) => String(transaction.id));

  const relations = advanceIds.length
    ? await db.getRepository(TransactionRelation).find({
        where: [
          {
            relationType: TransactionRelationType.ADVANCE_TO_SETTLEMENT,
            parentTransactionId: In(advanceIds),
          },
          {
            relationType: TransactionRelationType.ADVANCE_TO_SETTLEMENT,
            childTransactionId: In(advanceIds),
          },
        ],
        order: { createdAt: 'ASC' },
      })
    : [];

  const applicationsMap = new Map<string, AdvanceApplication[]>();
  relations.forEach((relation) => {
    let context = parseApplicationContext(relation);

    // Determine which ID is the advance and which is the settlement
    const isAdvanceParent = relation.parentTransactionId ? advanceIds.includes(relation.parentTransactionId) : false;
    const advanceId = isAdvanceParent ? relation.parentTransactionId : (relation.childTransactionId as string);
    const settlementId = isAdvanceParent ? relation.childTransactionId : relation.parentTransactionId;

    if (!advanceId || !settlementId) return;

    if (!context) {
      // Fallback: if context is missing or invalid, assume full amount of the advance was applied
      // This matches logic in listPendingAdvances to handle legacy/migrated data
      const advanceTx = transactions.find((t) => String(t.id) === advanceId);
      if (advanceTx) {
        context = {
          amount: Number(advanceTx.amount),
          appliedAt: relation.createdAt.toISOString(),
          userId: 'system',
          settlementTransactionId: settlementId ?? undefined,
        };
      }
    }

    if (!context) {
      return;
    }
    const list = applicationsMap.get(advanceId) ?? [];
    list.push(context);
    applicationsMap.set(advanceId, list);
  });

  const summaries = transactions.map((transaction: Transaction) => {
    const metadata = (transaction.metadata as AdvanceMetadata | null) ?? undefined;
    const bankAccountId = metadata?.paymentDetails.bankAccountId;
    const bankAccountName = bankAccountId ? bankAccountMap.get(bankAccountId) : undefined;
    const producerAccountId = metadata?.paymentDetails.producerAccountId;
    const producerAccountName = producerAccountId ? producerAccountMap.get(producerAccountId) : undefined;
    const applications = applicationsMap.get(String(transaction.id)) ?? [];
    return buildAdvanceSummary(transaction, { bankAccountName, producerAccountName, applications });
  });

  return summaries.filter((summary) => {
    if (filters.paymentMethod && summary.paymentMethod !== filters.paymentMethod) {
      return false;
    }

    if (filters.status && summary.status !== filters.status) {
      return false;
    }

    if (filters.search) {
      const needle = filters.search.trim().toLowerCase();
      if (needle) {
        const haystack = [
          summary.producerName,
          summary.seasonName,
          summary.paymentReference,
          summary.bankAccountName,
          summary.operatorName,
          summary.notes,
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase())
          .join(' ');

        if (!haystack.includes(needle)) {
          return false;
        }
      }
    }

    return true;
  });
}

export async function deleteAdvance(input: DeleteAdvanceInput): Promise<void> {
  const db = await getDb();


  await db.transaction(async (manager) => {
    const transactionRepo = manager.getRepository(Transaction);
    const relationRepo = manager.getRepository(TransactionRelation);

    const advance = await transactionRepo.findOne({
      where: { id: toTransactionId(input.advanceId), type: TransactionType.ADVANCE },
      relations: { season: true, producer: true, user: true },
      lock: { mode: 'pessimistic_write' },
      withDeleted: true,
    });

    if (!advance) {
      throw new Error('Anticipo no encontrado.');
    }

    if (advance.deletedAt) {
      throw new Error('El anticipo ya fue eliminado.');
    }

    const relations = await relationRepo.find({
      where: {
        relationType: TransactionRelationType.ADVANCE_TO_SETTLEMENT,
        parentTransactionId: String(advance.id),
      },
    });

    const applications = relations
      .map((relation) => parseApplicationContext(relation))
      .filter((context): context is AdvanceApplication => Boolean(context));

    const appliedAmount = applications.reduce((total, context) => total + context.amount, 0);
    if (appliedAmount > 0) {
      throw new Error('No es posible eliminar un anticipo que ya tiene aplicaciones registradas.');
    }

    // Audit log for deletion (before actual delete)
    let paymentMethod, paymentDetails, notes;
    if (advance.metadata && (advance.type === TransactionType.ADVANCE)) {
      const advMeta = advance.metadata as import('@/data/entities/Transaction').AdvanceMetadata;
      paymentMethod = advMeta.paymentMethod;
      paymentDetails = advMeta.paymentDetails;
      notes = advMeta.notes;
    }
    await logAdvanceAudit(
      manager,
      String(advance.id),
      AuditActionType.DELETE,
      input.userId,
      {
        amount: advance.amount,
        producerId: advance.producerId,
        seasonId: advance.seasonId,
        paymentMethod,
        paymentDetails,
        notes,
      },
      undefined
    );

    await relationRepo.delete({
      relationType: TransactionRelationType.ADVANCE_TO_SETTLEMENT,
      parentTransactionId: String(advance.id),
    });

    await relationRepo.delete({
      relationType: TransactionRelationType.ADVANCE_TO_SETTLEMENT,
      childTransactionId: String(advance.id),
    });

    await transactionRepo.delete(String(advance.id));
  });

  revalidatePath('/home/economicManagement/advances');
}

export async function applyAdvance(input: ApplyAdvanceInput): Promise<AdvanceDetail> {
  ensureIntegerCLP(input.amount);

  const db = await getDb();

  await db.transaction(async (manager) => {
    const transactionRepo = manager.getRepository(Transaction);
    const relationRepo = manager.getRepository(TransactionRelation);
    const userRepo = manager.getRepository(User);

    const advance = await transactionRepo.findOne({
      where: { id: toTransactionId(input.advanceId), type: TransactionType.ADVANCE },
      relations: { season: true, producer: true, user: true },
      lock: { mode: 'pessimistic_write' },
      withDeleted: true,
    });

    if (!advance) {
      throw new Error('Anticipo no encontrado.');
    }

    if (advance.deletedAt) {
      throw new Error('El anticipo está cancelado y no admite aplicaciones.');
    }

    const settlement = await transactionRepo.findOne({
      where: { id: toTransactionId(input.settlementTransactionId) },
      lock: { mode: 'pessimistic_read' },
      withDeleted: true,
    });

    if (!settlement) {
      throw new Error('Transacción de liquidación no encontrada.');
    }

    if (String(settlement.id) === String(advance.id)) {
      throw new Error('La liquidación asociada debe ser distinta al anticipo.');
    }

    if (settlement.producerId && advance.producerId && settlement.producerId !== advance.producerId) {
      throw new Error('La liquidación pertenece a un productor distinto.');
    }

    const metadata = (advance.metadata as AdvanceMetadata | null) ?? undefined;
    if (!metadata) {
      throw new Error('El anticipo no tiene metadata registrada.');
    }

    const relations = await relationRepo.find({
      where: {
        relationType: TransactionRelationType.ADVANCE_TO_SETTLEMENT,
        parentTransactionId: String(advance.id),
      },
    });

    const applications = relations
      .map((relation) => parseApplicationContext(relation))
      .filter((context): context is AdvanceApplication => Boolean(context));

    const appliedAmount = applications.reduce((total, context) => total + context.amount, 0);
    const totalAmount = Number(advance.amount);
    const availableAmount = Math.max(totalAmount - appliedAmount, 0);

    if (availableAmount <= 0) {
      throw new Error('El anticipo ya fue aplicado completamente.');
    }

    if (input.amount > availableAmount) {
      throw new Error('El monto aplicado excede el saldo disponible del anticipo.');
    }

    const user = await userRepo.findOne({ where: { id: input.userId } });
    if (!user) {
      throw new Error('Usuario no autorizado para registrar aplicaciones.');
    }

    const context: AdvanceApplication = {
      amount: input.amount,
      notes: input.notes,
      appliedAt: new Date().toISOString(),
      userId: user.id,
      userName: user.userName,
      settlementTransactionId: String(settlement.id),
    };

    const relation = relationRepo.create({
      parentTransactionId: String(advance.id),
      childTransactionId: String(settlement.id),
      relationType: TransactionRelationType.ADVANCE_TO_SETTLEMENT,
      context: JSON.stringify(context),
    });

    await relationRepo.save(relation);
  });

  return loadAdvanceDetail(db, input.advanceId);
}

export async function getAdvanceDetail(advanceId: string): Promise<AdvanceDetail> {
  const db = await getDb();
  return loadAdvanceDetail(db, advanceId);
}

// ============================================================================
// UPDATE ADVANCE DATE
// ============================================================================

export interface UpdateAdvanceDateInput {
  advanceId: string;
  newDate: string; // ISO date string
  userId: string;
}

export interface UpdateAdvanceDateResult {
  success: boolean;
  error?: string;
}

/**
 * Updates the creation date of an advance.
 * Cannot update if the advance has been applied to a settlement.
 */
export async function updateAdvanceDate(input: UpdateAdvanceDateInput): Promise<UpdateAdvanceDateResult> {
  const { advanceId, newDate, userId } = input;

  if (!advanceId?.trim()) {
    return { success: false, error: 'ID del anticipo es requerido.' };
  }

  if (!newDate?.trim()) {
    return { success: false, error: 'La nueva fecha es requerida.' };
  }

  if (!userId?.trim()) {
    return { success: false, error: 'ID del usuario es requerido.' };
  }

  const parsedDate = new Date(newDate);
  if (isNaN(parsedDate.getTime())) {
    return { success: false, error: 'Formato de fecha inválido.' };
  }

  try {
    const db = await getDb();

    // Get the advance with relations to check status
    const transactionRepo = db.getRepository(Transaction);
    const relationRepo = db.getRepository(TransactionRelation);

    const advance = await transactionRepo.findOne({
      where: {
        id: toTransactionId(advanceId),
        type: TransactionType.ADVANCE,
        deletedAt: IsNull(),
      },
      relations: ['producer'],
    });

    if (!advance) {
      return { success: false, error: 'Anticipo no encontrado.' };
    }

    // Check if advance has been applied to a settlement
    const applications = await relationRepo.find({
      where: {
        childTransactionId: advanceId,
        relationType: TransactionRelationType.ADVANCE_TO_SETTLEMENT,
      },
    });

    const appliedAmount = applications.reduce((total, rel) => {
      const app = parseApplicationContext(rel);
      return total + (app?.amount ?? 0);
    }, 0);

    if (appliedAmount > 0) {
      return { success: false, error: 'No se puede modificar la fecha de un anticipo que ya ha sido liquidado.' };
    }

    const oldDate = advance.createdAt;

    // Update the date using transaction for audit
    await db.transaction(async (manager) => {
      advance.createdAt = parsedDate;
      await manager.save(Transaction, advance);

      // Log audit
      await logAdvanceAudit(
        manager,
        advanceId,
        AuditActionType.UPDATE,
        userId,
        { createdAt: oldDate?.toISOString() },
        { createdAt: parsedDate.toISOString() }
      );
    });

    revalidatePath('/home/economicManagement/advances');

    return { success: true };
  } catch (error) {
    console.error('[updateAdvanceDate] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar la fecha del anticipo.',
    };
  }
}
