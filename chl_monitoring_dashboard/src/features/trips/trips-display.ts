import { humanize, outcomeLabel, outcomeStyle } from '@/features/overview/overview-display'
import type { Open } from '@/features/overview/overview.schemas'
import { formatDuration, formatShortDateTime } from '@/shared/lib/format'
import type { StatusTone } from '@/shared/ui/StatusLabel'
import type { DetectionStatus, Trip, TripCheckResult, TripStatus } from './trips.schemas'

/** A pill: its colour, label and, where it has one, icon. */
export interface Pill {
  tone: StatusTone
  label: string
  icon?: string
}

function isKnown<K extends string>(table: Record<K, unknown>, value: string): value is K {
  return Object.hasOwn(table, value)
}

const TRIP_STATUS_PILLS: Record<TripStatus, Pill> = {
  active: { tone: 'success', label: 'Trip Active', icon: 'overview/result-active.svg' },
  closed: { tone: 'neutral', label: 'Trip Closed' },
}

/** The trip status CHL returned; one it adds later is shown as it comes. */
export function tripStatusPill(status: Open<TripStatus>): Pill {
  return isKnown(TRIP_STATUS_PILLS, status)
    ? TRIP_STATUS_PILLS[status]
    : { tone: 'neutral', label: humanize(status) }
}

/**
 * What CHL returned for a vehicle's trip, named and coloured as the matching
 * verification outcome: "Active Trip", "No Active Trip", "No Trip History".
 */
export function checkResultPill(result: Open<TripCheckResult>): Pill {
  return { ...outcomeStyle(result), label: outcomeLabel(result) }
}

const DETECTION_LABELS: Record<DetectionStatus, string> = {
  destination_detected: 'Destination detected',
  trip_completed: 'Trip completed',
}

export function detectionPill(status: Open<DetectionStatus>): Pill {
  return {
    tone: status === 'trip_completed' ? 'success' : 'info',
    label: isKnown(DETECTION_LABELS, status) ? DETECTION_LABELS[status] : humanize(status),
  }
}

/** "Lagos · Ikeja": a trip's state and LGA as CHL records them. */
export function placeText(place: Trip['origin']): string {
  if (!place) return 'Not supplied'
  return place.lga ? `${place.state} · ${place.lga}` : place.state
}

/**
 * The trip validity countdown as CHL reported it — "18 h 20 min remaining" —
 * with when it was reported. Formatted only: never counted down or acted on here.
 */
export function validityText(validity: Trip['validity']): { main: string; sub?: string } {
  if (!validity) return { main: 'Not supplied' }
  return {
    main:
      validity.remainingSeconds > 0
        ? `${formatDuration(0, validity.remainingSeconds * 1000)} remaining`
        : 'None remaining',
    sub: `As reported by CHL, ${formatShortDateTime(validity.reportedAt)}`,
  }
}
