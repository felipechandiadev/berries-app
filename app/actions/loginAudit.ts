// Server Actions para auditoría de login
'use server'

import { Audit } from '../../data/entities/Audit';
import { AuditActionType } from '../../data/entities/audit.types';
import { getDb } from '../../data/db';

export enum LoginAuditAction {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
}

/**
 * Registra intento de login en la tabla de auditoría
 */
export async function logLoginAudit(
  userName: string,
  action: LoginAuditAction,
  details?: string
): Promise<void> {
  try {
    const db = await getDb();
    
    // Encontrar el usuario para obtener su ID (si existe)
    const userRepo = db.getRepository('User');
    let userId: string | undefined;
    
    try {
      const user = await userRepo.findOneBy({ userName });
      userId = user?.id;
    } catch (error) {
      // Si hay error buscando el usuario, continuar sin userId
      console.warn('[logLoginAudit] No se pudo encontrar usuario:', userName);
      userId = undefined;
    }

    const dbAction = action === LoginAuditAction.LOGOUT ? 'LOGOUT' : 'LOGIN';

    await db.getRepository(Audit).insert({
      entityName: 'Auth', // Entidad especial para login
      entityId: userName, // Usar userName como identificador
      userId: userId, // ID del usuario logueado (si existe)
      action: dbAction as any, // Mantener valores compatibles con el enum actual de la tabla
      description: `${action} para usuario: ${userName}${details ? ` - ${details}` : ''}`,
      oldValues: undefined,
      newValues: {
        userName,
        action,
        timestamp: new Date().toISOString(),
      } as any,
      changes: {
        fields: {},
        summary: `${action}`,
        changeCount: 0,
      } as any,
      createdAt: new Date(),
    });
    console.log('[logLoginAudit] Auditoría registrada:', action, 'para usuario:', userName);
  } catch (error) {
    console.error('[logLoginAudit] Error logging audit:', error);
    // No lanzar error para no interrumpir el proceso de login
  }
}
