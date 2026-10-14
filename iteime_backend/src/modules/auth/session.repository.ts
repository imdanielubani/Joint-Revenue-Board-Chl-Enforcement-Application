import { onlyRow, type Queryable } from '../../database/pool.js';

/** A signed-in agent's session, as the rest of the backend sees it. */
export interface AgentSession {
  id: string;
  agentId: string;
  /** The ID on the agent's profile, e.g. "JRB-AG-0142". */
  agentCode: string | null;
  agentName: string;
  agentEmail: string;
  agentRole: string;
  organization: string | null;
  accessExpiresAt: Date;
  expiresAt: Date;
  chlAccessToken: string | null;
  chlRefreshToken: string | null;
}

export interface NewSession {
  agentId: string;
  agentCode?: string;
  agentName: string;
  agentEmail: string;
  agentRole: string;
  organization?: string;
  accessTokenHash: string;
  accessExpiresAt: Date;
  refreshTokenHash: string;
  expiresAt: Date;
  chlAccessToken?: string;
  chlRefreshToken?: string;
  device?: unknown;
  ip?: string;
}

interface SessionRow {
  id: string;
  agent_id: string;
  agent_code: string | null;
  agent_name: string;
  agent_email: string;
  agent_role: string;
  organization: string | null;
  access_expires_at: Date;
  expires_at: Date;
  chl_access_token: string | null;
  chl_refresh_token: string | null;
}

const columns = `id, agent_id, agent_code, agent_name, agent_email, agent_role, organization,
  access_expires_at, expires_at, chl_access_token, chl_refresh_token`;

function toSession(row: SessionRow): AgentSession {
  return {
    id: row.id,
    agentId: row.agent_id,
    agentCode: row.agent_code,
    agentName: row.agent_name,
    agentEmail: row.agent_email,
    agentRole: row.agent_role,
    organization: row.organization,
    accessExpiresAt: row.access_expires_at,
    expiresAt: row.expires_at,
    chlAccessToken: row.chl_access_token,
    chlRefreshToken: row.chl_refresh_token,
  };
}

export async function createSession(db: Queryable, session: NewSession): Promise<AgentSession> {
  const { rows } = await db.query<SessionRow>(
    `INSERT INTO agent_sessions (agent_id, agent_code, agent_name, agent_email, agent_role,
       organization, access_token_hash, access_expires_at, refresh_token_hash, expires_at,
       chl_access_token, chl_refresh_token, device, ip)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING ${columns}`,
    [
      session.agentId,
      session.agentCode ?? null,
      session.agentName,
      session.agentEmail,
      session.agentRole,
      session.organization ?? null,
      session.accessTokenHash,
      session.accessExpiresAt,
      session.refreshTokenHash,
      session.expiresAt,
      session.chlAccessToken ?? null,
      session.chlRefreshToken ?? null,
      session.device === undefined ? null : JSON.stringify(session.device),
      session.ip ?? null,
    ],
  );
  return toSession(onlyRow(rows));
}

/** The live session an access token belongs to, if it is still valid at [now]. */
export async function findByAccessToken(
  db: Queryable,
  accessTokenHash: string,
  now: Date,
): Promise<AgentSession | null> {
  const { rows } = await db.query<SessionRow>(
    `SELECT ${columns} FROM agent_sessions
     WHERE access_token_hash = $1 AND revoked_at IS NULL
       AND access_expires_at > $2 AND expires_at > $2`,
    [accessTokenHash, now],
  );
  return rows[0] ? toSession(rows[0]) : null;
}

/** The live session a refresh token belongs to, if the session hasn't ended at [now]. */
export async function findByRefreshToken(
  db: Queryable,
  refreshTokenHash: string,
  now: Date,
): Promise<AgentSession | null> {
  const { rows } = await db.query<SessionRow>(
    `SELECT ${columns} FROM agent_sessions
     WHERE refresh_token_hash = $1 AND revoked_at IS NULL AND expires_at > $2`,
    [refreshTokenHash, now],
  );
  return rows[0] ? toSession(rows[0]) : null;
}

/** Replaces both tokens, so the old refresh token stops working. */
export async function rotateTokens(
  db: Queryable,
  sessionId: string,
  tokens: { accessTokenHash: string; accessExpiresAt: Date; refreshTokenHash: string },
): Promise<void> {
  await db.query(
    `UPDATE agent_sessions
     SET access_token_hash = $2, access_expires_at = $3, refresh_token_hash = $4,
         last_seen_at = now()
     WHERE id = $1`,
    [sessionId, tokens.accessTokenHash, tokens.accessExpiresAt, tokens.refreshTokenHash],
  );
}

export async function touchSession(db: Queryable, sessionId: string): Promise<void> {
  await db.query('UPDATE agent_sessions SET last_seen_at = now() WHERE id = $1', [sessionId]);
}

/** Ends a session now. */
export async function revokeSession(
  db: Queryable,
  sessionId: string,
  reason: string,
): Promise<void> {
  await db.query(
    `UPDATE agent_sessions SET revoked_at = now(), revoked_reason = $2
     WHERE id = $1 AND revoked_at IS NULL`,
    [sessionId, reason],
  );
}

/** Ends every session an agent has (e.g. when the account is deactivated). */
export async function revokeAgentSessions(
  db: Queryable,
  agentId: string,
  reason: string,
): Promise<void> {
  await db.query(
    `UPDATE agent_sessions SET revoked_at = now(), revoked_reason = $2
     WHERE agent_id = $1 AND revoked_at IS NULL`,
    [agentId, reason],
  );
}
