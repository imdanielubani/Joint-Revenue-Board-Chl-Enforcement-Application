import { z } from 'zod'

const envSchema = z.object({
  VITE_APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  VITE_API_BASE_URL: z.string().trim().default(''),
  VITE_USE_MOCKS: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  VITE_MAP_TILE_URL: z.string().trim().default('https://tile.openstreetmap.org/{z}/{x}/{y}.png'),
  VITE_MAP_ATTRIBUTION: z
    .string()
    .trim()
    .default(
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    ),
})

export type AppEnv = z.infer<typeof envSchema>['VITE_APP_ENV']

export interface Env {
  appEnv: AppEnv
  /** The backend's address, without a trailing slash. Empty while on sample data. */
  apiBaseUrl: string
  /** True while the dashboard runs on sample data instead of the backend. */
  useMocks: boolean
  /** The map tile address ({z}/{x}/{y}); empty turns the map off. */
  mapTileUrl: string
  /** The credit the tile provider requires, shown on the map. */
  mapAttribution: string
}

/** Reads and checks the VITE_ settings. Throws on a setting that can't work. */
export function parseEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.parse(raw)
  const env: Env = {
    appEnv: parsed.VITE_APP_ENV,
    apiBaseUrl: parsed.VITE_API_BASE_URL.replace(/\/+$/, ''),
    useMocks: parsed.VITE_USE_MOCKS,
    mapTileUrl: parsed.VITE_MAP_TILE_URL,
    mapAttribution: parsed.VITE_MAP_ATTRIBUTION,
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
  if (env.mapTileUrl && !/^https:\/\/.+\{z\}.+\{x\}.+\{y\}/.test(env.mapTileUrl)) {
    throw new Error('VITE_MAP_TILE_URL must be an https address with {z}, {x} and {y}.')
  }
  return env
}

export const env = parseEnv(import.meta.env)
