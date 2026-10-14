import { ChlError } from '../../integrations/chl/chl.client.js';
import { AppError } from '../../shared/errors/app-error.js';
import { mayUseClient, type Client } from '../access-control/access-control.policy.js';
import { maskEmail } from '../audit/audit.redact.js';
import { hashToken, newToken } from './tokens.js';

import type { AuthContext, Principal, RequestContext } from './auth.types.js';
import type { SessionRecord } from './session.repository.js';
import type { Persistence } from '../../database/persistence.js';
import type { ChlAccount, ChlIdentityClient } from '../../integrations/chl/chl.identity.js';
import type { AuditService } from '../audit/audit.service.js';
import type { AuditActor } from '../audit/audit.types.js';

export interface AuthSettings {
  accessTokenTtlMinutes: number;
  sessionTtlHours: number;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  sessionExpiresAt: Date;
}

export interface SignedIn extends IssuedTokens {
  client: Client;
  principal: Principal;
}

/** A CHL failure is "unavailable" or "not configured", never a sign-in answer. */
function fromChlError(err: unknown): never {
  if (err instanceof ChlError) {
    throw new AppError(err.kind === 'not_configured' ? 'CHL_NOT_CONFIGURED' : 'CHL_UNAVAILABLE', {
      cause: err,
    });
  }
  throw err;
}

function toPrincipal(account: ChlAccount): Principal {
  const { id, name, email, role, organization, region, assignment, scope } = account;
  return { id, name, email, role, organization, region, assignment, scope };
}

const principalActor = (p: Principal): AuditActor => ({
  type: 'principal',
  id: p.id,
  role: p.role,
});

/**
 * Sign-in, refresh, sign-out and password reset (SRD §5; ADR-0010).
 *
 * CHL confirms who someone is; ITEIME issues its own opaque session tokens,
 * stored as hashes. A sign-in lasts at most `sessionTtlHours` (24, SRD §5.3)
 * however often it is refreshed. Each refresh re-checks the account with CHL,
 * so a deactivated account loses access at its next refresh at the latest.
 */
export class AuthService {
  constructor(
    private readonly identity: ChlIdentityClient,
    private readonly persistence: Persistence,
    private readonly audit: AuditService,
    private readonly settings: AuthSettings,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private issueTokens(sessionExpiresAt: Date) {
    const accessToken = newToken();
    const refreshToken = newToken();
    const accessUntil = new Date(
      this.now().getTime() + this.settings.accessTokenTtlMinutes * 60_000,
    );
    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: accessUntil < sessionExpiresAt ? accessUntil : sessionExpiresAt,
      sessionExpiresAt,
    };
  }

  async login(
    input: { email: string; password: string; client: Client },
    context: RequestContext,
  ): Promise<SignedIn> {
    const anonymous: AuditActor = { type: 'anonymous' };
    const attempt = { client: input.client, email: maskEmail(input.email) };

    let check;
    try {
      check = await this.identity.verifyCredentials(input.email, input.password);
    } catch (err) {
      await this.audit.record({
        actor: anonymous,
        action: 'auth.login',
        outcome: 'failure',
        context,
        details: { ...attempt, reason: 'chl_unavailable' },
      });
      return fromChlError(err);
    }

    if (check.result === 'invalid') {
      await this.audit.record({
        actor: anonymous,
        action: 'auth.login',
        outcome: 'failure',
        context,
        details: { ...attempt, reason: 'invalid_credentials' },
      });
      throw new AppError('INVALID_CREDENTIALS');
    }

    const principal = toPrincipal(check.account);
    if (check.account.status !== 'active') {
      await this.audit.record({
        actor: principalActor(principal),
        action: 'auth.login',
        outcome: 'denied',
        context,
        details: { ...attempt, reason: 'account_deactivated' },
      });
      throw new AppError('ACCOUNT_DEACTIVATED');
    }
    if (!mayUseClient(principal.role, input.client)) {
      await this.audit.record({
        actor: principalActor(principal),
        action: 'auth.login',
        outcome: 'denied',
        context,
        details: { ...attempt, reason: 'role_not_allowed_for_client' },
      });
      throw new AppError(
        input.client === 'mobile' ? 'AGENT_ACCESS_DENIED' : 'CLIENT_ACCESS_DENIED',
      );
    }

    const sessionExpiresAt = new Date(
      this.now().getTime() + this.settings.sessionTtlHours * 3_600_000,
    );
    const tokens = this.issueTokens(sessionExpiresAt);

    // The session and its "success" event are written together, or not at all.
    const session = await this.persistence.transaction(async (repos) => {
      const created = await repos.sessions.create({
        client: input.client,
        principal,
        accessTokenHash: hashToken(tokens.accessToken),
        refreshTokenHash: hashToken(tokens.refreshToken),
        accessExpiresAt: tokens.accessTokenExpiresAt,
        expiresAt: sessionExpiresAt,
      });
      await this.audit.record(
        {
          actor: principalActor(principal),
          action: 'auth.login',
          outcome: 'success',
          target: { type: 'session', id: created.id },
          context,
          details: { client: input.client },
        },
        repos.audit,
      );
      return created;
    });

    return { ...tokens, sessionExpiresAt: session.expiresAt, client: input.client, principal };
  }

