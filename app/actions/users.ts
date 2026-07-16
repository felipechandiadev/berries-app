// Server Actions para CRUD de la entidad User
'use server';

import { User, UserRole } from '../../data/entities/User';
import { Person } from '../../data/entities/Person';
import { Audit } from '../../data/entities/Audit';
import { AuditActionType } from '../../data/entities/audit.types';
import { Permission, Ability } from '../../data/entities/Permission';
import { getDb } from '../../data/db';
import moment from 'moment-timezone';
import { revalidatePath } from 'next/cache';
import { getCurrentUserSession } from './auth.server';
import bcrypt from 'bcryptjs';
import { EntityManager } from 'typeorm';

const APP_TIMEZONE = 'America/Santiago';

// Permisos por defecto para usuarios con rol OPERATOR
const DEFAULT_OPERATOR_PERMISSIONS: Ability[] = [
  Ability.DASHBOARD_MENU,
  Ability.RECEPTIONS_MENU,
  Ability.RECEPTIONS_CREATE_MENU,
  Ability.RECEPTIONS_PRINT_DETAIL,
  Ability.PRODUCERS_MENU,
  Ability.ADVANCES_MENU,
  Ability.SETTLEMENTS_MENU,
  Ability.CUSTOMERS_MENU,
  Ability.TRAYS_MENU,
];

// Todos los permisos para usuarios con rol ADMIN
const ALL_PERMISSIONS: Ability[] = Object.values(Ability);

export interface CreateUserInput {
  userName: string;
  mail: string;
  phone?: string;
  rol: string | UserRole;
  password: string;
  personName?: string;
  personDni?: string;
}

export interface UpdateUserInput {
  id: string;
  userName: string;
  mail: string;
  phone?: string;
  rol: string | UserRole;
  personName?: string;
  personDni?: string;
}

export interface CreateUserResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

/**
 * Helper function to log audit with provided session and entity manager
 * 
 * @param manager TypeORM EntityManager (from queryRunner or DataSource)
 * @param entityId ID de la entidad auditada
 * @param action Tipo de acción (CREATE, UPDATE, DELETE)
 * @param userId ID del usuario que realiza la acción
 * @param oldValues Valores anteriores (para UPDATE/DELETE)
 * @param newValues Valores nuevos (para CREATE/UPDATE)
 * 
 * Recibe EntityManager en lugar de DataSource para mejor tipado y consistencia.
 * Se utiliza dentro de transacciones (queryRunner.manager) y fuera.
 */
