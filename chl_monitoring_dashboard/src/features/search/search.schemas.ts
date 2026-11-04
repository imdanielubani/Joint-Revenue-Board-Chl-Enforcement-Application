import { z } from 'zod'
import type { ActionStatus, Open } from '@/features/overview/overview.schemas'
import { verificationEntrySchema } from '@/features/verifications/verifications.schemas'

const open = <T extends string>() => z.custom<Open<T>>((value) => typeof value === 'string')
const count = z.number().int().nonnegative()

/** A vehicle whose plate or CHL vehicle ID matches, with how often it was verified. */
export const vehicleResultSchema = z.object({
  plate: z.string(),
  /** CHL's vehicle ID, where the plate resolved to a vehicle; null when it did not. */
  vehicleId: z.string().nullable(),
  /** The vehicle type, where CHL has one. */
  vehicleType: z.string().nullable(),
  verifications: count,
  /** The latest verification of it. */
  lastRecordedAt: z.string(),
})

/** An agent whose name or ID matches. */
export const agentResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Null when CHL records no organization for them. */
  organization: z.string().nullable(),
})

/** A violation (case) whose reference matches. */
export const violationResultSchema = z.object({
  id: z.string(),
  plate: z.string(),
  category: z.string(),
  status: open<ActionStatus>(),
  /** When the verification it was issued from was recorded. */
  recordedAt: z.string(),
})

/** A payment request (demand notice) whose reference matches. */
export const paymentResultSchema = z.object({
  id: z.string(),
  /** The violation it was generated from. */
  violationId: z.string(),
  plate: z.string(),
  status: open<'pending' | 'received'>(),
  recordedAt: z.string(),
})

/** A CHL trip whose transaction reference matches, as a verification found it. */
export const tripResultSchema = z.object({
  reference: z.string(),
  plate: z.string(),
  recordedAt: z.string(),
})

/**
 * What the top bar's search found in an area: vehicles, agents and records by
 * reference. Read-only; each result leads to its own page.
 */
export const searchResultsSchema = z.object({
  /** The query as it was searched. */
  query: z.string(),
  vehicles: z.array(vehicleResultSchema),
  agents: z.array(agentResultSchema),
  /** Verifications whose reference matches, newest first. */
  verifications: z.array(verificationEntrySchema),
  violations: z.array(violationResultSchema),
  payments: z.array(paymentResultSchema),
  trips: z.array(tripResultSchema),
})

export type VehicleResult = z.infer<typeof vehicleResultSchema>
export type AgentResult = z.infer<typeof agentResultSchema>
export type ViolationResult = z.infer<typeof violationResultSchema>
export type PaymentResult = z.infer<typeof paymentResultSchema>
export type TripResult = z.infer<typeof tripResultSchema>
export type SearchResults = z.infer<typeof searchResultsSchema>

/** The query and the area searched. */
export interface SearchFilters {
  query: string
  scope: string
}
