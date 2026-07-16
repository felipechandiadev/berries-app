// Server Actions para CRUD de la entidad Person
'use server';

import { Person, PersonBankAccount } from '../../data/entities/Person';
import { getDb } from '../../data/db';
import { AuditActionType } from '../../data/entities/audit.types';
import { logPersonAudit } from './audit.persons';
import { getCurrentUserSession } from './auth.server';

/**
 * Convierte una entidad Person a un objeto plano serializable
 */
function serializePerson(person: Person): any {
  return JSON.parse(JSON.stringify({
    id: person.id,
    name: person.name,
    dni: person.dni,
    phone: typeof person.phone === 'string' ? person.phone : undefined,
    mail: typeof person.mail === 'string' ? person.mail : undefined,
    address: typeof person.address === 'string' ? person.address : undefined,
    bankAccounts: person.bankAccounts,
    createdAt: person.createdAt,
    updatedAt: person.updatedAt,
    deletedAt: person.deletedAt,
  }));
}

export interface PersonCreateInput {
  name: string;
  dni?: string;
  mail?: string;
  phone?: string;
  address?: string;
}

export interface PersonUpdateInput {
  name?: string;
  dni?: string;
  mail?: string;
  phone?: string;
  address?: string;
}

export interface PersonResult {
  success: boolean;
  message?: string;
  data?: Person | Person[] | null;
  error?: string;
}

/**
 * CREATE - Crear una nueva persona
 * @param data Datos parciales de Person (name, dni)
 * @returns Persona creada con ID
 */
export async function createPerson(data: PersonCreateInput): Promise<PersonResult> {
  try {
    // Validaciones
    if (!data.name?.trim()) {
      return { success: false, error: 'El nombre es requerido' };
    }

    const db = await getDb();
    const repo = db.getRepository(Person);

    const person = repo.create({
      name: data.name.trim(),
      dni: data.dni?.trim() || undefined,
      mail: data.mail?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      address: data.address?.trim() || undefined,
    });

    const saved = await repo.save(person);

    return {
      success: true,
      message: 'Persona creada exitosamente',
      data: serializePerson(saved),
    };
  } catch (error: any) {
    console.error('[createPerson] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al crear la persona',
    };
  }
}

/**
 * READ - Obtener todas las personas
 * @returns Array de personas
 */
export async function getPersons(): Promise<PersonResult> {
  try {
    const db = await getDb();
    const persons = await db.getRepository(Person).find();

    return {
      success: true,
      data: persons,
    };
  } catch (error: any) {
    console.error('[getPersons] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al obtener personas',
      data: [],
    };
  }
}

/**
 * READ - Obtener una persona por ID
 * @param id ID de la persona (UUID)
 * @returns Persona encontrada o null
 */
export async function getPersonById(id: string): Promise<PersonResult> {
  try {
    if (!id?.trim()) {
      return { success: false, error: 'ID inválido', data: null };
    }

    const db = await getDb();
    const person = await db.getRepository(Person).findOne({ where: { id } });

    if (!person) {
      return { success: false, error: 'Persona no encontrada', data: null };
    }

    return {
      success: true,
      data: person,
    };
  } catch (error: any) {
    console.error('[getPersonById] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al obtener la persona',
      data: null,
    };
  }
}

/**
 * UPDATE - Actualizar una persona
 * @param id ID de la persona (UUID)
 * @param data Datos a actualizar
 * @returns Persona actualizada
 */
