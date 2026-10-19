import { z } from 'zod'
import { geoScopeSchema } from '@/features/auth/auth.schemas'
import {
  evidenceRecordSchema,
  noticeRecordSchema,
  verificationRecordSchema,
  violationRecordSchema,
  type GeographyFilters,
} from '@/features/geography/geography.schemas'
import {
  casesSchema,
  repeatVehiclesSchema,
  type Open,
  type VerificationOutcome,
} from '@/features/overview/overview.schemas'

const count = z.number().int().nonnegative()
const open = <T extends string>() => z.custom<Open<T>>((value) => typeof value === 'string')
/** A calendar day, "2026-10-14". */
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

/**
 * What one agent recorded in the area and period: the documented verification
 * and enforcement metrics, as counts. Never a score, a rank, attendance or
 * shifts — agent scoring is a future extension, not part of this module.
 */
const agentMetricsSchema = z.object({
  verifications: count,
  /** Every result kept distinct, never folded into pass or fail. */
  outcomes: z.array(z.object({ outcome: open<VerificationOutcome>(), count })),
  violationsIssued: count,
  /** Violations the agent supplied evidence for. */
  evidenceSubmitted: count,
  demandNotices: z.object({
    issued: count,
    paymentReceived: count,
    paymentPending: count,
    /** Paid notices whose trip CHL then activated: a separate outcome from payment. */
    tripActivatedOnPaid: count,
  }),
  /** Violations not yet resolved; escalated ones are included. */
  unresolved: count,
  escalated: count,
  /** Repeat-vehicle alerts the agent reported the vehicle for. */
  repeatAlerts: count,
  /** Enforcement locations the agent recorded activity at. */
  enforcementLocations: count,
})

/** An agent as CHL records them, with what they recorded in the area and period. */
export const agentSummarySchema = z.object({
  /** The recorded agent ID: agents are matched by this, never by name. */
  id: z.string(),
  name: z.string(),
  /** The vendor or organization, where CHL records one. */
  organization: z.string().nullable(),
  /**
   * The areas CHL assigns the agent to, as defined centrally. Null when CHL
   * does not expose the agent's scope: the dashboard never guesses it.
   */
  assignedScope: z.array(geoScopeSchema).nullable(),
  /** The latest activity the agent recorded in the area, at any time; null when none. */
  lastRecordedAt: z.string().nullable(),
  metrics: agentMetricsSchema,
})

/** The agents the user may see in an area, for the period. */
export const agentsMonitoringSchema = z.object({
  period: z.object({ from: day, to: day }),
  /** When CHL last received a field record in this area and period; null when none arrived. */
  latestReceivedAt: z.string().nullable(),
  /** Every agent assigned to or active in the area, active in the period or not. */
  agents: z.array(agentSummarySchema),
})

/** An enforcement location where the agent recorded activity in the period. */
const agentLocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** The state or FCT it is in. */
  area: z.string(),
  code: z.string(),
  /** Where its events are recorded (GPS, WGS 84); null when CHL has none. Not a live position. */
  position: z
    .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
    .nullable(),
  verifications: count,
  violations: count,
  /** The agent's latest activity there, at any time. */
  lastRecordedAt: z.string().nullable(),
})

/** One agent's records and follow-up in the area and period. */
export const agentActivitySchema = z.object({
  agent: agentSummarySchema,
  /** When CHL last received one of the agent's field records in this area and period. */
  latestReceivedAt: z.string().nullable(),
  /** The agent's records, newest first. */
  records: z.object({
    verifications: z.array(verificationRecordSchema),
    violations: z.array(violationRecordSchema),
    notices: z.array(noticeRecordSchema),
    evidence: z.array(evidenceRecordSchema),
  }),
  locations: z.array(agentLocationSchema),
  /** The agent's unresolved violations, escalated ones included. */
  cases: casesSchema,
  /** Repeat-vehicle alerts for vehicles the agent reported. */
  repeatVehicles: repeatVehiclesSchema,
})

export type AgentMetrics = z.infer<typeof agentMetricsSchema>
export type AgentSummary = z.infer<typeof agentSummarySchema>
export type AgentsMonitoring = z.infer<typeof agentsMonitoringSchema>
export type AgentLocation = z.infer<typeof agentLocationSchema>
export type AgentActivity = z.infer<typeof agentActivitySchema>

/** The area and period, as on geographical monitoring. */
export type AgentsFilters = GeographyFilters
