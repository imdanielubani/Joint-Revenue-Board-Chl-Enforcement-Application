import { randomUUID } from 'node:crypto';

import type { Persistence, Repositories } from '../../src/database/persistence.js';
import type { AuditRepository } from '../../src/modules/audit/audit.repository.js';
import type { AuditEventRecord } from '../../src/modules/audit/audit.types.js';
import type {
  SessionRecord,
  SessionRepository,
} from '../../src/modules/auth/session.repository.js';

/**
 * In-memory test double for the repositories, with the same contract as the
 * Prisma ones: append-only audit, conditional rotation, and transactions that
 * roll back on error. The database tests check the real implementations.
 */
export class MemoryPersistence implements Persistence {
  sessionRows = new Map<string, SessionRecord>();
  auditRows: AuditEventRecord[] = [];
  /** Test control: make the next audit append fail, to test rollback. */
  failNextAuditAppend = false;

  readonly sessions: SessionRepository = {
    create: async (s) => {
      const record: SessionRecord = {
        ...s,
        id: randomUUID(),
        principalId: s.principal.id,
        createdAt: new Date(),
        refreshedAt: null,
        revokedAt: null,
        revokedReason: null,
      };
      if ([...this.sessionRows.values()].some((r) => r.accessTokenHash === s.accessTokenHash)) {
        throw new Error('unique violation');
      }
      this.sessionRows.set(record.id, record);
      return structuredClone(record);
    },
    findByAccessHash: async (hash) =>
      structuredClone(
        [...this.sessionRows.values()].find((r) => r.accessTokenHash === hash) ?? null,
      ),
    findByRefreshHash: async (hash) =>
      structuredClone(
        [...this.sessionRows.values()].find((r) => r.refreshTokenHash === hash) ?? null,
      ),
    rotate: async (id, expected, rotation) => {
      const row = this.sessionRows.get(id);
      if (!row || row.refreshTokenHash !== expected || row.revokedAt) return false;
      this.sessionRows.set(id, { ...row, ...rotation });
      return true;
    },
    revoke: async (id, reason, at) => {
      const row = this.sessionRows.get(id);
      if (row && !row.revokedAt) {
        this.sessionRows.set(id, { ...row, revokedAt: at, revokedReason: reason });
      }
    },
    revokeAllForPrincipal: async (principalId, reason, at) => {
      let count = 0;
      for (const row of this.sessionRows.values()) {
        if (row.principalId === principalId && !row.revokedAt) {
          this.sessionRows.set(row.id, { ...row, revokedAt: at, revokedReason: reason });
          count++;
        }
      }
      return count;
    },
  };

  readonly audit: AuditRepository = {
    append: async (event) => {
      if (this.failNextAuditAppend) {
        this.failNextAuditAppend = false;
        throw new Error('simulated audit storage failure');
      }
      const record: AuditEventRecord = { ...event, id: randomUUID(), occurredAt: new Date() };
      this.auditRows.push(record);
      return structuredClone(record);
    },
    list: async (q) =>
      [...this.auditRows]
        .filter(
          (e) =>
            (!q.action || e.action === q.action) &&
            (!q.actorId || e.actorId === q.actorId) &&
            (!q.outcome || e.outcome === q.outcome),
        )
        .reverse()
        .slice(0, q.limit),
  };

  async transaction<T>(work: (repositories: Repositories) => Promise<T>): Promise<T> {
    const sessions = new Map([...this.sessionRows].map(([k, v]) => [k, structuredClone(v)]));
    const audit = [...this.auditRows];
    try {
      return await work({ sessions: this.sessions, audit: this.audit });
    } catch (err) {
      this.sessionRows = sessions;
      this.auditRows = audit;
      throw err;
    }
  }

  /** Audit events of one action, oldest first. */
  events(action: string): AuditEventRecord[] {
    return this.auditRows.filter((e) => e.action === action);
  }
}
