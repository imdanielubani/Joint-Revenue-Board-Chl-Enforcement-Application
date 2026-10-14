import { createApp } from './app.js';
import { ConfigError, loadConfig } from './config/env.js';
import { createLogger } from './config/logger.js';
import { createDatabase, databaseCheck } from './database/prisma.js';

function start(): void {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      process.stderr.write(`${err.message}\n`);
      process.exit(1);
    }
    throw err;
  }

  const logger = createLogger(config);
  const db = config.databaseUrl ? createDatabase(config.databaseUrl) : undefined;
  if (!db)
    logger.warn('DATABASE_URL is not set; readiness will report the database as not configured');
  if (!config.chl.baseUrl)
    logger.warn('CHL_BASE_URL is not set; the CHL integration is not configured');

  const app = createApp({ config, logger, readinessChecks: [databaseCheck(db)] });
  const server = app.listen(config.port, () => {
    logger.info({ port: config.port, nodeEnv: config.nodeEnv }, 'iteime-backend listening');
  });

  let stopping = false;
  const shutdown = (signal: string) => {
    if (stopping) return;
    stopping = true;
    logger.info({ signal }, 'shutting down');
    // Stop accepting connections, let in-flight requests finish, then close the pool.
    server.close(async (err) => {
      if (err) logger.error({ err }, 'error while closing the HTTP server');
      await db?.$disconnect();
      process.exit(err ? 1 : 0);
    });
    setTimeout(() => {
      logger.error('shutdown timed out; exiting');
      process.exit(1);
    }, 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
