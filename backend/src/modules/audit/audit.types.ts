import type { RequestContext } from '../auth/auth.types.js';

/**
 * The audited actions. Add an action here before recording it, so the list
 * of what the audit trail contains stays reviewable in one place.
 */
export const auditActions = [
  'auth.login',
  'auth.refresh',
  'auth.logout',
  'auth.password_reset.request',
  'auth.session.revoke',
  'access.denied',
  'audit.read',
] as const;
export type AuditAction = (typeof auditActions)[number];

export const auditOutcomes = ['success', 'failure', 'denied'] as const;
export type AuditOutcome = (typeof auditOutcomes)[number];

export type AuditActor =
  | { type: 'principal'; id: string; role: string | null }
  | { type: 'anonymous' }
  | { type: 'system' };

export interface AuditInput {
  actor: AuditActor;
  action: AuditAction;
  outcome: AuditOutcome;
  target?: { type: string; id: string };
  context: RequestContext;
  /** Extra facts. Redacted before storage; never put secrets here anyway. */
  details?: Record<string, unknown>;
}

export interface AuditEventRecord {
  id: string;
  occurredAt: Date;
  actorType: AuditActor['type'];
  actorId: string | null;
  actorRole: string | null;
  action: string;
  outcome: AuditOutcome;
  targetType: string | null;
  targetId: string | null;
  requestId: string | null;
  ip: string | null;
  details: unknown;
}

export type NewAuditEvent = Omit<AuditEventRecord, 'id' | 'occurredAt'>;

export interface AuditQuery {
  limit: number;
  /** Return events strictly older than this position (newest first). */
  before?: { occurredAt: Date; id: string };
  action?: string;
  actorId?: string;
  outcome?: AuditOutcome;
  from?: Date;
  to?: Date;
}