async function logUserAudit(
  manager: EntityManager,
  entityId: string,
  action: AuditActionType,
  userId: string | undefined,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>
) {
  try {
    console.log('[logUserAudit] Iniciando registro de auditoría. userId:', userId, 'action:', action);
    
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

    const description = `${action} de usuario: ${newValues?.userName || oldValues?.userName || 'unknown'}`;
    const changesJson = JSON.stringify({
      fields,
      summary: `${changeCount} campo(s) modificado(s)`,
      changeCount,
    });
    const oldValuesJson = oldValues ? JSON.stringify(oldValues) : null;
    const newValuesJson = newValues ? JSON.stringify(newValues) : null;

    // Usar SQL raw para evitar problemas de relaciones circulares
    await manager.query(`
      INSERT INTO audits (id, entityName, entityId, userId, action, description, oldValues, newValues, changes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      auditId,
      'User',
      entityId,
      userId || null,
      action,
      description,
      oldValuesJson,
      newValuesJson,
      changesJson,
      new Date(moment.tz(APP_TIMEZONE).format('YYYY-MM-DD HH:mm:ss')), // Use Chile timezone for consistent timestamp
    ]);

    console.log('[logUserAudit] ✅ Auditoría registrada exitosamente. ID:', auditId, 'action:', action);
  } catch (error) {
    console.error('[logUserAudit] Error logging audit:', error);
    console.error('[logUserAudit] Stack:', error instanceof Error ? error.stack : 'No stack');
    // No lanzar error para no interrumpir la operación principal
  }
}

/**
 * Create a new User with associated Person (if provided)
 * Usa transacción para garantizar atomicidad
 */
export const createUserWithPerson = async (input: CreateUserInput, auditUserId?: string): Promise<CreateUserResult> => {
  try {
    // Validations
    if (!input.userName?.trim()) {
      return { success: false, error: 'El nombre de usuario es requerido' };
    }

    if (!input.mail?.trim()) {
      return { success: false, error: 'El correo es requerido' };
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.mail)) {
      return { success: false, error: 'Formato de correo inválido' };
    }

    if (!input.password || input.password.length < 6) {
      return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' };
    }

    if (!Object.values(UserRole).includes(input.rol as UserRole)) {
      return { success: false, error: 'Rol de usuario inválido' };
    }

    // Usar el auditUserId pasado como parámetro (del lado del cliente)
    // Si no se proporciona, intentar obtener la sesión como fallback
    let userId = auditUserId;
    if (!userId) {
      const { userId: sessionUserId } = await getCurrentUserSession();
      userId = sessionUserId;
    }
    console.log('[createUserWithPerson] Audit userId:', userId);

    // TRANSACCIÓN: Iniciar (validaciones dentro de la transacción para evitar race conditions)
    const db = await getDb();
    const queryRunner = db.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      const userRepo = queryRunner.manager.getRepository(User);

      // Validaciones DENTRO de la transacción para evitar race conditions
      const existingUserName = await userRepo.findOne({
        where: { userName: input.userName }
      });

      if (existingUserName) {
        await queryRunner.rollbackTransaction();
        return { success: false, error: 'El nombre de usuario ya existe' };
      }

      const existingEmail = await userRepo.findOne({
        where: { mail: input.mail }
      });

      if (existingEmail) {
        await queryRunner.rollbackTransaction();
        return { success: false, error: 'El correo ya está registrado' };
      }

      // Create Person if personName or phone is provided
      let person: Person | null = null;

      if (input.personName?.trim() || input.phone?.trim()) {
        if (input.personName?.trim() && !input.personDni?.trim()) {
          await queryRunner.rollbackTransaction();
          return { success: false, error: 'El DNI es requerido cuando se proporciona nombre' };
        }

        person = new Person();
        if (input.personName?.trim()) {
          person.name = input.personName.trim();
          person.dni = input.personDni?.trim() || "";
        }
        person.phone = input.phone?.trim() || "";

        person = await queryRunner.manager.save(person);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 10);

      // Create User
      const user = new User();
      user.userName = input.userName.trim();
      user.mail = input.mail.trim();
      user.rol = input.rol as UserRole;
      user.pass = hashedPassword;
      
      if (person) {
        user.person = person;
      }

      const savedUser = await queryRunner.manager.save(user);

      // Asignar permisos por defecto según el rol
      let permissionsToAssign: Ability[] = [];
      if (savedUser.rol === UserRole.ADMIN) {
        permissionsToAssign = ALL_PERMISSIONS;
      } else if (savedUser.rol === UserRole.OPERATOR) {
        permissionsToAssign = DEFAULT_OPERATOR_PERMISSIONS;
      }

      if (permissionsToAssign.length > 0) {
        const permissionData = permissionsToAssign.map((ability) => ({
          userId: savedUser.id,
          ability: ability,
        }));
        await queryRunner.manager.insert(Permission, permissionData);
      }

      // Log audit with current user (dentro de la transacción)
      await logUserAudit(
        queryRunner.manager,
        savedUser.id,
        AuditActionType.CREATE,
        userId,
        undefined,
        {
          id: savedUser.id,
          userName: savedUser.userName,
          mail: savedUser.mail,
          phone: savedUser.person?.phone || "",
          rol: savedUser.rol,
        }
      );

      // TRANSACCIÓN: Commit
      await queryRunner.commitTransaction();

      // Revalidate users page
      revalidatePath('/home/users');

      return {
        success: true,
        message: 'Usuario creado exitosamente',
        data: {
          id: savedUser.id,
          userName: savedUser.userName,
          mail: savedUser.mail
        }
      };
    } catch (transactionError: any) {
      // TRANSACCIÓN: Rollback en caso de error
      await queryRunner.rollbackTransaction();
      // Log error de forma segura para evitar problemas de serialización circular
      const errorMessage = transactionError?.message || String(transactionError) || 'Error desconocido en la transacción';
      console.error('[createUserWithPerson] Transaction error:', errorMessage);
      await queryRunner.release();
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      // TRANSACCIÓN: Liberar query runner
      await queryRunner.release();
    }
  } catch (error: any) {
    // Log error de forma segura para evitar problemas de serialización circular
    const errorMessage = error?.message || 'Error al crear el usuario';
    console.error('[createUserWithPerson] Error:', errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Update an existing User with associated Person (if provided)
 * Usa transacción para garantizar atomicidad
 */
export const updateUserWithPerson = async (input: UpdateUserInput, auditUserId?: string): Promise<CreateUserResult> => {
  try {
    // Validations
    if (!input.id?.trim()) {
      return { success: false, error: 'El ID del usuario es requerido' };
    }

    if (!input.userName?.trim()) {
      return { success: false, error: 'El nombre de usuario es requerido' };
    }

    if (!input.mail?.trim()) {
      return { success: false, error: 'El correo es requerido' };
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.mail)) {
      return { success: false, error: 'Formato de correo inválido' };
    }

    if (!Object.values(UserRole).includes(input.rol as UserRole)) {
      return { success: false, error: 'Rol de usuario inválido' };
    }

    // Usar el auditUserId pasado como parámetro (del lado del cliente)
    // Si no se proporciona, intentar obtener la sesión como fallback
    let userId = auditUserId;
    if (!userId) {
      const { userId: sessionUserId } = await getCurrentUserSession();
      userId = sessionUserId;
    }
    console.log('[updateUserWithPerson] Audit userId:', userId);

    const db = await getDb();

    // TRANSACCIÓN: Iniciar
    const queryRunner = db.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      const userRepo = queryRunner.manager.getRepository(User);
      const personRepo = queryRunner.manager.getRepository(Person);

      // Get current user
      const currentUser = await userRepo.findOne({
        where: { id: input.id },
        relations: ['person']
      });

      if (!currentUser) {
        await queryRunner.rollbackTransaction();
        return { success: false, error: 'Usuario no encontrado' };
      }

      // Guardar valores antiguos ANTES de actualizar
      const oldUserValues = {
        id: currentUser.id,
        userName: currentUser.userName,
        mail: currentUser.mail,
        rol: currentUser.rol,
      };

      // Check if username already exists (excluding current user)
      const existingUserName = await userRepo.findOne({
        where: { userName: input.userName }
      });

      if (existingUserName && existingUserName.id !== input.id) {
        await queryRunner.rollbackTransaction();
        return { success: false, error: 'El nombre de usuario ya existe' };
      }

      // Check if email already exists (excluding current user)
      const existingEmail = await userRepo.findOne({
        where: { mail: input.mail }
      });

      if (existingEmail && existingEmail.id !== input.id) {
        await queryRunner.rollbackTransaction();
        return { success: false, error: 'El correo ya está registrado' };
      }

      // Update User fields
      currentUser.userName = input.userName.trim();
      currentUser.mail = input.mail.trim();
      currentUser.rol = input.rol as UserRole;

      // Handle Person update (including phone)
      if (input.personName?.trim() || input.phone?.trim()) {
        if (input.personName?.trim() && !input.personDni?.trim()) {
          await queryRunner.rollbackTransaction();
          return { success: false, error: 'El DNI es requerido cuando se proporciona nombre' };
        }

        if (currentUser.person) {
          // Update existing person
          if (input.personName?.trim()) {
            currentUser.person.name = input.personName.trim();
            currentUser.person.dni = input.personDni?.trim() || currentUser.person.dni;
          }
          currentUser.person.phone = input.phone?.trim() || "";
          await queryRunner.manager.save(currentUser.person);
        } else {
          // Create new person
          const newPerson = new Person();
          if (input.personName?.trim()) {
            newPerson.name = input.personName.trim();
            newPerson.dni = input.personDni?.trim() || "";
          }
          newPerson.phone = input.phone?.trim() || "";
          const savedPerson = await queryRunner.manager.save(newPerson);
          currentUser.person = savedPerson;
        }
      } else {
        // Desvincular person sin eliminarlo (para mantener integridad referencial)
        // Si desvinculamos, puede haber otros Users vinculados a la misma Person
        if (currentUser.person) {
          currentUser.person = null as any;
        }
      }

      // Save updated user
      const updatedUser = await queryRunner.manager.save(currentUser);

      // Log audit with current user (dentro de la transacción)
      await logUserAudit(
        queryRunner.manager,
        updatedUser.id,
        AuditActionType.UPDATE,
        userId,
        oldUserValues,
        {
          id: updatedUser.id,
          userName: updatedUser.userName,
          mail: updatedUser.mail,
          phone: updatedUser.person?.phone || "",
          rol: updatedUser.rol,
        }
      );

      // TRANSACCIÓN: Commit
      await queryRunner.commitTransaction();

      // Revalidate users page
      revalidatePath('/home/users');

      return {
        success: true,
        message: 'Usuario actualizado exitosamente',
        data: {
          id: updatedUser.id,
          userName: updatedUser.userName,
          mail: updatedUser.mail
        }
      };
    } catch (transactionError: any) {
      // TRANSACCIÓN: Rollback en caso de error
      await queryRunner.rollbackTransaction();
      // Log error de forma segura para evitar problemas de serialización circular
      const errorMessage = transactionError?.message || String(transactionError) || 'Error desconocido en la transacción';
      console.error('[updateUserWithPerson] Transaction error:', errorMessage);
      await queryRunner.release();
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      // TRANSACCIÓN: Liberar query runner
      await queryRunner.release();
    }
  } catch (error: any) {
    // Log error de forma segura para evitar problemas de serialización circular
    const errorMessage = error?.message || 'Error al actualizar el usuario';
    console.error('[updateUserWithPerson] Error:', errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * @deprecated Usar createUserWithPerson() en su lugar para auditoría automática
 * Esta función NO registra auditoría
 */
export async function createUser(data: Partial<User>) {
  console.warn('[createUser] Esta función está deprecated. Usar createUserWithPerson() para auditoría automática.');
  const db = await getDb();
  const userRepo = db.getRepository(User);
  const user = userRepo.create(data);
  return await userRepo.save(user);
}

export async function getUsers(search?: string) {
  try {
    const db = await getDb();
    const userRepo = db.getRepository(User);
    
    let users;
    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      users = await userRepo.createQueryBuilder('user')
        .leftJoinAndSelect('user.person', 'person')
        .where('LOWER(user.userName) LIKE :search', { search: `%${searchLower}%` })
        .orWhere('LOWER(user.mail) LIKE :search', { search: `%${searchLower}%` })
        .getMany();
    } else {
      users = await userRepo.find({ relations: ['person'] });
    }
    
    // Mapear a objetos planos sin prototipos
    // IMPORTANTE: El campo 'pass' (contraseña hasheada) NUNCA se incluye en la respuesta
    // Esto previene exposición accidental de datos sensibles al frontend
    return users.map(user => ({
      id: String(user.id),
      userName: String(user.userName),
      mail: String(user.mail),
      phone: typeof user.person?.phone === 'string' ? user.person.phone : undefined,
      rol: String(user.rol),
      person: user.person ? {
        name: user.person.name ? String(user.person.name) : undefined,
        dni: user.person.dni ? String(user.person.dni) : undefined,
      } : undefined,
      // NOTA: 'pass' no se incluye en el mapeo - seguridad por diseño
    }));
  } catch (error) {
    console.error('[getUsers] Error:', error);
    return [];
  }
}

export async function getUserById(id: string) {
  try {
    const db = await getDb();
    const userRepo = db.getRepository(User);
    const user = await userRepo.findOne({ 
      where: { id }, 
      relations: ['person'] 
    });
    
    if (!user) {
      return null;
    }
    
    // Mapear a objeto plano sin prototipos
    // IMPORTANTE: El campo 'pass' (contraseña hasheada) NUNCA se incluye en la respuesta
    // Esto previene exposición accidental de datos sensibles al frontend
    return {
      id: String(user.id),
      userName: String(user.userName),
      mail: String(user.mail),
      phone: typeof user.person?.phone === 'string' ? user.person.phone : undefined,
      rol: String(user.rol),
      person: user.person ? {
        name: user.person.name ? String(user.person.name) : undefined,
        dni: user.person.dni ? String(user.person.dni) : undefined,
      } : undefined,
      // NOTA: 'pass' no se incluye en el mapeo - seguridad por diseño
    };
  } catch (error) {
    console.error('[getUserById] Error:', error);
    return null;
  }
}


/**
 * @deprecated Usar updateUserWithPerson() en su lugar para auditoría automática
 * Esta función NO registra auditoría
 * 
 * IMPORTANTE: Retorna entidad completa (incluyendo password) - usar con cuidado
 */
export async function updateUser(id: string, data: Partial<User>) {
  console.warn('[updateUser] Esta función está deprecated. Usar updateUserWithPerson() para auditoría automática.');
  const db = await getDb();
  const userRepo = db.getRepository(User);
  await userRepo.update(id, data);
  const updated = await userRepo.findOne({ where: { id: id }, relations: ['person'] });
  // IMPORTANTE: Aquí retornamos la entidad completa, que puede contener password
  // Si la usas, asegúrate de mapear correctamente en el cliente
  return updated;
}

/**
 * DELETE - Eliminar usuario con auditoría y transacción
 * Usa soft delete automáticamente si está configurado
 */
export async function deleteUser(id: string, auditUserId?: string): Promise<CreateUserResult> {
  try {
    console.log('[deleteUser] Iniciando eliminación de usuario:', id);
    
    // Usar el auditUserId pasado como parámetro (del lado del cliente)
    // Si no se proporciona, intentar obtener la sesión como fallback
    let userId = auditUserId;
    if (!userId) {
      const { userId: sessionUserId } = await getCurrentUserSession();
      userId = sessionUserId;
    }
    console.log('[deleteUser] Audit userId:', userId);

    const db = await getDb();

    // TRANSACCIÓN: Iniciar
    const queryRunner = db.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      const userRepo = queryRunner.manager.getRepository(User);
      
      // Obtener el usuario primero
      const user = await userRepo.findOne({
        where: { id }
      });
      
      if (!user) {
        await queryRunner.rollbackTransaction();
        console.log('[deleteUser] Usuario no encontrado:', id);
        return { success: false, error: 'Usuario no encontrado' };
      }
      
      // Guardar valores para auditoría antes de eliminar
      const oldValues = {
        id: user.id,
        userName: user.userName,
        mail: user.mail,
        phone: user.person?.phone,
        rol: user.rol,
      };

      console.log('[deleteUser] Eliminando usuario:', user.userName);
      
      // Usar softRemove para respetar el soft delete
      await queryRunner.manager.softRemove(user);

      console.log('[deleteUser] Usuario eliminado. Registrando auditoría...');
      
      // Log audit para la eliminación (dentro de la transacción)
      await logUserAudit(
        queryRunner.manager,
        id,
        AuditActionType.DELETE,
        userId,
        oldValues,
        undefined
      );

      console.log('[deleteUser] Haciendo commit de la transacción');
      
      // TRANSACCIÓN: Commit
      await queryRunner.commitTransaction();

      console.log('[deleteUser] Transacción completada exitosamente');
      
      return { success: true, message: 'Usuario eliminado exitosamente' };
    } catch (transactionError: any) {
      // TRANSACCIÓN: Rollback en caso de error
      const errorMessage = transactionError?.message || String(transactionError) || 'Error desconocido en la transacción';
      console.error('[deleteUser] Error en transacción, haciendo rollback:', errorMessage);
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      return { success: false, error: errorMessage };
    } finally {
      // TRANSACCIÓN: Liberar query runner
      await queryRunner.release();
    }
  } catch (error: any) {
    const errorMessage = error?.message || 'Error al eliminar el usuario';
    console.error('[deleteUser] Error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

export interface UpdatePasswordInput {
  userId: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Update user password with audit logging
 * Validates current password before allowing change
 */
export const updateUserPassword = async (input: UpdatePasswordInput, auditUserId?: string): Promise<CreateUserResult> => {
  const db = await getDb();
  const queryRunner = db.createQueryRunner();

  try {
    // Validations
    if (!input.userId?.trim()) {
      return { success: false, error: 'El ID del usuario es requerido' };
    }

    if (!input.currentPassword?.trim()) {
      return { success: false, error: 'La contraseña actual es requerida' };
    }

    if (!input.newPassword || input.newPassword.length < 6) {
      return { success: false, error: 'La nueva contraseña debe tener al menos 6 caracteres' };
    }

    if (input.newPassword !== input.confirmPassword) {
      return { success: false, error: 'Las contraseñas no coinciden' };
    }

    if (input.newPassword === input.currentPassword) {
      return { success: false, error: 'La nueva contraseña debe ser diferente a la actual' };
    }

    // Usar el auditUserId pasado como parámetro (del lado del cliente)
    // Si no se proporciona, intentar obtener la sesión como fallback
    let userId = auditUserId;
    if (!userId) {
      const { userId: sessionUserId } = await getCurrentUserSession();
      userId = sessionUserId;
    }
    console.log('[updateUserPassword] Audit userId:', userId);

    // Iniciar transacción
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      const userRepo = queryRunner.manager.getRepository(User);

      // Get current user
      const user = await userRepo.findOne({
        where: { id: input.userId }
      });

      if (!user) {
        await queryRunner.rollbackTransaction();
        return { success: false, error: 'Usuario no encontrado' };
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(input.currentPassword, user.pass);

      if (!isPasswordValid) {
        // Log failed password change attempt
        await logUserAudit(
          queryRunner.manager,
          user.id,
          AuditActionType.UPDATE_PASSWORD,
          userId,
          undefined,
          { reason: 'Contraseña actual incorrecta' }
        );

        await queryRunner.rollbackTransaction();
        return { success: false, error: 'La contraseña actual es incorrecta' };
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(input.newPassword, 10);

      // Update password
      user.pass = hashedPassword;
      const updatedUser = await queryRunner.manager.save(user);

      // Log successful password change con información relevante
      await logUserAudit(
        queryRunner.manager,
        updatedUser.id,
        AuditActionType.UPDATE_PASSWORD,
        userId,
        undefined,
        {
          userName: updatedUser.userName,
          passwordChanged: true,
          timestamp: new Date().toISOString(),
        }
      );

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Contraseña actualizada exitosamente'
      };
    } catch (transactionError: any) {
      await queryRunner.rollbackTransaction();
      // Log error de forma segura para evitar problemas de serialización circular
      const errorMessage = transactionError?.message || String(transactionError) || 'Error desconocido en la transacción';
      console.error('[updateUserPassword] Transaction error:', errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  } catch (error: any) {
    // Log error de forma segura para evitar problemas de serialización circular
    const errorMessage = error?.message || 'Error al actualizar la contraseña';
    console.error('[updateUserPassword] Error:', errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  } finally {
    await queryRunner.release();
  }
};
