import { z } from 'zod'
import type {
  Open,
  OverviewFilters,
  VerificationOutcome,
} from '@/features/overview/overview.schemas'

const open = <T extends string>() => z.custom<Open<T>>((value) => typeof value === 'string')

/**
 * A trip's status as CHL returns it: "Trip Active" or "Trip Closed". The
 * dashboard never changes or works it out; why a trip closed is in CHL's message.
 */
export const TRIP_STATUSES = ['active', 'closed'] as const
export type TripStatus = (typeof TRIP_STATUSES)[number]

/** What CHL returned when a verified vehicle's trip was checked. */
export const TRIP_CHECK_RESULTS = ['active_trip', 'no_active_trip', 'no_trip_history'] as const
export type TripCheckResult = (typeof TRIP_CHECK_RESULTS)[number]

/** Destination detection or completion, as CHL reports it, where available. */
export const DETECTION_STATUSES = ['destination_detected', 'trip_completed'] as const
export type DetectionStatus = (typeof DETECTION_STATUSES)[number]

/** A state and its LGA, as CHL records them for a trip. */
const tripPlaceSchema = z.object({ state: z.string(), lga: z.string().nullable() })

/** A trip as CHL returns it, with the document's trip detail fields (SRD 7). */
export const tripSchema = z.object({
  /** The transaction reference. */
  reference: z.string(),
  /** When the transaction was made, as CHL records it. */
  transactionAt: z.string().nullable(),
  /** The transaction's status as CHL returns it: "Successful". */
  transactionStatus: z.string().nullable(),
  /** The payment terminal's ID. */
  terminalId: z.string().nullable(),
  /** The contact number recorded with the transaction. */
  contactNumber: z.string().nullable(),
  /** The vehicle license (plate) number. */
  plate: z.string(),
  vehicleType: z.string().nullable(),
  /** The transaction type (trip type): "Complete Leg". */
  transactionType: z.string().nullable(),
  startedAt: z.string().nullable(),
  paidAt: z.string().nullable(),
  origin: tripPlaceSchema.nullable(),
  destination: tripPlaceSchema.nullable(),
  status: open<TripStatus>(),
  /** CHL's own words about the trip's status, shown exactly as sent: "This trip has expired (…)". */
  statusMessage: z.string().nullable(),
  /** The channel the transaction came through: "Fortis". */
  channel: z.string().nullable(),
  /** The channel type: "POS". */
  channelType: z.string().nullable(),
  /**
   * The trip validity countdown as CHL reported it: the time left, and when
   * CHL reported it. Shown as reported — never counted down or acted on here.
   */
  validity: z
    .object({ remainingSeconds: z.number().int().nonnegative(), reportedAt: z.string() })
    .nullable(),
  destinationDetection: z
    .object({ status: open<DetectionStatus>(), reportedAt: z.string() })
    .nullable(),
})

/** A verified vehicle and what CHL returned for its trip at its latest check in the period. */
export const vehicleTripCheckSchema = z.object({
  plate: z.string(),
  vehicleType: z.string().nullable(),
  result: open<TripCheckResult>(),
  /** The verification that checked it. */
  verification: z.object({
    reference: z.string(),
    outcome: open<VerificationOutcome>().nullable(),
    recordedAt: z.string(),
    agent: z.object({ id: z.string(), name: z.string() }),
    location: z.object({ id: z.string(), name: z.string(), area: z.string(), code: z.string() }),
  }),
  /** The current trip, when CHL returned an active one. */
  activeTripReference: z.string().nullable(),
  /** The most recent previous trip, when there is no active trip and CHL returned one. */
  previousTripReference: z.string().nullable(),
})

/** A confirmed payment and what CHL recorded after it (SRD 7). */
export const postPaymentSchema = z.object({
  noticeId: z.string(),
  violationId: z.string(),
  plate: z.string(),
  /** When the payment was confirmed. */
  paidAt: z.string(),
  tripActivated: z.boolean(),
  /** The trip CHL activated, if it did. */
  tripReference: z.string().nullable(),
  /** The compliance status CHL recorded after payment; null when it has not updated it. */
  complianceStatus: z.string().nullable(),
  updatedAt: z.string().nullable(),
})

export const tripsMonitoringSchema = z.object({
  /** The latest record CHL received in scope, at any time; null when none. */
  latestReceivedAt: z.string().nullable(),
  /** Every trip CHL returned in the area and period, newest first. */
  trips: z.array(tripSchema),
  /** The vehicles verified in the area and period, most recently checked first. */
  vehicles: z.array(vehicleTripCheckSchema),
  /** Payments confirmed in the area and period, newest first. */
  postPayment: z.array(postPaymentSchema),
})

export type Trip = z.infer<typeof tripSchema>
export type VehicleTripCheck = z.infer<typeof vehicleTripCheckSchema>
export type PostPayment = z.infer<typeof postPaymentSchema>
export type TripsMonitoring = z.infer<typeof tripsMonitoringSchema>

/** The area and period, as on the Overview. */
export type TripsFilters = Pick<OverviewFilters, 'scope' | 'range' | 'from' | 'to'>
