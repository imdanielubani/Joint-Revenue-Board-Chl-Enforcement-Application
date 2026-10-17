import { z } from 'zod'

/**
 * A value from a known list, or one CHL adds later. Unknown values are kept
 * and shown as they come rather than rejected: the backend may return states
 * the dashboard does not know yet (SRD 8.3, "any additional internal states").
 */
export type Open<T extends string> = T | (string & {})

const open = <T extends string>() => z.custom<Open<T>>((value) => typeof value === 'string')

/** The ready-made periods, each ending today. */
export const PRESET_RANGES = ['today', '7d', '14d', '30d', '90d'] as const
export type PresetRange = (typeof PRESET_RANGES)[number]

/** The periods the Overview can report on: the presets, or dates the user picks. */
export const OVERVIEW_RANGES = [...PRESET_RANGES, 'custom'] as const
export type OverviewRange = (typeof OVERVIEW_RANGES)[number]

export const RANGE_LABELS: Record<OverviewRange, string> = {
  today: 'Today',
  '7d': 'Last 7 days',
  '14d': 'Last 14 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  custom: 'Custom range',
}

export const RANGE_DAYS: Record<PresetRange, number> = {
  today: 1,
  '7d': 7,
  '14d': 14,
  '30d': 30,
  '90d': 90,
}

/**
 * What a verification found. These stay distinct everywhere: a result is never
 * folded into "pass" or "fail".
 */
export const VERIFICATION_OUTCOMES = [
  'active_trip',
  'vehicle_not_found',
  'no_trip_history',
  'etag_missing',
  'verification_unavailable',
  'expired_trip',
  'tag_vehicle_mismatch',
  'no_active_trip',
  'invalid_etag',
] as const
export type VerificationOutcome = (typeof VERIFICATION_OUTCOMES)[number]

export const OUTCOME_LABELS: Record<VerificationOutcome, string> = {
  active_trip: 'Active Trip',
  vehicle_not_found: 'Vehicle Not Found',
  no_trip_history: 'No Trip History',
  etag_missing: 'E-Tag Missing',
  verification_unavailable: 'Verification Unavailable',
  expired_trip: 'Expired / Previous Trip',
  tag_vehicle_mismatch: 'Tag-Vehicle Mismatch',
  no_active_trip: 'No Active Trip',
  invalid_etag: 'Invalid E-Tag',
}

export const VERIFICATION_METHODS = ['rfid', 'qr', 'ocr', 'manual'] as const
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number]

/** The method's name in the method card. */
export const METHOD_LABELS: Record<VerificationMethod, string> = {
  rfid: 'RFID',
  qr: 'QR',
  ocr: 'OCR-confirmed',
  manual: 'Manual plate',
}

/** The method's tag in the record register. */
export const METHOD_TAGS: Record<VerificationMethod, string> = {
  rfid: 'RFID',
  qr: 'QR Code',
  ocr: 'OCR',
  manual: 'Manual Plate',
}

/** What has been done about a record. */
export const ACTION_STATUSES = [
  'no_violation',
  'awaiting_action',
  'payment_pending',
  'escalated',
  'resolved',
  'cancelled',
] as const
export type ActionStatus = (typeof ACTION_STATUSES)[number]

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  no_violation: 'No violation recorded',
  awaiting_action: 'Awaiting Action',
  payment_pending: 'Payment Pending',
  escalated: 'Escalated',
  resolved: 'Resolved',
  cancelled: 'Cancelled',
}

/**
 * How a verification was answered: "live" by CHL at the time, or "offline" on
 * the phone from cached data and sent once the connection returned (SRD 6.1).
 */
export type RecordSource = 'live' | 'offline'

export const SOURCE_LABELS: Record<RecordSource, string> = {
  live: 'Live check',
  offline: 'Offline',
}

/** The synchronization status stored with a received record (SRD 6.5, 13). */
export type SyncStatus = 'synced' | 'evidence_pending'

export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  synced: 'Synced',
  evidence_pending: 'Evidence pending',
}

/** Whether a repeat vehicle's reports have been acted on. */
export type FollowUp = 'none' | 'partial'

const count = z.number().int().nonnegative()
/** A calendar day, "2026-10-14". */
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const agentRowSchema = z.object({
  agentId: z.string(),
  name: z.string(),
  organization: z.string(),
  verifications: count,
  violationsIssued: count,
  unresolved: count,
  escalated: count,
  repeatAlerts: count,
  /** The places the agent recorded activity, "Lagos". */
  locations: z.string(),
})

const locationRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** The state or FCT the location is in. */
  area: z.string(),
  code: z.string(),
  agents: count,
  verifications: count,
  violationsIssued: count,
  unresolved: count,
  escalated: count,
  repeatAlerts: count,
})

const caseSchema = z.object({
  id: z.string(),
  plate: z.string(),
  category: z.string(),
  status: open<ActionStatus>(),
  area: z.string(),
})

const repeatVehicleSchema = z.object({
  plate: z.string(),
  reports: count,
  agents: count,
  area: z.string(),
  followUp: open<FollowUp>(),
})

const activityRecordSchema = z.object({
  id: z.string(),
  plate: z.string(),
  /** The verification's reference, "VR-24861". */
  reference: z.string(),
  /** Absent when the field device did not say how the vehicle was identified. */
  method: open<VerificationMethod>().nullable(),
  /** Absent when no verification result was supplied. */
  result: open<VerificationOutcome>().nullable(),
  agent: z.object({ id: z.string(), name: z.string() }),
  recordedAt: z.string(),
  actionStatus: open<ActionStatus>(),
  location: z.object({ name: z.string(), area: z.string(), code: z.string() }),
  /** Live or offline; null when the device did not say. */
  source: open<RecordSource>().nullable(),
  syncStatus: open<SyncStatus>().nullable(),
  /** When CHL received the record: later than recordedAt when it was made offline. */
  receivedAt: z.string().nullable(),
})

export const overviewSchema = z.object({
  /** The first and last day reported on, in Lagos time. */
  period: z.object({ from: day, to: day }),
  /** Locations in scope that sent data during the period. */
  reportingLocations: count,
  /**
   * When CHL last received a field record in this area and period; null when
   * none arrived. Field data can be delayed, so this is not "now" (SRD 13).
   */
  latestReceivedAt: z.string().nullable(),
  kpis: z.object({
    totalVerifications: count,
    activeTripResults: count,
    noActiveTripResults: count,
    violationsIssued: count,
    agentsWithViolations: count,
    unresolvedViolations: count,
    escalatedViolations: count,
    repeatVehiclesWithoutFollowUp: count,
    openRepeatAlerts: count,
    agentsWithActivity: count,
    enforcementLocations: count,
  }),
  /** One entry per day of the period, oldest first. */
  dailyVerifications: z.array(z.object({ date: day, count })),
  /**
   * The same days of the period before, for comparison; null until the backend
   * keeps enough history.
   */
  previousDailyVerifications: z.array(count).nullable(),
  outcomes: z.array(z.object({ outcome: open<VerificationOutcome>(), count })),
  agents: z.array(agentRowSchema),
  locations: z.array(locationRowSchema),
  methods: z.array(z.object({ method: open<VerificationMethod>(), count })),
  violationCategories: z.array(z.object({ category: z.string(), count })),
  payments: z.object({
    received: count,
    pending: count,
    /** Paid notices whose trip was then activated: a separate outcome from payment. */
    tripActivatedOnPaid: count,
  }),
  cases: z.object({
    unresolved: count,
    escalated: count,
    /** The latest cases needing attention; escalated ones included. */
    items: z.array(caseSchema),
  }),
  repeatVehicles: z.object({
    open: count,
    withoutFollowUp: count,
    items: z.array(repeatVehicleSchema),
  }),
  /** The latest timed records, newest first. */
  recentActivity: z.array(activityRecordSchema),
})

export type Overview = z.infer<typeof overviewSchema>
export type AgentRow = z.infer<typeof agentRowSchema>
export type LocationRow = z.infer<typeof locationRowSchema>
export type CaseItem = z.infer<typeof caseSchema>
export type RepeatVehicle = z.infer<typeof repeatVehicleSchema>
export type ActivityRecord = z.infer<typeof activityRecordSchema>

/** Which slice of the data the Overview shows. */
export interface OverviewFilters {
  /** The id of the area reported on, within the user's own. */
  scope: string
  range: OverviewRange
  /** The first and last day reported on, in Lagos time; set for presets too. */
  from: string
  to: string
  /** Only this agent's activity, by recorded agent ID; null for all agents. */
  agentId: string | null
  /** Only the activity of this organization's agents; null for all. */
  organization: string | null
}
