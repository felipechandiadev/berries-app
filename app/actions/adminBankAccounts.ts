'use server';

import { AdminBankAccount } from '../../data/entities/AdminBankAccount';
import { getDb } from '../../data/db';
import { getCurrentUserSession } from './auth.server';
import { revalidatePath } from 'next/cache';
import { Like } from 'typeorm';

const APP_TIMEZONE = 'America/Santiago';

/**
 * Convierte una entidad AdminBankAccount a un objeto plano serializable
 */
function serializeAdminBankAccount(account: AdminBankAccount): any {
  return JSON.parse(JSON.stringify({
    id: account.id,
    accountType: account.accountType,
    bank: account.bank,
    accountNumber: account.accountNumber,
    alias: account.alias,
    isActive: account.isActive,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    deletedAt: account.deletedAt,
  }));
}

/**
 * Convierte un array de entidades AdminBankAccount a objetos planos serializables
 */
function serializeAdminBankAccounts(accounts: AdminBankAccount[]): any[] {
  return accounts.map(account => JSON.parse(JSON.stringify({
    id: account.id,
    accountType: account.accountType,
    bank: account.bank,
    accountNumber: account.accountNumber,
    alias: account.alias,
    isActive: account.isActive,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    deletedAt: account.deletedAt,
  })));
}

export interface CreateAdminBankAccountInput {
  accountType: string;
  bank: string;
  accountNumber: string;
  alias?: string;
  isActive?: boolean;
}

export interface UpdateAdminBankAccountInput {
  id: string;
  accountType?: string;
  bank?: string;
  accountNumber?: string;
  alias?: string;
  isActive?: boolean;
}

export interface GetAdminBankAccountsFilters {
  search?: string;
}

export interface AdminBankAccountResult {
  success: boolean;
  message?: string;
  data?: AdminBankAccount | AdminBankAccount[] | null;
  error?: string;
}

/**
 * Get all admin bank accounts with optional search filtering
 */
export async function getAdminBankAccounts(filters?: GetAdminBankAccountsFilters): Promise<AdminBankAccountResult> {
  try {
    const db = await getDb();
    const repo = db.getRepository(AdminBankAccount);

    let accounts: AdminBankAccount[];

    if (filters?.search?.trim()) {
      const searchTerm = `%${filters.search.trim()}%`;
      // Use query builder for multi-field search
      const queryBuilder = repo.createQueryBuilder('account')
        .where('account.bank LIKE :search', { search: searchTerm })
        .orWhere('account.accountType LIKE :search', { search: searchTerm })
        .orWhere('account.accountNumber LIKE :search', { search: searchTerm })
        .orWhere('account.alias LIKE :search', { search: searchTerm })
        .orderBy('account.createdAt', 'DESC');

      accounts = await queryBuilder.getMany();
    } else {
      accounts = await repo.find({
        order: { createdAt: 'DESC' },
      });
    }

    return {
      success: true,
      data: serializeAdminBankAccounts(accounts),
    };
  } catch (error: any) {
    console.error('[getAdminBankAccounts] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error fetching admin bank accounts',
    };
  }
}

/**
 * Get active admin bank accounts
 */
export async function getActiveAdminBankAccounts(): Promise<AdminBankAccountResult> {
  try {
    const db = await getDb();
    const accounts = await db.getRepository(AdminBankAccount)
      .find({
        where: { isActive: true },
        order: { createdAt: 'DESC' },
      });

    return {
      success: true,
      data: serializeAdminBankAccounts(accounts),
    };
  } catch (error: any) {
    console.error('[getActiveAdminBankAccounts] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error fetching active admin bank accounts',
    };
  }
}

/**
 * Create a new admin bank account
 */
export async function createAdminBankAccount(input: CreateAdminBankAccountInput): Promise<AdminBankAccountResult> {
  try {
    const user = await getCurrentUserSession();
    if (!user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const db = await getDb();
    const account = db.getRepository(AdminBankAccount).create({
      accountType: input.accountType as any,
      bank: input.bank as any,
      accountNumber: input.accountNumber,
      alias: input.alias,
      isActive: input.isActive ?? true,
    });

    const savedAccount = await db.getRepository(AdminBankAccount).save(account);

    revalidatePath('/home/economicManagement/bankAccounts');

    return {
      success: true,
      message: 'Admin bank account created successfully',
      data: serializeAdminBankAccount(savedAccount),
    };
  } catch (error: any) {
    console.error('[createAdminBankAccount] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error creating admin bank account',
    };
  }
}

/**
 * Update an admin bank account
 */
export async function updateAdminBankAccount(input: UpdateAdminBankAccountInput): Promise<AdminBankAccountResult> {
  try {
    const user = await getCurrentUserSession();
    if (!user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const db = await getDb();
    const account = await db.getRepository(AdminBankAccount).findOne({
      where: { id: input.id },
    });

    if (!account) {
      return {
        success: false,
        error: 'Admin bank account not found',
      };
    }

    if (input.accountType) account.accountType = input.accountType as any;
    if (input.bank) account.bank = input.bank as any;
    if (input.accountNumber) account.accountNumber = input.accountNumber;
    if (input.alias !== undefined) account.alias = input.alias;
    if (input.isActive !== undefined) account.isActive = input.isActive;

    const savedAccount = await db.getRepository(AdminBankAccount).save(account);

    revalidatePath('/home/economicManagement/bankAccounts');

    return {
      success: true,
      message: 'Admin bank account updated successfully',
      data: serializeAdminBankAccount(savedAccount),
    };
  } catch (error: any) {
    console.error('[updateAdminBankAccount] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error updating admin bank account',
    };
  }
}

/**
 * Delete an admin bank account
 */
export async function deleteAdminBankAccount(id: string): Promise<AdminBankAccountResult> {
  try {
    const user = await getCurrentUserSession();
    if (!user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const db = await getDb();
    const account = await db.getRepository(AdminBankAccount).findOne({
      where: { id },
    });

    if (!account) {
      return {
        success: false,
        error: 'Admin bank account not found',
      };
    }

    await db.getRepository(AdminBankAccount).remove(account);

    revalidatePath('/home/economicManagement/bankAccounts');

    return {
      success: true,
      message: 'Admin bank account deleted successfully',
    };
  } catch (error: any) {
    console.error('[deleteAdminBankAccount] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error deleting admin bank account',
    };
  }
}