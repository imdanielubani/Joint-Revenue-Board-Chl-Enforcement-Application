import { z } from 'zod'

const envSchema = z.object({
  VITE_APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  VITE_API_BASE_URL: z.string().trim().default(''),
  VITE_USE_MOCKS: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  VITE_SUPPORT_URL: z.string().trim().default(''),
})

export type AppEnv = z.infer<typeof envSchema>['VITE_APP_ENV']

export interface Env {
  appEnv: AppEnv
  /** The backend's address, without a trailing slash. Empty while on sample data. */
  apiBaseUrl: string
  /** True while the dashboard runs on sample data instead of the backend. */
  useMocks: boolean
  /** Where "Contact CHL Support" leads: an https:// page or a mailto: address. Empty until provided. */
  supportUrl: string
}

/** Reads and checks the VITE_ settings. Throws on a setting that can't work. */
export function parseEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.parse(raw)
  const env: Env = {
    appEnv: parsed.VITE_APP_ENV,
    apiBaseUrl: parsed.VITE_API_BASE_URL.replace(/\/+$/, ''),
    useMocks: parsed.VITE_USE_MOCKS,
    supportUrl: parsed.VITE_SUPPORT_URL,
  }

  if (env.appEnv === 'production' && env.useMocks) {
    throw new Error('Production must not run on sample data: set VITE_USE_MOCKS=false.')
  }
  if (!env.useMocks && !env.apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL is required when VITE_USE_MOCKS=false.')
  }
  if (env.appEnv !== 'development' && env.apiBaseUrl && !env.apiBaseUrl.startsWith('https://')) {
    throw new Error('Staging and production must call the backend over https.')
  }
  if (env.supportUrl && !/^(https:\/\/|mailto:)/.test(env.supportUrl)) {
    throw new Error('VITE_SUPPORT_URL must start with https:// or mailto:.')
  }
  if (env.appEnv === 'production' && !env.supportUrl) {
    throw new Error('Production needs VITE_SUPPORT_URL for "Contact CHL Support".')
  }
  return env
}

export const env = parseEnv(import.meta.env)
