import { AppError } from '../../shared/errors/app-error.js';

import type { AuthService } from './auth.service.js';
import type { AuthContext, RequestContext } from './auth.types.js';
import type { Request, RequestHandler } from 'express';

/** Request facts for audit events. */
export function requestContext(req: Request): RequestContext {
  return { requestId: String(req.id), ip: req.ip };
}

/**
 * Requires `Authorization: Bearer <access token>` and sets `req.auth`.
 * No token: 401 UNAUTHENTICATED. Unknown, revoked or expired: 401 SESSION_EXPIRED.
 * Who the caller is comes only from the server-side session, never from
 * anything the client sends about itself.
 */
export function authenticate(auth: AuthService): RequestHandler {
  return async (req, _res, next) => {
    const header = req.headers.authorization;
    const match = header ? /^Bearer ([A-Za-z0-9_-]{20,200})$/.exec(header) : null;
    if (!match?.[1]) {
      next(new AppError(header ? 'SESSION_EXPIRED' : 'UNAUTHENTICATED'));
      return;
    }
    req.auth = await auth.authenticate(match[1]);
    next();
  };
}

/** `req.auth`, for handlers behind `authenticate`. */
export function authOf(req: Request): AuthContext {
  if (!req.auth) throw new AppError('UNAUTHENTICATED');
  return req.auth;
}
