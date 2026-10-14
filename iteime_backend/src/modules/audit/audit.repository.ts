import type { Queryable } from '../../database/pool.js';

export interface AuditEvent {
  agentId?: string | null;
  /** e.g. "auth.login". */
  action: string;
  /** e.g. "success", "invalidCredentials". */
  outcome: string;
  details?: Record<string, unknown>;
  ip?: string;
  requestId?: string;
}

/** Records an account or security event for administrators. Never throws. */
export async function recordAudit(db: Queryable, event: AuditEvent): Promise<void> {
  await db
    .query(
      `INSERT INTO audit_events (agent_id, action, outcome, details, ip, request_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        event.agentId ?? null,
        event.action,
        event.outcome,
        event.details ? JSON.stringify(event.details) : null,
        event.ip ?? null,
        event.requestId ?? null,
      ],
    )
    .catch(() => undefined);
}
