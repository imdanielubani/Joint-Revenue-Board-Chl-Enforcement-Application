import { pino, type Logger } from 'pino';

import type { Config } from '../config/env.js';

/** Structured JSON logs; readable output in development. Secrets are never logged. */
export function createLogger(config: Pick<Config, 'logLevel' | 'nodeEnv'>): Logger {
  return pino({
    level: config.logLevel,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        '*.password',
        '*.accessToken',
        '*.refreshToken',
        '*.apiKey',
      ],
      censor: '[redacted]',
    },
    ...(config.nodeEnv === 'development'
      ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
      : {}),
  });
}
