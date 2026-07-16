'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '../../data/db';
import { Permission, Ability } from '../../data/entities/Permission';
import { validAbilities, AbilityValue } from '../../lib/permissions';

export type UpdateUserPermissionsInput = {
  userId: string;
  abilities: AbilityValue[];
};

export async function getUserPermissions(userId: string): Promise<AbilityValue[]> {
  if (!userId || typeof userId !== 'string') {
    return [];
  }

  try {
    const db = await getDb();
    const repo = db.getRepository(Permission);
    const permissions = await repo.find({
      select: ['ability'],
      where: { userId },
    });

    return permissions
      .map((permission) => permission.ability as AbilityValue)
      .filter((ability): ability is AbilityValue => validAbilities.has(ability));
  } catch (error) {
    console.error('[getUserPermissions] Error loading permissions:', error);
    return [];
  }
}

export async function updateUserPermissions({ userId, abilities }: UpdateUserPermissionsInput) {
  if (!userId || typeof userId !== 'string') {
    return { success: false, message: 'ID de usuario inválido' };
  }

  // Asegurar que las habilidades sean únicas y válidas
  const uniqueAbilities = Array.from(new Set(abilities || []))
    .filter((ability): ability is AbilityValue => validAbilities.has(ability));

  try {
    const db = await getDb();
    const queryRunner = db.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Eliminar permisos existentes
      await queryRunner.manager.delete(Permission, { userId });

      if (uniqueAbilities.length > 0) {
        const permissionData = uniqueAbilities.map((ability) => ({
          userId: userId,
          ability: ability as Ability,
        }));

        await queryRunner.manager.insert(Permission, permissionData);
      }

      await queryRunner.commitTransaction();
      revalidatePath('/home/users');

      return { success: true };
    } catch (transactionError: any) {
      await queryRunner.rollbackTransaction();
      console.error('[updateUserPermissions] Transaction error:', transactionError);
      return { 
        success: false, 
        message: `Error al actualizar los permisos: ${transactionError.message || 'Error desconocido'}` 
      };
    } finally {
      await queryRunner.release();
    }
  } catch (error: any) {
    console.error('[updateUserPermissions] Connection error:', error);
    return { 
      success: false, 
      message: `Error de conexión al actualizar permisos: ${error.message || 'Error desconocido'}` 
    };
  }
}
