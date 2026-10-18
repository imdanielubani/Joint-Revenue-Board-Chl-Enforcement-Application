import type { GeoLevel } from '@/features/auth/auth.schemas'

/**
 * The eight monitoring scopes (SRD 4), widest first as the design orders them.
 * Each is a view of the same enforcement records; which areas exist at each
 * level comes from CHL's configuration, and no parent-child hierarchy is assumed.
 */
export const MONITORING_SCOPES: readonly { level: GeoLevel; label: string; plural: string }[] = [
  { level: 'national', label: 'National', plural: 'national views' },
  { level: 'region', label: 'Region', plural: 'regions' },
  { level: 'subregion', label: 'Subregion', plural: 'subregions' },
  { level: 'state', label: 'State', plural: 'states' },
  { level: 'lga', label: 'Local Government Area', plural: 'local government areas' },
  { level: 'ward', label: 'Ward', plural: 'wards' },
  { level: 'zone', label: 'Enforcement Zone', plural: 'enforcement zones' },
  { level: 'enforcement_point', label: 'Enforcement Location', plural: 'enforcement locations' },
]
