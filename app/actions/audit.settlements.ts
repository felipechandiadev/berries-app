import { Audit } from '@/data/entities/Audit';
import { AuditActionType } from '@/data/entities/audit.types';
import moment from 'moment-timezone';
import type { EntityManager } from 'typeorm';

const APP_TIMEZONE = 'America/Santiago';

/**
 * Audit logging helper for settlements
 */
export async function logSettlementAudit(
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

    const fields: Record<string, any> = {};
    let changeCount = 0;

    if (oldValues && newValues) {
      for (const key in newValues) {
        if (oldValues[key] !== newValues[key]) {
          fields[key] = { oldValue: oldValues[key], newValue: newValues[key] };
          changeCount++;
        }
      }
    } else if (newValues && !oldValues) {
      for (const key in newValues) {
        fields[key] = { oldValue: null, newValue: newValues[key] };
        changeCount++;
      }
    } else if (oldValues && !newValues) {
      for (const key in oldValues) {
        fields[key] = { oldValue: oldValues[key], newValue: null };
        changeCount++;
      }
    }

    const audit = manager.create(Audit, {
      id: auditId,
      entityName: 'Settlement',
      entityId: entityId,
      userId: userId,
      action: action,
      description: `${action} settlement ${entityId}`,
      oldValues: oldValues,
      newValues: newValues,
      changes: changeCount > 0 ? fields : undefined,
      createdAt: new Date(moment.tz(APP_TIMEZONE).format('YYYY-MM-DD HH:mm:ss')),
    });

    await manager.save(Audit, audit);
  } catch (error) {
    console.error('[logSettlementAudit] Error:', error);
  }
}
