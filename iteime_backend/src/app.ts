import { randomUUID } from 'node:crypto';

import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';

import type { ChlAdapter } from './chl/adapter.js';
import type { Database } from './db/pool.js';
import { errorHandler, notFoundHandler } from './http/error-handler.js';
import { healthRouter } from './http/health.js';

export interface AppDependencies {
  logger: Logger;
  chl: ChlAdapter;
  database?: Database;
}

/** The Express app, with everything it needs passed in (so tests can swap it). */
export function createApp(dependencies: AppDependencies): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(
    pinoHttp({
      logger: dependencies.logger,
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
  // The mobile API is added under /api/v1 in the next step.

  app.use(notFoundHandler);
  app.use(errorHandler(dependencies.logger));
  return app;
}
