import { z } from 'zod';

/** Empty strings in a .env file mean "not set". */
const optionalString = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : value))
  .optional();

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    DATABASE_URL: optionalString.pipe(z.string({ error: 'DATABASE_URL is required' })),
    CHL_ADAPTER: z.enum(['mock', 'http']).default('mock'),
    CHL_BASE_URL: optionalString.pipe(z.url().optional()),
    CHL_API_KEY: optionalString,
    CHL_TIMEOUT_MS: z.coerce.number().int().min(1).default(10_000),
    CHL_MOCK_DELAY_MS: z.coerce.number().int().min(0).default(0),
    ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().min(1).default(30),
    SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(24).default(24),
    TRUST_PROXY: optionalString,
    CORS_ORIGINS: optionalString,
  })
  .superRefine((env, context) => {
    if (env.CHL_ADAPTER === 'http' && !env.CHL_BASE_URL) {
      context.addIssue({
        code: 'custom',
        path: ['CHL_BASE_URL'],
        message: 'CHL_BASE_URL is required when CHL_ADAPTER=http',
      });
    }
    if (env.APP_ENV !== 'development' && env.NODE_ENV !== 'production') {
      context.addIssue({
        code: 'custom',
        path: ['NODE_ENV'],
        message: `NODE_ENV must be production when APP_ENV=${env.APP_ENV}`,
      });
    }
    // Production never answers from sample data.
    if (env.APP_ENV === 'production' && env.CHL_ADAPTER !== 'http') {
      context.addIssue({
        code: 'custom',
        path: ['CHL_ADAPTER'],
        message: 'CHL_ADAPTER must be http when APP_ENV=production',
      });
    }
  });

/** The backend's settings, read once from the environment. */
export interface Config {
  nodeEnv: 'development' | 'test' | 'production';
  /** Which deployment this is; shown by the health check. */
  appEnv: 'development' | 'staging' | 'production';
  /**
   * Express "trust proxy": which proxies' X-Forwarded-For to believe, so
   * client addresses (rate limiting, audit) are right behind a load balancer.
   */
  trustProxy: string | number | boolean;
  /** Browser origins allowed to call the API (the dashboards); "*" for any. */
  corsOrigins: string[] | '*';
  port: number;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  databaseUrl: string;
  session: {
    /** How long an access token lasts before the app refreshes it. */
    accessTokenTtlMinutes: number;
    /** How long a sign-in lasts at most (SRD §5.3: 24 hours). */
    sessionTtlHours: number;
  };
  chl: {
    adapter: 'mock' | 'http';
    baseUrl?: string;
    apiKey?: string;
    timeoutMs: number;
    mockDelayMs: number;
  };
}

/** Reads and checks [source] (the environment by default); throws a readable error. */
export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid configuration: ${problems}`);
  }
  const env = parsed.data;
  return {
    nodeEnv: env.NODE_ENV,
    appEnv: env.APP_ENV,
    trustProxy: parseTrustProxy(env.TRUST_PROXY),
    corsOrigins: parseCorsOrigins(env.CORS_ORIGINS, env.APP_ENV),
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    databaseUrl: env.DATABASE_URL,
    session: {
      accessTokenTtlMinutes: env.ACCESS_TOKEN_TTL_MINUTES,
      sessionTtlHours: env.SESSION_TTL_HOURS,
    },
    chl: {
      adapter: env.CHL_ADAPTER,
      baseUrl: env.CHL_BASE_URL,
      apiKey: env.CHL_API_KEY,
      timeoutMs: env.CHL_TIMEOUT_MS,
      mockDelayMs: env.CHL_MOCK_DELAY_MS,
    },
  };
}

/** "1" → one proxy hop; "true"/"false"; else a list such as "loopback, uniquelocal". */
function parseTrustProxy(value: string | undefined): string | number | boolean {
  if (value === undefined) return 'loopback, linklocal, uniquelocal';
  if (/^\d+$/.test(value)) return Number(value);
  if (value === 'true' || value === 'false') return value === 'true';
  return value;
}

/** Any origin in development; otherwise only those listed (none by default). */
function parseCorsOrigins(
  value: string | undefined,
  appEnv: 'development' | 'staging' | 'production',
): string[] | '*' {
  if (value === undefined) return appEnv === 'development' ? '*' : [];
  if (value === '*') return '*';
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
