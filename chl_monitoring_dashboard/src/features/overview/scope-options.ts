import type { User } from '@/features/auth/auth.schemas'

export interface ScopeOption {
  /** "national", or the area's id. */
  value: string
  /** In the dropdown: "National overview", "Lagos overview". */
  label: string
  /** In the summary line: "National", "Lagos". */
  name: string
}

/** The areas the user may report on. A national user sees the whole country. */
export function scopeOptions(user: User): ScopeOption[] {
  if (user.scopes.some((scope) => scope.level === 'national')) {
    return [{ value: 'national', label: 'National overview', name: 'National' }]
  }
  return user.scopes.map((scope) => ({
    value: scope.id,
    label: `${scope.name} overview`,
    name: scope.name,
  }))
}

/**
 * Whether the user covers more than single enforcement points, so comparing
 * locations and organizations means something.
 */
export function coversSeveralLocations(user: User): boolean {
  return user.scopes.some((scope) => scope.level !== 'enforcement_point')
}
