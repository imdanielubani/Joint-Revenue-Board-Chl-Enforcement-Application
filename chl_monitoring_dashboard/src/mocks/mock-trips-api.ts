import type { TripsApi } from '@/features/trips/trips.api'
import type {
  Trip,
  TripCheckResult,
  TripsFilters,
  TripsMonitoring,
  VehicleTripCheck,
} from '@/features/trips/trips.schemas'
import { lagosDay } from '@/shared/lib/dates'
import { delay } from './delay'
import { agentOf, noticeIdOf, placeOf } from './mock-geography-api'
import { pointsWithin } from './mock-overview-api'
import { mockRecords, type MockRecord } from './mock-records'
import { activationOf, tripOf, type MockTrip } from './mock-trips'
import { VEHICLE_TYPES } from './mock-vehicles'

const iso = (ms: number) => new Date(ms).toISOString()

function tripEntry(trip: MockTrip): Trip {
  return {
    reference: trip.reference,
    transactionAt: iso(trip.transactionAt),
    transactionStatus: trip.transactionStatus,
    terminalId: trip.terminalId,
    contactNumber: trip.contactNumber,
    plate: trip.plate,
    vehicleType: VEHICLE_TYPES[trip.plate] ?? null,
    transactionType: trip.transactionType,
    startedAt: iso(trip.startedAt),
    paidAt: iso(trip.paidAt),
    origin: trip.origin,
    destination: trip.destination,
    status: trip.status,
    statusMessage: trip.statusMessage,
    channel: trip.channel,
    channelType: trip.channelType,
    validity: {
      remainingSeconds: trip.validity.remainingSeconds,
      reportedAt: iso(trip.validity.reportedAt),
    },
    destinationDetection: trip.detection
      ? { status: trip.detection.status, reportedAt: iso(trip.detection.reportedAt) }
      : null,
  }
}

/** What a verification's result says CHL returned for the vehicle's trip; null when it says nothing. */
function checkResultOf(record: MockRecord): TripCheckResult | null {
  switch (record.outcome) {
    case 'active_trip':
      return 'active_trip'
    case 'no_active_trip':
    case 'expired_trip':
      return 'no_active_trip'
    case 'no_trip_history':
      return 'no_trip_history'
    default:
      return null
  }
}

/**
 * The trips for an area and period: those CHL returned for the verified
 * vehicles, each vehicle's latest trip check, and what followed confirmed
 * payments — from the same sample records every view counts.
 */
export function summarizeTrips(filters: TripsFilters, now: number = Date.now()): TripsMonitoring {
  const points = pointsWithin(filters.scope)
  const inScope = mockRecords(lagosDay(new Date(now)), now).filter((record) =>
    points.has(record.pointId),
  )
  const records = inScope
    .filter((record) => record.day >= filters.from && record.day <= filters.to)
    .sort((a, b) => b.recordedAt - a.recordedAt)

  const trips = new Map<string, Trip>()
  const vehicles: VehicleTripCheck[] = []
  const seen = new Set<string>()
  for (const record of records) {
    const trip = tripOf(record)
    if (trip) trips.set(trip.reference, tripEntry(trip))
    const result = checkResultOf(record)
    // Each vehicle once: its latest check that returned trip information.
    if (!result || seen.has(record.plate)) continue
    seen.add(record.plate)
    vehicles.push({
      plate: record.plate,
      vehicleType: VEHICLE_TYPES[record.plate] ?? null,
      result,
      verification: {
        reference: record.reference,
        outcome: record.outcome,
        recordedAt: iso(record.recordedAt),
        agent: agentOf(record),
        location: placeOf(record),
      },
      activeTripReference: result === 'active_trip' ? (trip?.reference ?? null) : null,
      previousTripReference: result === 'no_active_trip' ? (trip?.reference ?? null) : null,
    })
  }

  const postPayment = records.flatMap((record) => {
    const activation = activationOf(record, now)
    if (!activation || !record.violation) return []
    if (activation.trip) trips.set(activation.trip.reference, tripEntry(activation.trip))
    return [
      {
        noticeId: noticeIdOf(record.violation.id),
        violationId: record.violation.id,
        plate: record.plate,
        paidAt: iso(activation.paidAt),
        tripActivated: activation.trip !== null,
        tripReference: activation.trip?.reference ?? null,
        complianceStatus: activation.complianceStatus,
        updatedAt: activation.updatedAt === null ? null : iso(activation.updatedAt),
      },
    ]
  })
  postPayment.sort((a, b) => Date.parse(b.paidAt) - Date.parse(a.paidAt))

  const latest = inScope.reduce<number | null>(
    (max, record) => (max === null || record.receivedAt > max ? record.receivedAt : max),
    null,
  )
  return {
    latestReceivedAt: latest === null ? null : iso(latest),
    trips: [...trips.values()].sort(
      (a, b) => Date.parse(b.startedAt ?? '') - Date.parse(a.startedAt ?? ''),
    ),
    vehicles,
    postPayment,
  }
}

/** Sample data: from the sample records. */
export const mockTripsApi: TripsApi = {
  async getMonitoring(filters) {
    await delay()
    return summarizeTrips(filters)
  },
}
