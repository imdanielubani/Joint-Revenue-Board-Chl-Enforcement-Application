import { PrismaAuditRepository, type AuditRepository } from '../modules/audit/audit.repository.js';
import {
  PrismaSessionRepository,
  type SessionRepository,
} from '../modules/auth/session.repository.js';
import { AppError } from '../shared/errors/app-error.js';

import type { Database } from './prisma.js';

export interface Repositories {
  sessions: SessionRepository;
  audit: AuditRepository;
}

/** The repositories, plus a way to use them atomically. */
export interface Persistence extends Repositories {
  /** Runs `work` in one database transaction; any error rolls everything back. */
  transaction<T>(work: (repositories: Repositories) => Promise<T>): Promise<T>;
}

export function prismaPersistence(db: Database): Persistence {
  return {
    sessions: new PrismaSessionRepository(db),
    audit: new PrismaAuditRepository(db),
    transaction: (work) =>
      db.$transaction((tx) =>
        work({ sessions: new PrismaSessionRepository(tx), audit: new PrismaAuditRepository(tx) }),
      ),
  };
}

/**
 * Used when DATABASE_URL isn't set (development only; production requires
 * it). Every call fails with 503, and readiness already reports the database
 * as not configured.
 */
export function unconfiguredPersistence(): Persistence {
  const fail = () => Promise.reject(new AppError('SERVICE_UNAVAILABLE'));
  const repositories: Repositories = {
    sessions: {
      create: fail,
      findByAccessHash: fail,
      findByRefreshHash: fail,
      rotate: fail,
      revoke: fail,
      revokeAllForPrincipal: fail,
    },
    audit: { append: fail, list: fail },
  };
  return { ...repositories, transaction: fail };
}
