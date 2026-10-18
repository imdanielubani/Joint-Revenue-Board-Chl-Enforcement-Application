import type { GeoLevel, User } from '@/features/auth/auth.schemas'
import { areasWithin, areaTitle, type Area } from '@/features/geography/areas'

export interface ScopeOption {
  /** The area's id in CHL. */
  value: string
  /** On the picker: "National overview", "Lagos state overview". */
  label: string
  /** In the summary line and the list: "National", "Lagos state". */
  name: string
  level: GeoLevel
  /** How far under one of the user's own areas it sits; 0 for those areas. */
  depth: number
}

/**
 * The areas the user may report on: their assigned areas and, once CHL's area
 * tree has loaded, every area within them.
 */
export function scopeOptions(user: User, areas: readonly Area[] = []): ScopeOption[] {
  return areasWithin(user.scopes, areas).map(({ area, depth }) => {
    const name = areaTitle(area)
    return { value: area.id, label: `${name} overview`, name, level: area.level, depth }
  })
}

/**
 * Whether an area holds more than one enforcement location, so comparing
 * locations and organizations means something.
 */
export function coversSeveralLocations(level: GeoLevel): boolean {
  return level !== 'enforcement_point'
}
