import { randomUUID } from 'node:crypto';

import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';

import type { ChlAdapter } from './chl/adapter.js';
import type { Config } from './config/env.js';
import type { Database } from './db/pool.js';
import { apiV1Router, type ApiDependencies } from './http/api-v1.js';
import { errorHandler, notFoundHandler } from './http/error-handler.js';
import { healthRouter } from './http/health.js';
import { AuthService } from './services/auth-service.js';
import { VerificationService } from './services/verification-service.js';

export interface AppDependencies {
  logger: Logger;
  chl: ChlAdapter;
  database: Database;
  /** The clock (tests fix it). */
  now?: () => Date;
  session?: Config['session'];
  loginRateLimit?: ApiDependencies['loginRateLimit'];
}

/** The Express app, with everything it needs passed in (so tests can swap it). */
export function createApp(dependencies: AppDependencies): Express {
  const { logger, chl, database } = dependencies;
  const now = dependencies.now ?? (() => new Date());
  const auth = new AuthService({
    database,
    chl,
    logger,
    now,
    session: dependencies.session ?? { accessTokenTtlMinutes: 30, sessionTtlHours: 24 },
  });
  const verifications = new VerificationService({ database, chl, now });

  const app = express();
  app.disable('x-powered-by');
  // Client addresses come from X-Forwarded-For only via a proxy on a private network.
  app.set('trust proxy', 'loopback, linklocal, uniquelocal');

  app.use(helmet());
  app.use(cors());
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

  app.use('/health', healthRouter(dependencies));
  app.use(
    '/api/v1',
    apiV1Router({
      auth,
      verifications,
      chl,
      database,
      now,
      loginRateLimit: dependencies.loginRateLimit,
    }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return app;
}
