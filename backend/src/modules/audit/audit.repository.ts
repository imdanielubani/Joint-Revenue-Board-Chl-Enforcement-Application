import type { AuditEventRecord, AuditOutcome, AuditQuery, NewAuditEvent } from './audit.types.js';
import type { Prisma } from '../../generated/prisma/client.js';

/** Append and read only: the audit trail has no update or delete (MON §12.4). */
export interface AuditRepository {
  append(event: NewAuditEvent): Promise<AuditEventRecord>;
  list(query: AuditQuery): Promise<AuditEventRecord[]>;
}

function toRecord(row: Prisma.AuditEventModel): AuditEventRecord {
  return {
    ...row,
    actorType: row.actorType as AuditEventRecord['actorType'],
    outcome: row.outcome as AuditOutcome,
  };
}

export class PrismaAuditRepository implements AuditRepository {
  constructor(private readonly db: Prisma.TransactionClient) {}

  async append(event: NewAuditEvent): Promise<AuditEventRecord> {
    const row = await this.db.auditEvent.create({
      data: {
        ...event,
        details:
          event.details === null || event.details === undefined
            ? undefined
            : (event.details as Prisma.InputJsonValue),
      },
    });
    return toRecord(row);
  }

  async list(q: AuditQuery): Promise<AuditEventRecord[]> {
    const rows = await this.db.auditEvent.findMany({
      where: {
        action: q.action,
        actorId: q.actorId,
        outcome: q.outcome,
        occurredAt: { gte: q.from, lte: q.to },
        ...(q.before
          ? {
              OR: [
                { occurredAt: { lt: q.before.occurredAt } },
                { occurredAt: q.before.occurredAt, id: { lt: q.before.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: q.limit,
    });
    return rows.map(toRecord);
  }
}
