import { createApp } from './app.js';
import { ConfigError, loadConfig } from './config/env.js';
import { createLogger } from './config/logger.js';
import { prismaPersistence, unconfiguredPersistence } from './database/persistence.js';
import { createDatabase, databaseCheck } from './database/prisma.js';
import { createIdentityClient } from './integrations/chl/index.js';
import { AuditService } from './modules/audit/audit.service.js';
import { AuthService } from './modules/auth/auth.service.js';

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
  if (config.chl.identityProvider === 'fake') {
    logger.warn(
      'CHL_IDENTITY_PROVIDER=fake: sign-in uses the FAKE CHL identity provider (synthetic accounts, not CHL)',
    );
  } else {
    logger.warn('No CHL identity provider is configured; sign-in answers 503 CHL_NOT_CONFIGURED');
  }

  const persistence = db ? prismaPersistence(db) : unconfiguredPersistence();
  const identity = createIdentityClient(config, logger);
  const audit = new AuditService(persistence.audit);
  const auth = new AuthService(identity, persistence, audit, config.auth);

  const app = createApp({
    config,
    logger,
    readinessChecks: [databaseCheck(db)],
    services: { auth, audit },
    chlIdentityKind: identity.kind,
  });
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
