import { z } from 'zod'

/** Error codes the backend returns on sign-in that the dashboard treats specially. */
export const AUTH_ERROR_CODES = {
  /** The email or password is wrong (HTTP 401). */
  invalidCredentials: 'invalid_credentials',
  /** The CHL account exists but has been deactivated (HTTP 403). */
  accountDeactivated: 'account_deactivated',
} as const

export const ROLES = ['administrator', 'supervisor', 'principal_officer'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  administrator: 'System Administrator',
  supervisor: 'Supervisor',
  principal_officer: 'Principal Officer',
}

/** The dashboard's modules. CHL decides which ones each user may open. */
export const MODULE_KEYS = [
  'overview',
  'command-centre',
  'geography',
  'agents',
  'verifications',
  'trips',
  'violations',
  'evidence',
  'payments',
  'notifications',
  'repeat-alerts',
  'audit',
  'sync',
] as const
export type ModuleKey = (typeof MODULE_KEYS)[number]

export const GEO_LEVELS = [
  'enforcement_point',
  'zone',
  'ward',
  'lga',
  'state',
  'region',
  'subregion',
  'national',
] as const
export type GeoLevel = (typeof GEO_LEVELS)[number]

export const geoScopeSchema = z.object({
  level: z.enum(GEO_LEVELS),
  id: z.string(),
  name: z.string(),
})
export type GeoScope = z.infer<typeof geoScopeSchema>

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(ROLES),
  organization: z.string().nullable(),
  /** The areas this user may see, assigned centrally in CHL. */
  scopes: z.array(geoScopeSchema),
  /** Modules this user may open; unknown keys from the backend are ignored. */
  modules: z
    .array(z.string())
    .transform((keys) =>
      keys.filter((key): key is ModuleKey => (MODULE_KEYS as readonly string[]).includes(key)),
    ),
})
export type User = z.infer<typeof userSchema>

export const tokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
})
export type Tokens = z.infer<typeof tokensSchema>

export const sessionSchema = tokensSchema.extend({
  user: userSchema,
  /** When the session ends, whatever happens in between (ISO time). */
  expiresAt: z.iso.datetime({ offset: true }),
})
export type Session = z.infer<typeof sessionSchema>

export const signInSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})
export type SignInInput = z.infer<typeof signInSchema>