  /** The caller of a request, or 401: unknown, revoked or expired tokens all end the session. */
  async authenticate(accessToken: string): Promise<AuthContext> {
    const session = await this.persistence.sessions.findByAccessHash(hashToken(accessToken));
    const now = this.now();
    if (
      !session ||
      session.revokedAt !== null ||
      session.accessExpiresAt <= now ||
      session.expiresAt <= now
    ) {
      throw new AppError('SESSION_EXPIRED');
    }
    return {
      sessionId: session.id,
      client: session.client,
      principal: session.principal,
      sessionExpiresAt: session.expiresAt,
    };
  }

  async refresh(refreshToken: string, context: RequestContext): Promise<IssuedTokens> {
    const presented = hashToken(refreshToken);
    const session = await this.persistence.sessions.findByRefreshHash(presented);
    const now = this.now();
    if (!session || session.revokedAt !== null || session.expiresAt <= now) {
      throw new AppError('SESSION_EXPIRED');
    }
    const actor = principalActor(session.principal);
    const target = { type: 'session', id: session.id };

    // Re-check the account with CHL. If CHL can't answer, refuse to extend the
    // session but keep it, so the app can retry (project decision on Q-CHL-3).
    let account: ChlAccount | null;
    try {
      account = await this.identity.getAccount(session.principalId);
    } catch (err) {
      await this.audit.record({
        actor,
        action: 'auth.refresh',
        outcome: 'failure',
        target,
        context,
        details: { reason: 'chl_unavailable' },
      });
      return fromChlError(err);
    }

    if (!account || account.status !== 'active') {
      await this.revokeAll(session, account ? 'account_deactivated' : 'account_not_found', context);
      throw new AppError('ACCOUNT_DEACTIVATED');
    }
    const principal = toPrincipal(account);
    if (!mayUseClient(principal.role, session.client)) {
      await this.revokeAll(session, 'role_not_allowed_for_client', context);
      throw new AppError(
        session.client === 'mobile' ? 'AGENT_ACCESS_DENIED' : 'CLIENT_ACCESS_DENIED',
      );
    }

    const tokens = this.issueTokens(session.expiresAt);
    const rotated = await this.persistence.transaction(async (repos) => {
      const ok = await repos.sessions.rotate(session.id, presented, {
        accessTokenHash: hashToken(tokens.accessToken),
        refreshTokenHash: hashToken(tokens.refreshToken),
        accessExpiresAt: tokens.accessTokenExpiresAt,
        principal,
        refreshedAt: now,
      });
      if (ok) {
        await this.audit.record(
          {
            actor: principalActor(principal),
            action: 'auth.refresh',
            outcome: 'success',
            target,
            context,
          },
          repos.audit,
        );
      }
      return ok;
    });
    // Another refresh with the same token won the race; this one is stale.
    if (!rotated) throw new AppError('SESSION_EXPIRED');
    return tokens;
  }

  private async revokeAll(session: SessionRecord, reason: string, context: RequestContext) {
    await this.persistence.transaction(async (repos) => {
      const count = await repos.sessions.revokeAllForPrincipal(
        session.principalId,
        reason,
        this.now(),
      );
      await this.audit.record(
        {
          actor: { type: 'system' },
          action: 'auth.session.revoke',
          outcome: 'success',
          target: { type: 'principal', id: session.principalId },
          context,
          details: { reason, sessionsRevoked: count },
        },
        repos.audit,
      );
    });
  }

  async logout(auth: AuthContext, context: RequestContext): Promise<void> {
    await this.persistence.transaction(async (repos) => {
      await repos.sessions.revoke(auth.sessionId, 'logout', this.now());
      await this.audit.record(
        {
          actor: principalActor(auth.principal),
          action: 'auth.logout',
          outcome: 'success',
          target: { type: 'session', id: auth.sessionId },
          context,
        },
        repos.audit,
      );
    });
  }

  /**
   * Hands over to CHL's password recovery (SRD §5.2). The answer never says
   * whether the account exists; only a CHL outage is reported.
   */
  async requestPasswordReset(email: string, context: RequestContext): Promise<void> {
    try {
      await this.identity.requestPasswordReset(email);
    } catch (err) {
      await this.audit.record({
        actor: { type: 'anonymous' },
        action: 'auth.password_reset.request',
        outcome: 'failure',
        context,
        details: { email: maskEmail(email), reason: 'chl_unavailable' },
      });
      return fromChlError(err);
    }
    await this.audit.record({
      actor: { type: 'anonymous' },
      action: 'auth.password_reset.request',
      outcome: 'success',
      context,
      details: { email: maskEmail(email) },
    });
  }
}
