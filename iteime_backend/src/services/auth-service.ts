import type { Logger } from 'pino';

import type { ChlAdapter } from '../chl/adapter.js';
import {
  ChlAccountDeactivatedError,
  ChlInvalidCredentialsError,
  ChlUnavailableError,
} from '../chl/errors.js';
import type { ChlAgent } from '../chl/types.js';
import type { Config } from '../config/env.js';
import type { Database } from '../db/pool.js';
import { AppError } from '../lib/errors.js';
import { hashToken, newToken } from '../lib/tokens.js';
import { recordAudit } from '../repositories/audit.js';
import {
  createSession,
  findByAccessToken,
  findByRefreshToken,
  revokeAgentSessions,
  revokeSession,
  rotateTokens,
  type AgentSession,
} from '../repositories/sessions.js';

/** Who made a request, for the audit trail. */
export interface RequestMeta {
  ip?: string;
  requestId?: string;
  device?: unknown;
}

/** The tokens the app keeps after signing in or refreshing. */
export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  /** When the access token stops working; refresh before then. */
  accessTokenExpiresAt: Date;
  /** When the sign-in ends for good (at most 24 hours after signing in). */
  sessionExpiresAt: Date;
}

/** The signed-in agent, as the app shows them. */
export interface AgentProfile {
  id: string | null;
  name: string;
  email: string;
  role: string;
  organization: string | null;
  region: string | null;
  assignment: string | null;
  scope: ChlAgent['scope'] | null;
}

/** Only enforcement agents may use the mobile app (SRD §4.1). */
export function isEnforcementAgent(role: string): boolean {
  return (
    role
      .trim()
      .toUpperCase()
      .replace(/[^A-Z]+/g, '_') === 'ENFORCEMENT_AGENT'
  );
}

