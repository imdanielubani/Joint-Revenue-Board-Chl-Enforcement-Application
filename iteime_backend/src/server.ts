import 'dotenv/config';

import { createApp } from './app.js';
import { createChlAdapter } from './chl/index.js';
import { loadConfig } from './config/env.js';
import { createDatabase } from './db/pool.js';
import { createLogger } from './lib/logger.js';

const config = loadConfig();
const logger = createLogger(config);
const chl = createChlAdapter(config.chl);
const database = config.databaseUrl ? createDatabase(config.databaseUrl) : undefined;

const app = createApp({ logger, chl, database });
const server = app.listen(config.port, () => {
  logger.info(
    { port: config.port, chlAdapter: chl.name, database: database ? 'configured' : 'none' },
    'iteime_backend is listening',
  );
});

/** Finishes in-flight requests, then closes the database, on Ctrl+C or a stop signal. */
function shutDown(signal: string) {
  logger.info({ signal }, 'Shutting down');
  server.close(async () => {
    await database?.close();
    process.exit(0);
  });
  // Don't hang forever on a stuck connection.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutDown('SIGINT'));
process.on('SIGTERM', () => shutDown('SIGTERM'));
