import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

import { AppError } from '../../shared/errors/app-error.js';
import { validate, validated } from '../../shared/middleware/validate.js';
import { authenticate, authOf, requestContext } from './auth.middleware.js';
import { forgotPasswordSchema, loginSchema, principalView, refreshSchema } from './auth.schema.js';

import type { AuthService, IssuedTokens } from './auth.service.js';

/**
 * Sign-in attempts per IP per 15 minutes, for login and forgot-password.
 * The sources set no number; this is a conservative default (ADR-0010).
 */
export const authAttemptLimit = 10;

function tokensView(t: IssuedTokens) {
  return {
    accessToken: t.accessToken,
    refreshToken: t.refreshToken,
    accessTokenExpiresAt: t.accessTokenExpiresAt.toISOString(),
    sessionExpiresAt: t.sessionExpiresAt.toISOString(),
  };
}

/** `/api/v1/auth`: shared by every client; the session records which client signed in. */
export function authRouter(auth: AuthService): Router {
  const router = Router();
  const attempts = rateLimit({
    windowMs: 15 * 60_000,
    limit: authAttemptLimit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new AppError('RATE_LIMITED')),
  });

  router.post('/login', attempts, validate(loginSchema), async (req, res) => {
    const { body } = validated(res, loginSchema);
    const signedIn = await auth.login(body, requestContext(req));
    // The mobile app reads `agent` (its existing contract); other clients `user`.
    const profileKey = signedIn.client === 'mobile' ? 'agent' : 'user';
    res.json({ ...tokensView(signedIn), [profileKey]: principalView(signedIn.principal) });
  });

  router.post('/refresh', validate(refreshSchema), async (req, res) => {
    const { body } = validated(res, refreshSchema);
    res.json(tokensView(await auth.refresh(body.refreshToken, requestContext(req))));
  });

  router.post('/logout', authenticate(auth), async (req, res) => {
    await auth.logout(authOf(req), requestContext(req));
    res.status(204).end();
  });

  router.post('/forgot-password', attempts, validate(forgotPasswordSchema), async (req, res) => {
    const { body } = validated(res, forgotPasswordSchema);
    await auth.requestPasswordReset(body.email, requestContext(req));
    res.status(202).end();
  });

  return router;
}

/** `GET /api/v1/me`: the signed-in user, any client. */
export function meRouter(auth: AuthService): Router {
  const router = Router();
  router.get('/', authenticate(auth), (req, res) => {
    const { principal, client, sessionExpiresAt } = authOf(req);
    res.json({
      user: principalView(principal),
      client,
      sessionExpiresAt: sessionExpiresAt.toISOString(),
    });
  });
  return router;
}
