import { pino, type Logger } from 'pino';

import type { Config } from './env.js';

/**
 * Paths never written to logs. Request bodies and query strings are not
 * logged at all (see request-logger.ts); these cover anything logged explicitly.
 */
export const redactedPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'res.headers["set-cookie"]',
  '*.password',
  '*.accessToken',
  '*.refreshToken',
  '*.token',
  '*.apiKey',
  '*.secret',
  '*.rfidTagId',
  '*.databaseUrl',
];

/** Structured JSON logs with sensitive fields redacted. */
export function createLogger(config: Pick<Config, 'logLevel'>): Logger {
  return pino({
    level: config.logLevel,
    base: { service: 'iteime-backend' },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: { paths: redactedPaths, censor: '[redacted]' },
  });
}
