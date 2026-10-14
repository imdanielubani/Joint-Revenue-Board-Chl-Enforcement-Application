import { AppError } from '../../shared/errors/app-error.js';
import { authOf, requestContext } from '../auth/auth.middleware.js';
import { hasPermission, type Client, type Permission } from './access-control.policy.js';

import type { AuditService } from '../audit/audit.service.js';
import type { RequestHandler } from 'express';

/**
 * Only sessions of `client` may use this API surface: a mobile session can't
 * call monitoring routes, and the reverse (ADR-0005: separate surfaces with
 * separate permission sets in one process).
 */
export function requireClient(client: Client): RequestHandler {
  return (req, _res, next) => {
    next(authOf(req).client === client ? undefined : new AppError('CLIENT_ACCESS_DENIED'));
  };
}

/**
 * Requires a permission granted to the caller's role. A denial is audited
 * (`access.denied`) and answered 403 FORBIDDEN.
 */
export function requirePermission(permission: Permission, audit: AuditService): RequestHandler {
  return async (req, _res, next) => {
    const { principal } = authOf(req);
    if (hasPermission(principal.role, permission)) {
      next();
      return;
    }
    await audit.record({
      actor: { type: 'principal', id: principal.id, role: principal.role },
      action: 'access.denied',
      outcome: 'denied',
      context: requestContext(req),
      details: { permission, method: req.method, path: req.baseUrl + req.path },
    });
    next(new AppError('FORBIDDEN'));
  };
}

const readMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

/** The Monitoring Dashboard surface is read-only (MON §8–§10; ADR-0008). */
export const readOnly: RequestHandler = (req, _res, next) => {
  next(readMethods.has(req.method) ? undefined : new AppError('METHOD_NOT_ALLOWED'));
};
