import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/authOptions';
import { ABILITY_VALUES, type AbilityValue } from '@/lib/permissions';

export type AuthorizationResult =
  | { ok: true; userId: string; role?: string }
  | { ok: false; error: string };

export const NOT_AUTHENTICATED_MESSAGE = 'Sesión expirada o usuario no autenticado.';
export const NOT_AUTHORIZED_MESSAGE = 'No tiene permisos para realizar esta acción.';

/**
 * Valida la sesión y que el usuario tenga al menos una de las habilidades indicadas
 * (ADMIN las tiene todas, igual que en el cliente). Llamar antes de abrir transacciones.
 * El `userId` devuelto sale de la sesión: nunca confiar en el que envía el cliente.
 */
export async function authorize(...abilities: AbilityValue[]): Promise<AuthorizationResult> {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch (error) {
    console.error('[authorize] Error obteniendo la sesión:', error);
    return { ok: false, error: NOT_AUTHENTICATED_MESSAGE };
  }

  const user = session?.user as Record<string, any> | undefined;
  const userId = typeof user?.id === 'string' ? user.id : undefined;
  if (!userId) {
    return { ok: false, error: NOT_AUTHENTICATED_MESSAGE };
  }

  const role = typeof user?.role === 'string' ? user.role.toUpperCase() : undefined;
  const granted = new Set<string>(
    role === 'ADMIN' ? ABILITY_VALUES : Array.isArray(user?.permissions) ? user.permissions : [],
  );

  if (abilities.length > 0 && !abilities.some((ability) => granted.has(ability))) {
    return { ok: false, error: NOT_AUTHORIZED_MESSAGE };
  }

  return { ok: true, userId, role };
}

/** Variante para acciones que lanzan errores en lugar de devolver `{ success: false }`. */
export async function requireAbility(...abilities: AbilityValue[]): Promise<{ userId: string; role?: string }> {
  const result = await authorize(...abilities);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return { userId: result.userId, role: result.role };
}
