import { existsSync } from 'node:fs';

import { z } from 'zod';

const logLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

/** Treats an empty string the same as an unset variable. */
const optionalString = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : value))
  .optional();

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z.enum(logLevels).default('info'),
    DATABASE_URL: optionalString.pipe(
      z
        .string()
        .regex(/^postgres(ql)?:\/\//, 'must be a postgresql:// connection string')
        .optional(),
    ),
    CORS_ORIGINS: optionalString,
    TRUST_PROXY: optionalString,
    RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(300),
    CHL_BASE_URL: optionalString.pipe(z.url({ protocol: /^https?$/ }).optional()),
    CHL_TIMEOUT_MS: z.coerce.number().int().min(100).max(60_000).default(10_000),
    // Which CHL identity provider signs agents in (ADR-0010). "fake" is a
    // labelled test double for tests and local development; never production.
    CHL_IDENTITY_PROVIDER: z.enum(['none', 'fake']).default('none'),
    // Access tokens are refreshed by the client. The access-token lifetime is
    // not stated in the sources (assumption, documented in ADR-0010).
    ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().min(5).max(120).default(30),
    // A sign-in lasts at most 24 hours (SRD §5.3).
    SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(24).default(24),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && !env.DATABASE_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message: 'is required when NODE_ENV=production',
      });
    }
    if (env.NODE_ENV === 'production' && env.CHL_IDENTITY_PROVIDER === 'fake') {
      ctx.addIssue({
        code: 'custom',
        path: ['CHL_IDENTITY_PROVIDER'],
        message: 'the fake provider is not allowed when NODE_ENV=production',
      });
    }
    if (env.NODE_ENV === 'production' && env.CHL_BASE_URL?.startsWith('http://')) {
      ctx.addIssue({
        code: 'custom',
        path: ['CHL_BASE_URL'],
        message: 'must use https when NODE_ENV=production',
      });
    }
  });

export interface Config {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  logLevel: (typeof logLevels)[number];
  databaseUrl: string | undefined;
  corsOrigins: string[];
  trustProxy: boolean | number;
  rateLimitPerMinute: number;
  chl: {
    baseUrl: string | undefined;
    timeoutMs: number;
    identityProvider: 'none' | 'fake';
  };
  auth: {
    accessTokenTtlMinutes: number;
    sessionTtlHours: number;
  };
}

/** Raised when settings are invalid. The message names variables, never their values. */
export class ConfigError extends Error {
  constructor(readonly problems: string[]) {
    super(`Invalid configuration:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    this.name = 'ConfigError';
  }
}

function parseTrustProxy(value: string | undefined, problems: string[]): boolean | number {
  if (value === undefined || value === 'false') return false;
  if (value === 'true') return true;
  if (/^\d+$/.test(value)) return Number(value);
  problems.push('TRUST_PROXY: must be true, false or a hop count');
  return false;
}

/** Validates settings from [source]. Pure, so tests can pass any environment. */
export function parseConfig(source: NodeJS.ProcessEnv): Config {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new ConfigError(
      result.error.issues.map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`),
    );
  }
  const env = result.data;
  const problems: string[] = [];
  const trustProxy = parseTrustProxy(env.TRUST_PROXY, problems);
  const corsOrigins = (env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin !== '');
  if (corsOrigins.includes('*')) {
    problems.push('CORS_ORIGINS: list origins explicitly; * is not allowed');
  }
  if (problems.length > 0) throw new ConfigError(problems);

  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    databaseUrl: env.DATABASE_URL,
    corsOrigins,
    trustProxy,
    rateLimitPerMinute: env.RATE_LIMIT_PER_MINUTE,
    chl: {
      baseUrl: env.CHL_BASE_URL,
      timeoutMs: env.CHL_TIMEOUT_MS,
      identityProvider: env.CHL_IDENTITY_PROVIDER,
    },
    auth: {
      accessTokenTtlMinutes: env.ACCESS_TOKEN_TTL_MINUTES,
      sessionTtlHours: env.SESSION_TTL_HOURS,
    },
  };
}

/** Reads .env (if present) into process.env, then validates. Used by the server only. */
export function loadConfig(envFile = '.env'): Config {
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  return parseConfig(process.env);
}
