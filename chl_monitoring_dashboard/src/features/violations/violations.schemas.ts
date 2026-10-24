import { z } from 'zod'
import { enforcementNoteSchema } from '@/features/evidence/evidence.schemas'
import type {
  ActionStatus,
  FollowUp,
  Open,
  OverviewFilters,
  VerificationOutcome,
} from '@/features/overview/overview.schemas'

const open = <T extends string>() => z.custom<Open<T>>((value) => typeof value === 'string')
const gps = z
  .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
  .nullable()

/**
 * The violation categories (SRD 8.2): the six in the SRD's initial list, then
 * the tag-vehicle mismatch, which is also a documented breach. Others CHL
 * returns are shown as they come.
 */
export const VIOLATION_CATEGORIES = [
  'No Active CHL Trip',
  'No E-Tag',
  'Fake / Invalid E-Tag',
  'Tampered E-Tag',
  'Expired Trip',
  'Refusal to Comply',
  'Tag-Vehicle Mismatch',
] as const

/** The status views (SRD 8.3), then any other state the backend returns. */
export const STATUS_VIEWS = ['payment_pending', 'resolved', 'escalated', 'cancelled'] as const

/** Someone who acted on a case, as CHL records them. */
const actorSchema = z.object({ id: z.string(), name: z.string(), role: z.string() })

/** An action recorded on a case, oldest first (SRD 8.4). */
export const caseActionSchema = z.object({
  /** "violation_issued", "demand_notice_issued", "escalated", "payment_received", "resolved", "cancelled". */
  action: z.string(),
  at: z.string(),
  /** Who took it; null when CHL records none (an automatic step). */
  actor: actorSchema.nullable(),
})

/** How a case was closed or cancelled (SRD 8.5), with its audit information where available. */
export const closureSchema = z.object({
  outcome: open<'resolved' | 'cancelled'>(),
  at: z.string(),
  /** The responsible actor; null when CHL does not supply one. */
  actor: actorSchema.nullable(),
  reason: z.string().nullable(),
  /** The audit record's reference, where available. */
  auditReference: z.string().nullable(),
})

/** One violation received by CHL, as a case record (SRD 8.1). */
export const violationCaseSchema = z.object({
  id: z.string(),
  category: z.string(),
  status: open<ActionStatus>(),
  recordedAt: z.string(),
  receivedAt: z.string().nullable(),
  plate: z.string(),
  vehicleId: z.string().nullable(),
  vehicleType: z.string().nullable(),
  agent: z.object({ id: z.string(), name: z.string() }),
  location: z.object({ id: z.string(), name: z.string(), area: z.string(), code: z.string() }),
  position: gps,
  verification: z.object({
    reference: z.string(),
    outcome: open<VerificationOutcome>().nullable(),
  }),
  /** The evidence captured with it; null when none was. */
  evidence: z
    .object({
      id: z.string(),
      photographs: z.number().int().nonnegative(),
      status: open<'received' | 'pending'>(),
    })
    .nullable(),
  notes: z.array(enforcementNoteSchema),
  /** The linked demand notice and its payment status; null when none was issued. */
  notice: z
    .object({
      id: z.string(),
      status: open<'pending' | 'received'>(),
      /** When payment was confirmed; null while pending. */
      paidAt: z.string().nullable(),
    })
    .nullable(),
  actions: z.array(caseActionSchema),
  closure: closureSchema.nullable(),
  /** The repeat-vehicle alert the plate is under, if any (SRD 8.4, 11.1). */
  repeatAlert: z
    .object({ reports: z.number().int().nonnegative(), followUp: open<FollowUp>() })
    .nullable(),
})

export const violationsMonitoringSchema = z.object({
  /** The latest record CHL received in scope, at any time; null when none. */
  latestReceivedAt: z.string().nullable(),
  /** The violations in the area and period, newest first. */
  cases: z.array(violationCaseSchema),
})

export type CaseAction = z.infer<typeof caseActionSchema>
export type Closure = z.infer<typeof closureSchema>
export type ViolationCase = z.infer<typeof violationCaseSchema>
export type ViolationsMonitoring = z.infer<typeof violationsMonitoringSchema>

/** The area, period, agent and organization, as on the Overview. */
export type ViolationsFilters = OverviewFilters
