import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';

import { healthRouter } from './modules/health/health.routes.js';
import { apiV1Router } from './routes/v1/index.js';
import { AppError } from './shared/errors/app-error.js';
import { errorHandler } from './shared/middleware/error-handler.js';
import { notFound } from './shared/middleware/not-found.js';
import { requestLogger } from './shared/middleware/request-logger.js';

import type { Config } from './config/env.js';
import type { DependencyCheck } from './modules/health/health.types.js';
import type { Express } from 'express';
import type { Logger } from 'pino';

export interface AppDependencies {
  config: Pick<Config, 'corsOrigins' | 'trustProxy' | 'rateLimitPerMinute'>;
  logger: Logger;
  /** Checked by GET /health/ready. */
  readinessChecks: DependencyCheck[];
  readinessTimeoutMs?: number;
}

/** JSON bodies above this are refused with 413. Evidence uploads will get their own limits. */
export const jsonBodyLimit = '100kb';

/** Builds the Express app. It never listens or connects; server.ts does that. */
export function createApp({
  config,
  logger,
  readinessChecks,
  readinessTimeoutMs,
}: AppDependencies): Express {
  const app = express();
  app.set('trust proxy', config.trustProxy);

  app.use(requestLogger(logger));
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins.length > 0 ? config.corsOrigins : false }));

  app.use('/health', healthRouter(readinessChecks, readinessTimeoutMs));

  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: config.rateLimitPerMinute,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (_req, _res, next) => {
        next(new AppError(429, 'rate_limited', 'Too many requests. Try again shortly.'));
      },
    }),
  );
  app.use(express.json({ limit: jsonBodyLimit }));

  app.use('/api/v1', apiV1Router());

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
