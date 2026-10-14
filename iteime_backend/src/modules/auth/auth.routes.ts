import { Router, type RequestHandler } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

import { parse } from '../../http/validate.js';
import { AppError } from '../../shared/errors.js';
import { forgotPasswordSchema, loginSchema, refreshSchema } from './auth.schemas.js';
import type { AuthService } from './auth.service.js';
import { metaOf, sessionOf } from './require-agent.middleware.js';

export interface LoginRateLimit {
  windowMs: number;
  /** Sign-in attempts allowed per IP address and email in each window. */
  limit: number;
}

/** POST /auth/login, /auth/refresh, /auth/forgot-password, /auth/logout; GET /me. */
export function authRoutes(dependencies: {
  auth: AuthService;
  signedIn: RequestHandler;
  loginRateLimit?: LoginRateLimit;
}): Router {
  const { auth, signedIn } = dependencies;
  const router = Router();
  const limiter = loginLimiter(
    dependencies.loginRateLimit ?? { windowMs: 15 * 60 * 1000, limit: 10 },
  );

  router.post('/auth/login', limiter, async (request, response) => {
    const body = parse(loginSchema, request.body);
    const { tokens, agent } = await auth.login(
      body.email,
      body.password,
      metaOf(request, body.device),
    );
    response.json({ ...tokens, agent });
  });

  router.post('/auth/refresh', async (request, response) => {
    const body = parse(refreshSchema, request.body);
    response.json(await auth.refresh(body.refreshToken, metaOf(request)));
  });

  router.post('/auth/forgot-password', limiter, async (request, response) => {
    const body = parse(forgotPasswordSchema, request.body);
    await auth.forgotPassword(body.email, metaOf(request));
    response.status(202).json({
      message: 'If an account exists for this email, a password reset link has been sent.',
    });
  });

  router.post('/auth/logout', signedIn, async (request, response) => {
    await auth.logout(sessionOf(response), metaOf(request));
    response.status(204).end();
  });

  router.get('/me', signedIn, async (_request, response) => {
    response.json({ agent: await auth.profile(sessionOf(response)) });
  });

  return router;
}

/** Slows down password guessing: attempts per IP address and email. */
function loginLimiter({ windowMs, limit }: LoginRateLimit): RequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (request) => {
      const email = String((request.body as { email?: unknown } | undefined)?.email ?? '');
      return `${ipKeyGenerator(request.ip ?? '')}|${email.trim().toLowerCase()}`;
    },
    handler: (_request, _response, next) => {
      next(
        new AppError(
          429,
          'TOO_MANY_ATTEMPTS',
          'Too many sign-in attempts. Please wait a few minutes and try again.',
        ),
      );
    },
  });
}
