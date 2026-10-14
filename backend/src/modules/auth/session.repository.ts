import type { Client } from '../access-control/access-control.policy.js';
import type { Principal } from './auth.types.js';
import type { Prisma } from '../../generated/prisma/client.js';

export interface SessionRecord {
  id: string;
  principalId: string;
  client: Client;
  principal: Principal;
  accessTokenHash: string;
  refreshTokenHash: string;
  accessExpiresAt: Date;
  expiresAt: Date;
  createdAt: Date;
  refreshedAt: Date | null;
  revokedAt: Date | null;
  revokedReason: string | null;
}

export type NewSession = Pick<
  SessionRecord,
  'client' | 'principal' | 'accessTokenHash' | 'refreshTokenHash' | 'accessExpiresAt' | 'expiresAt'
>;

export interface SessionRotation {
  accessTokenHash: string;
  refreshTokenHash: string;
  accessExpiresAt: Date;
  principal: Principal;
  refreshedAt: Date;
}

export interface SessionRepository {
  create(session: NewSession): Promise<SessionRecord>;
  findByAccessHash(hash: string): Promise<SessionRecord | null>;
  findByRefreshHash(hash: string): Promise<SessionRecord | null>;
  /**
   * Replaces the tokens, but only if the refresh token is still the one
   * presented: of two concurrent refreshes with the same token, one wins.
   */
  rotate(id: string, expectedRefreshHash: string, rotation: SessionRotation): Promise<boolean>;
  revoke(id: string, reason: string, at: Date): Promise<void>;
  /** Ends every active session of a CHL account, for example on deactivation. */
  revokeAllForPrincipal(principalId: string, reason: string, at: Date): Promise<number>;
}

type Row = Prisma.SessionModel;

function toRecord(row: Row): SessionRecord {
  return {
    ...row,
    client: row.client as Client,
    principal: row.principal as unknown as Principal,
  };
}

const json = (principal: Principal) => principal as unknown as Prisma.InputJsonValue;

export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly db: Prisma.TransactionClient) {}

  async create(session: NewSession): Promise<SessionRecord> {
    const row = await this.db.session.create({
      data: { ...session, principalId: session.principal.id, principal: json(session.principal) },
    });
    return toRecord(row);
  }

  async findByAccessHash(hash: string): Promise<SessionRecord | null> {
    const row = await this.db.session.findUnique({ where: { accessTokenHash: hash } });
    return row ? toRecord(row) : null;
  }

  async findByRefreshHash(hash: string): Promise<SessionRecord | null> {
    const row = await this.db.session.findUnique({ where: { refreshTokenHash: hash } });
    return row ? toRecord(row) : null;
  }

  async rotate(id: string, expectedRefreshHash: string, r: SessionRotation): Promise<boolean> {
    const { count } = await this.db.session.updateMany({
      where: { id, refreshTokenHash: expectedRefreshHash, revokedAt: null },
      data: { ...r, principal: json(r.principal) },
    });
    return count === 1;
  }

  async revoke(id: string, reason: string, at: Date): Promise<void> {
    await this.db.session.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: at, revokedReason: reason },
    });
  }

  async revokeAllForPrincipal(principalId: string, reason: string, at: Date): Promise<number> {
    const { count } = await this.db.session.updateMany({
      where: { principalId, revokedAt: null },
      data: { revokedAt: at, revokedReason: reason },
    });
    return count;
  }
}
