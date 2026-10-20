import type { DetectionStatus, TripStatus } from '@/features/trips/trips.schemas'
import { unit, type MockRecord } from './mock-records'

/**
 * The trips the sample CHL holds behind the sample verifications. This file
 * plays CHL's part: it decides each trip's status and reports its validity.
 * The dashboard only shows what it is given.
 */

export interface MockTripPlace {
  state: string
  lga: string
}

/** The transaction behind a trip, as CHL records it. */
interface MockTransaction {
  reference: string
  transactionStatus: string
  terminalId: string
  contactNumber: string
  transactionType: string
  channel: string
  channelType: string
}

export interface MockTrip extends MockTransaction {
  plate: string
  transactionAt: number
  startedAt: number
  paidAt: number
  origin: MockTripPlace
  destination: MockTripPlace
  status: TripStatus
  /** CHL's own words about the status. */
  statusMessage: string | null
  /** The validity CHL reported for the trip, and when it reported it. */
  validity: { remainingSeconds: number; reportedAt: number }
  detection: { status: DetectionStatus; reportedAt: number } | null
}

/** How long the sample CHL keeps a trip valid. Only CHL applies this, never the dashboard. */
const VALIDITY_MS = 24 * 3_600_000
const HOUR = 3_600_000
const MINUTE = 60_000

const PLACES: MockTripPlace[] = [
  { state: 'Lagos', lga: 'Ikeja' },
  { state: 'Lagos', lga: 'Apapa' },
  { state: 'Kano', lga: 'Kano Municipal' },
  { state: 'FCT', lga: 'AMAC' },
  { state: 'Plateau', lga: 'Jos North' },
  { state: 'Rivers', lga: 'Eleme' },
]

const indexOf = (record: MockRecord) => Number(record.id.replace(/\D/g, ''))

/** A stable number in [0, 1) for a record and a purpose, so no draw from the generator is needed. */
const draw = (record: MockRecord, purpose: number) => unit(indexOf(record) * 11 + purpose)

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'

/**
 * The transaction CHL recorded for a trip: a 12-digit reference (one series
 * for trips found at verifications, another for trips activated after payment),
 * the POS terminal and the contact number given.
 */
function transactionOf(record: MockRecord, series: 'verified' | 'activated'): MockTransaction {
  const base = series === 'verified' ? 564_031_000_000 : 564_097_000_000
  const letters = [13, 14, 15, 16]
    .map((purpose) => LETTERS[Math.floor(draw(record, purpose) * LETTERS.length)])
    .join('')
  return {
    reference: String(base + indexOf(record) * 7_919),
    transactionStatus: 'Successful',
    terminalId: `${2000 + Math.floor(draw(record, 12) * 8000)}${letters}`,
    contactNumber: `81${String(Math.floor(draw(record, 17) * 1e8)).padStart(8, '0')}`,
    transactionType: 'Complete Leg',
    channel: 'Fortis',
    channelType: 'POS',
  }
}

function places(record: MockRecord): { origin: MockTripPlace; destination: MockTripPlace } {
  const from = Math.floor(draw(record, 6) * PLACES.length)
  const step = 1 + Math.floor(draw(record, 7) * (PLACES.length - 1))
  return { origin: PLACES[from]!, destination: PLACES[(from + step) % PLACES.length]! }
}

/**
 * A trip that ended before the verification, now closed: it expired (CHL says
 * how long ago, in its own words), or was completed at its destination.
 */
function previousTrip(record: MockRecord): MockTrip {
  const startedAt = record.recordedAt - (30 + draw(record, 1) * 90) * HOUR
  const paidAt = Math.round(startedAt - (10 + draw(record, 2) * 40) * MINUTE)
  const completed = draw(record, 3) < 0.45
  const expiredDaysAgo = (record.recordedAt - (startedAt + VALIDITY_MS)) / (24 * HOUR)
  return {
    ...transactionOf(record, 'verified'),
    plate: record.plate,
    transactionAt: paidAt,
    startedAt: Math.round(startedAt),
    paidAt,
    ...places(record),
    status: 'closed',
    statusMessage: completed ? null : `This trip has expired (${expiredDaysAgo} days ago)`,
    validity: { remainingSeconds: 0, reportedAt: record.recordedAt },
    detection: completed
      ? {
          status: 'trip_completed',
          reportedAt: Math.round(startedAt + (3 + draw(record, 4) * 15) * HOUR),
        }
      : null,
  }
}

/**
 * The trip CHL returned for a verification: the active trip; the expired or
 * completed one when only a previous trip was found; for "No Active Trip", the
 * most recent previous trip where CHL has one. None for other results.
 */
export function tripOf(record: MockRecord): MockTrip | null {
  switch (record.outcome) {
    case 'active_trip': {
      const startedAt = record.recordedAt - (1 + draw(record, 1) * 14) * HOUR
      const paidAt = Math.round(startedAt - (10 + draw(record, 2) * 40) * MINUTE)
      const detected = draw(record, 3) < 0.4
      return {
        ...transactionOf(record, 'verified'),
        plate: record.plate,
        transactionAt: paidAt,
        startedAt: Math.round(startedAt),
        paidAt,
        ...places(record),
        status: 'active',
        statusMessage: null,
        // Reported by CHL at the verification.
        validity: {
          remainingSeconds: Math.floor((startedAt + VALIDITY_MS - record.recordedAt) / 1000),
          reportedAt: record.recordedAt,
        },
        detection: detected
          ? {
              status: 'destination_detected',
              reportedAt: Math.round(
                startedAt + (record.recordedAt - startedAt) * (0.3 + draw(record, 4) * 0.6),
              ),
            }
          : null,
      }
    }
    case 'expired_trip':
      return previousTrip(record)
    case 'no_active_trip':
      return draw(record, 5) < 0.6 ? previousTrip(record) : null
    default:
      return null
  }
}

export interface MockActivation {
  /** When the payment was confirmed. */
  paidAt: number
  /** The trip CHL activated after payment, if it did. */
  trip: MockTrip | null
  complianceStatus: string | null
  updatedAt: number | null
}

/**
 * What CHL recorded after a demand notice was paid: the trip it activated, or
 * an updated compliance status, or nothing yet. Null when nothing was paid.
 */
export function activationOf(record: MockRecord, now: number): MockActivation | null {
  const violation = record.violation
  if (violation?.notice !== 'received') return null
  const paidAt = Math.round(Math.min(now, record.recordedAt + (1 + draw(record, 9) * 20) * HOUR))
  if (violation.tripActivated) {
    const startedAt = Math.round(Math.min(now, paidAt + (5 + draw(record, 10) * 40) * MINUTE))
    return {
      paidAt,
      trip: {
        ...transactionOf(record, 'activated'),
        plate: record.plate,
        transactionAt: paidAt,
        startedAt,
        paidAt,
        ...places(record),
        status: 'active',
        statusMessage: null,
        validity: { remainingSeconds: VALIDITY_MS / 1000, reportedAt: startedAt },
        detection: null,
      },
      complianceStatus: 'Compliant',
      updatedAt: startedAt,
    }
  }
  const updated = draw(record, 11) < 0.5
  return {
    paidAt,
    trip: null,
    complianceStatus: updated ? 'Compliant' : null,
    updatedAt: updated ? Math.round(Math.min(now, paidAt + 10 * MINUTE)) : null,
  }
}
