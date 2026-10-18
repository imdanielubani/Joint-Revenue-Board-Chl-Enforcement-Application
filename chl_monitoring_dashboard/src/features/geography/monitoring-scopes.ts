import type { GeoLevel } from '@/features/auth/auth.schemas'

/**
 * The eight monitoring scopes, in the order the document lists them (SRD 4).
 * Each is a view of the same data; which areas exist at each level, and what
 * sits under what, comes from CHL's configuration.
 */
export const MONITORING_SCOPES: readonly { level: GeoLevel; label: string; plural: string }[] = [
  { level: 'enforcement_point', label: 'Enforcement location', plural: 'enforcement locations' },
  { level: 'zone', label: 'Enforcement zone', plural: 'enforcement zones' },
  { level: 'ward', label: 'Ward', plural: 'wards' },
  { level: 'lga', label: 'LGA', plural: 'LGAs' },
  { level: 'state', label: 'State', plural: 'states' },
  { level: 'region', label: 'Region', plural: 'regions' },
  { level: 'subregion', label: 'Subregion', plural: 'subregions' },
  { level: 'national', label: 'National', plural: 'national views' },
]
