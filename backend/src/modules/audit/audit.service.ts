import { redact } from './audit.redact.js';

import type { AuditRepository } from './audit.repository.js';
import type { AuditEventRecord, AuditInput, AuditQuery } from './audit.types.js';

/**
 * Records security and business events in the append-only audit trail.
 *
 * Inside a transaction, pass the transaction's repository so the event is
 * written atomically with the change it describes: if the change rolls back,
 * so does its "success" event.
 *
 * Distinct from the operational log (pino): the audit trail answers "who did
 * what, when, with what outcome"; logs are for operating the service.
 */
export class AuditService {
  constructor(private readonly repository: AuditRepository) {}

  record(
    input: AuditInput,
    repository: AuditRepository = this.repository,
  ): Promise<AuditEventRecord> {
    const { actor } = input;
    return repository.append({
      actorType: actor.type,
      actorId: actor.type === 'principal' ? actor.id : null,
      actorRole: actor.type === 'principal' ? actor.role : null,
      action: input.action,
      outcome: input.outcome,
      targetType: input.target?.type ?? null,
      targetId: input.target?.id ?? null,
      requestId: input.context.requestId,
      ip: input.context.ip ?? null,
      details: input.details === undefined ? null : redact(input.details),
    });
  }

  list(query: AuditQuery): Promise<AuditEventRecord[]> {
    return this.repository.list(query);
  }
}
