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
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    DATABASE_URL: optionalString,
    CHL_ADAPTER: z.enum(['mock', 'http']).default('mock'),
    CHL_BASE_URL: optionalString.pipe(z.url().optional()),
    CHL_API_KEY: optionalString,
    CHL_TIMEOUT_MS: z.coerce.number().int().min(1).default(10_000),
    CHL_MOCK_DELAY_MS: z.coerce.number().int().min(0).default(0),
  })
  .superRefine((env, context) => {
    if (env.CHL_ADAPTER === 'http' && !env.CHL_BASE_URL) {
      context.addIssue({
        code: 'custom',
        path: ['CHL_BASE_URL'],
        message: 'CHL_BASE_URL is required when CHL_ADAPTER=http',
      });
    }
  });

/** The backend's settings, read once from the environment. */
export interface Config {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  databaseUrl?: string;
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
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    databaseUrl: env.DATABASE_URL,
    chl: {
      adapter: env.CHL_ADAPTER,
      baseUrl: env.CHL_BASE_URL,
      apiKey: env.CHL_API_KEY,
      timeoutMs: env.CHL_TIMEOUT_MS,
      mockDelayMs: env.CHL_MOCK_DELAY_MS,
    },
  };
}
