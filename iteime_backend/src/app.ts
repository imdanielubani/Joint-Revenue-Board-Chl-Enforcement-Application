import { randomUUID } from 'node:crypto';

import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import type { Config } from './config/env.js';
import { createContainer, type Infrastructure } from './container.js';
import { apiV1Router } from './http/api-v1.router.js';
import { errorHandler, notFoundHandler } from './http/middleware/error-handler.js';
import type { LoginRateLimit } from './modules/auth/auth.routes.js';
import { healthRouter } from './modules/health/health.routes.js';

export interface AppDependencies
  extends
    Pick<Infrastructure, 'logger' | 'chl' | 'database'>,
    Partial<Pick<Infrastructure, 'now' | 'session'>> {
  /** Defaults suit development and tests. */
  http?: Pick<Config, 'appEnv' | 'trustProxy' | 'corsOrigins'>;
  loginRateLimit?: LoginRateLimit;
}

/** The Express app, with everything it needs passed in (so tests can swap it). */
export function createApp(dependencies: AppDependencies): Express {
  const container = createContainer({
    logger: dependencies.logger,
    chl: dependencies.chl,
    database: dependencies.database,
    now: dependencies.now ?? (() => new Date()),
    session: dependencies.session ?? { accessTokenTtlMinutes: 30, sessionTtlHours: 24 },
  });
  const { logger } = container;

  const app = express();
  app.disable('x-powered-by');
  const http = dependencies.http ?? {
    appEnv: 'development',
    trustProxy: 'loopback, linklocal, uniquelocal',
    corsOrigins: '*',
  };
  // Client addresses come from X-Forwarded-For only via the proxies trusted.
  app.set('trust proxy', http.trustProxy);

  app.use(helmet());
  // The mobile app doesn't need CORS; browsers (the dashboards) get only the origins allowed.
  app.use(cors({ origin: http.corsOrigins === '*' ? true : http.corsOrigins }));
  app.use(express.json({ limit: '1mb' }));
  app.use(
    pinoHttp({
      logger,
      // Reuse a caller's request ID, or make one; returned in X-Request-Id.
      genReqId: (request, response) => {
        const given = request.headers['x-request-id'];
        const id = typeof given === 'string' && given.length <= 100 ? given : randomUUID();
        response.setHeader('X-Request-Id', id);
        return id;
      },
      autoLogging: { ignore: (request) => request.url?.startsWith('/health') ?? false },
    }),
  );

  app.use('/health', healthRouter({ ...dependencies, environment: http.appEnv }));
  app.use('/api/v1', apiV1Router(container, { loginRateLimit: dependencies.loginRateLimit }));

  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return app;
}
