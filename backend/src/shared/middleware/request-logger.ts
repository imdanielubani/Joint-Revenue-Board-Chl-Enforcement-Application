import { pinoHttp } from 'pino-http';

import { requestIdHeader, resolveRequestId } from './request-id.js';

import type { IncomingMessage } from 'node:http';
import type { Logger } from 'pino';

/** The path without its query string: queries can carry identifiers such as plates. */
function pathOnly(req: IncomingMessage): string {
  return (req.url ?? '').split('?')[0] ?? '';
}

/**
 * Assigns each request an ID (echoed in X-Request-ID and in error bodies) and
 * logs one line per request. Bodies, query strings and headers other than
 * a safe few are never logged.
 */
export function requestLogger(logger: Logger) {
  return pinoHttp({
    logger,
    genReqId: (req, res) => {
      const id = resolveRequestId(req);
      res.setHeader(requestIdHeader, id);
      return id;
    },
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    // Health probes are frequent and uninteresting when they succeed.
    autoLogging: { ignore: (req) => pathOnly(req).startsWith('/health/') },
    serializers: {
      req: (req: IncomingMessage & { id?: unknown }) => ({
        id: req.id,
        method: req.method,
        path: pathOnly(req),
        userAgent: req.headers['user-agent'],
      }),
      res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
    },
  });
}
