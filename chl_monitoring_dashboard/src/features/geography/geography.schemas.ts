import { z } from 'zod'
import { GEO_LEVELS } from '@/features/auth/auth.schemas'
import type { OverviewFilters } from '@/features/overview/overview.schemas'

const count = z.number().int().nonnegative()

/**
 * One area directly under the scope in CHL's configuration, with the same
 * figures as the scope itself: the views are of the same data (SRD 4).
 */
const childAreaSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.enum(GEO_LEVELS),
  verifications: count,
  activeTrip: count,
  noActiveTrip: count,
  agents: count,
  violations: count,
  unresolved: count,
  escalated: count,
  /** Open repeat-vehicle alerts raised there. */
  repeatAlerts: count,
  payments: z.object({ received: count, pending: count }),
  /** Enforcement points within it, and how many sent data in the period. */
  locations: count,
  reportingLocations: count,
})

/** An enforcement point in scope, active in the period or not. */
const enforcementPointSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** The state or FCT it is in. */
  area: z.string(),
  code: z.string(),
  /** Where its events were recorded (GPS, WGS 84); null when CHL has none. Not a live position. */
  position: z
    .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
    .nullable(),
  verifications: count,
  violations: count,
  agents: count,
  /** The latest event recorded there, at any time. */
  lastRecordedAt: z.string().nullable(),
})

export const geographySchema = z.object({
  /** Areas directly under the scope, as CHL configures them; empty at an enforcement point. */
  areas: z.array(childAreaSchema),
  locations: z.array(enforcementPointSchema),
})

export type Geography = z.infer<typeof geographySchema>
export type ChildArea = z.infer<typeof childAreaSchema>
export type EnforcementPoint = z.infer<typeof enforcementPointSchema>

/** The area and period, as on the Overview; agents and organizations are not narrowed here. */
export type GeographyFilters = Pick<OverviewFilters, 'scope' | 'range' | 'from' | 'to'>
