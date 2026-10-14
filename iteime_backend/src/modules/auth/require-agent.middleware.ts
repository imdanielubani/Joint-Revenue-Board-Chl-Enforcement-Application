import type { Request, RequestHandler, Response } from 'express';

import { AppError } from '../../shared/errors.js';
import type { AgentSession } from './session.repository.js';
import type { AuthService, RequestMeta } from './auth.service.js';

/** Lets a request through only with a valid `Authorization: Bearer` access token. */
export function requireAgent(auth: AuthService): RequestHandler {
  return async (request, response, next) => {
    const header = request.headers.authorization ?? '';
    const match = /^Bearer\s+(\S+)$/i.exec(header);
    if (!match?.[1]) {
      next(new AppError(401, 'UNAUTHENTICATED', 'Please sign in.'));
      return;
    }
    try {
      response.locals.session = await auth.authenticate(match[1]);
      next();
    } catch (error) {
      next(error);
    }
  };
}

/** The signed-in agent's session (set by requireAgent). */
export function sessionOf(response: Response): AgentSession {
  const session = response.locals.session as AgentSession | undefined;
  if (!session) throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in.');
  return session;
}

export function metaOf(request: Request, device?: unknown): RequestMeta {
  return { ip: request.ip, requestId: String(request.id ?? ''), device };
}