export async function updatePerson(id: string, data: PersonUpdateInput, auditUserId?: string): Promise<PersonResult> {
  try {
    // Validaciones
    if (!id?.trim()) {
      return { success: false, error: 'ID inválido' };
    }

    if (!data.name?.trim() && !data.dni?.trim()) {
      return { success: false, error: 'Debe proporcionar al menos un campo para actualizar' };
    }

    const db = await getDb();
    const repo = db.getRepository(Person);

    // Verificar que la persona existe
    const existingPerson = await repo.findOne({ where: { id } });
    if (!existingPerson) {
      return { success: false, error: 'Persona no encontrada' };
    }

    // Preparar datos a actualizar (sin campos vacíos)
    const updateData: Partial<Person> = {};
    if (data.name?.trim()) {
      updateData.name = data.name.trim();
    }
    if (data.dni?.trim()) {
      updateData.dni = data.dni.trim();
    }
    if (data.mail !== undefined) {
      updateData.mail = data.mail?.trim() || undefined;
    }
    if (data.phone !== undefined) {
      updateData.phone = data.phone?.trim() || undefined;
    }
    if (data.address !== undefined) {
      updateData.address = data.address?.trim() || undefined;
    }

    // Guardar valores antiguos para auditoría
    const oldValues = {
      name: existingPerson.name,
      dni: existingPerson.dni,
      mail: existingPerson.mail,
      phone: existingPerson.phone,
      address: existingPerson.address,
    };

    // Actualizar y auditar en transacción
    let userId = auditUserId;
    if (!userId) {
      try {
        const { userId: sessionUserId } = await getCurrentUserSession();
        userId = sessionUserId;
      } catch (error) {
        userId = undefined;
      }
    }

    let updated: Person | null = null;
    await db.transaction(async (manager) => {
      await manager.update(Person, id, updateData);
      updated = await manager.findOne(Person, { where: { id } });
      await logPersonAudit(
        manager,
        id,
        AuditActionType.UPDATE,
        userId,
        oldValues,
        updateData
      );
    });

    return {
      success: true,
      message: 'Persona actualizada exitosamente',
      data: updated ? serializePerson(updated) : null,
    };
  } catch (error: any) {
    console.error('[updatePerson] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al actualizar la persona',
    };
  }
}

/**
 * DELETE - Eliminar una persona
 * Nota: Si la persona tiene soft delete enabled, se marcará como eliminada
 * @param id ID de la persona (UUID)
 * @returns Persona eliminada
 */
export async function deletePerson(id: string): Promise<PersonResult> {
  try {
    // Validaciones
    if (!id?.trim()) {
      return { success: false, error: 'ID inválido' };
    }

    const db = await getDb();
    const repo = db.getRepository(Person);

    // Obtener la persona antes de eliminarla (para retornarla)
    const person = await repo.findOne({ where: { id } });
    if (!person) {
      return { success: false, error: 'Persona no encontrada' };
    }

    // Usar softRemove si está disponible, de lo contrario delete
    if (repo.softRemove) {
      await repo.softRemove(person);
    } else {
      await repo.delete(id);
    }

    return {
      success: true,
      message: 'Persona eliminada exitosamente',
      data: person,
    };
  } catch (error: any) {
    console.error('[deletePerson] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al eliminar la persona',
    };
  }
}

/**
 * UPDATE - Actualizar cuentas bancarias de una persona
 * @param personId ID de la persona (UUID)
 * @param bankAccounts Nuevas cuentas bancarias
 * @returns Resultado de la operación
 */
export async function updatePersonBankAccounts(personId: string, bankAccounts: PersonBankAccount[]): Promise<PersonResult> {
  try {
    if (!personId?.trim()) {
      return { success: false, error: 'ID de persona inválido' };
    }

    const db = await getDb();
    const repo = db.getRepository(Person);

    const person = await repo.findOne({ where: { id: personId } });
    if (!person) {
      return { success: false, error: 'Persona no encontrada' };
    }

    const oldValues = { bankAccounts: person.bankAccounts };
    
    let userId: string | undefined;
    try {
      const session = await getCurrentUserSession();
      userId = session.userId;
    } catch (e) {}

    await db.transaction(async (manager) => {
      await manager.update(Person, personId, { bankAccounts });
      await logPersonAudit(
        manager,
        personId,
        AuditActionType.UPDATE,
        userId,
        oldValues,
        { bankAccounts }
      );
    });

    return {
      success: true,
      message: 'Cuentas bancarias actualizadas exitosamente',
    };
  } catch (error: any) {
    console.error('[updatePersonBankAccounts] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al actualizar cuentas bancarias',
    };
  }
}