export function agentProfile(agent: ChlAgent): AgentProfile {
  return {
    id: agent.agentId ?? null,
    name: agent.name,
    email: agent.email,
    role: agent.role,
    organization: agent.organization ?? null,
    region: agent.region ?? null,
    assignment: agent.assignment ?? null,
    scope: agent.scope ?? null,
  };
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/**
 * Agent sign-in with existing CHL credentials, and the sessions that follow
 * (SRD §5): access tokens refreshed by the app, every session ending within
 * 24 hours, and access ended when CHL reports the account deactivated.
 */
export class AuthService {
  constructor(
    private readonly dependencies: {
      database: Database;
      chl: ChlAdapter;
      logger: Logger;
      now: () => Date;
      session: Config['session'];
    },
  ) {}

  async login(
    email: string,
    password: string,
    meta: RequestMeta,
  ): Promise<{ tokens: IssuedTokens; agent: AgentProfile }> {
    const { database, chl, now } = this.dependencies;
    const audit = (outcome: string, agentId?: string) =>
      recordAudit(database, {
        agentId,
        action: 'auth.login',
        outcome,
        details: { email: email.trim().toLowerCase() },
        ip: meta.ip,
        requestId: meta.requestId,
      });

    let signIn;
    try {
      signIn = await chl.signIn(email, password);
    } catch (error) {
      if (error instanceof ChlInvalidCredentialsError) await audit('invalidCredentials');
      if (error instanceof ChlAccountDeactivatedError) await audit('accountDeactivated');
      throw error;
    }

    const { agent, session: chlSession } = signIn;
    if (!isEnforcementAgent(agent.role)) {
      await audit('notAnAgent', agent.id);
      // The CHL session isn't needed; end it, but don't fail if CHL can't.
      await chl.signOut(chlSession.accessToken).catch(() => undefined);
      throw new AppError(
        403,
        'AGENT_ACCESS_DENIED',
        'Only enforcement agents can use the mobile app.',
      );
    }

    const issuedAt = now();
    const sessionExpiresAt = new Date(
      Math.min(
        issuedAt.getTime() + this.dependencies.session.sessionTtlHours * HOUR,
        chlSession.expiresAt.getTime(),
      ),
    );
    const tokens = this.newTokens(issuedAt, sessionExpiresAt);
    await createSession(database, {
      agentId: agent.id,
      agentCode: agent.agentId,
      agentName: agent.name,
      agentEmail: agent.email,
      agentRole: agent.role,
      organization: agent.organization,
      accessTokenHash: hashToken(tokens.accessToken),
      accessExpiresAt: tokens.accessTokenExpiresAt,
      refreshTokenHash: hashToken(tokens.refreshToken),
      expiresAt: sessionExpiresAt,
      chlAccessToken: chlSession.accessToken,
      chlRefreshToken: chlSession.refreshToken,
      device: meta.device,
      ip: meta.ip,
    });
    await audit('success', agent.id);
    return { tokens, agent: agentProfile(agent) };
  }

  /**
   * New tokens for a refresh token, which then stops working. Checks with
   * CHL that the account is still active; if CHL can't be reached, the agent
   * stays signed in (field work goes on) and the check is retried next time.
   */
  async refresh(refreshToken: string, meta: RequestMeta): Promise<IssuedTokens> {
    const { database, chl, logger, now } = this.dependencies;
    const session = await findByRefreshToken(database, hashToken(refreshToken), now());
    if (!session) throw sessionExpired();

    try {
      if ((await chl.getAccountStatus(session.agentId)) === 'deactivated') {
        await revokeAgentSessions(database, session.agentId, 'deactivated');
        await recordAudit(database, {
          agentId: session.agentId,
          action: 'auth.refresh',
          outcome: 'accountDeactivated',
          ip: meta.ip,
          requestId: meta.requestId,
        });
        throw new ChlAccountDeactivatedError();
      }
    } catch (error) {
      if (!(error instanceof ChlUnavailableError)) throw error;
      logger.warn({ agentId: session.agentId }, 'CHL unavailable; account status not checked');
    }

    const tokens = this.newTokens(now(), session.expiresAt);
    await rotateTokens(database, session.id, {
      accessTokenHash: hashToken(tokens.accessToken),
      accessExpiresAt: tokens.accessTokenExpiresAt,
      refreshTokenHash: hashToken(tokens.refreshToken),
    });
    return tokens;
  }

  /** The session behind an access token; throws 401 if it is no longer valid. */
  async authenticate(accessToken: string): Promise<AgentSession> {
    const { database, now } = this.dependencies;
    const session = await findByAccessToken(database, hashToken(accessToken), now());
    if (!session) throw sessionExpired();
    return session;
  }

  /** Ends the session here and, as far as possible, in CHL. */
  async logout(session: AgentSession, meta: RequestMeta): Promise<void> {
    const { database, chl, logger } = this.dependencies;
    await revokeSession(database, session.id, 'logout');
    if (session.chlAccessToken) {
      await chl.signOut(session.chlAccessToken).catch((error: unknown) => {
        logger.warn({ err: error, agentId: session.agentId }, 'CHL sign-out failed');
      });
    }
    await recordAudit(database, {
      agentId: session.agentId,
      action: 'auth.logout',
      outcome: 'success',
      ip: meta.ip,
      requestId: meta.requestId,
    });
  }

  /** Asks CHL to send a reset link; says the same whether or not the email exists. */
  async forgotPassword(email: string, meta: RequestMeta): Promise<void> {
    await this.dependencies.chl.requestPasswordReset(email);
    await recordAudit(this.dependencies.database, {
      action: 'auth.forgotPassword',
      outcome: 'requested',
      details: { email: email.trim().toLowerCase() },
      ip: meta.ip,
      requestId: meta.requestId,
    });
  }

  /** The signed-in agent's profile, fresh from CHL. */
  async profile(session: AgentSession): Promise<AgentProfile> {
    return agentProfile(await this.dependencies.chl.getAgent(session.agentId));
  }

  private newTokens(issuedAt: Date, sessionExpiresAt: Date): IssuedTokens {
    const accessTokenExpiresAt = new Date(
      Math.min(
        issuedAt.getTime() + this.dependencies.session.accessTokenTtlMinutes * MINUTE,
        sessionExpiresAt.getTime(),
      ),
    );
    return {
      accessToken: newToken(),
      refreshToken: newToken(),
      accessTokenExpiresAt,
      sessionExpiresAt,
    };
  }
}

function sessionExpired(): AppError {
  return new AppError(401, 'SESSION_EXPIRED', 'Your session has ended. Please sign in again.');
}
