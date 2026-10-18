import type { StatusTone } from '@/shared/ui/StatusLabel'
import {
  ACTION_STATUS_LABELS,
  ETAG_RESULT_LABELS,
  METHOD_LABELS,
  METHOD_TAGS,
  OUTCOME_LABELS,
  SOURCE_LABELS,
  SYNC_STATUS_LABELS,
  type ActionStatus,
  type EtagResult,
  type RecordSource,
  type SyncStatus,
  type FollowUp,
  type Open,
  type VerificationMethod,
  type VerificationOutcome,
} from './overview.schemas'

/** Each verification result's pill: its colour and icon, as in the design. */
const OUTCOME_STYLES: Record<VerificationOutcome, { tone: StatusTone; icon: string }> = {
  active_trip: { tone: 'success', icon: 'overview/result-active.svg' },
  vehicle_not_found: { tone: 'warning', icon: 'overview/result-not-found.svg' },
  no_trip_history: { tone: 'info', icon: 'overview/result-no-history.svg' },
  etag_missing: { tone: 'danger', icon: 'overview/result-etag.svg' },
  verification_unavailable: { tone: 'warning', icon: 'overview/result-unavailable.svg' },
  expired_trip: { tone: 'amber', icon: 'overview/result-expired.svg' },
  tag_vehicle_mismatch: { tone: 'danger', icon: 'overview/result-mismatch.svg' },
  no_active_trip: { tone: 'danger', icon: 'overview/result-no-active.svg' },
  invalid_etag: { tone: 'danger', icon: 'overview/result-etag.svg' },
}

const ACTION_STATUS_TONES: Record<ActionStatus, StatusTone> = {
  no_violation: 'success',
  awaiting_action: 'warning',
  payment_pending: 'warning',
  escalated: 'danger',
  resolved: 'success',
  cancelled: 'neutral',
}

/** Each method's icon and colour in the method card. */
const METHOD_STYLES: Record<VerificationMethod, { icon: string; color: string }> = {
  rfid: { icon: 'overview/method-rfid.svg', color: 'var(--method-rfid)' },
  qr: { icon: 'overview/method-qr.svg', color: 'var(--method-qr)' },
  ocr: { icon: 'overview/method-ocr.svg', color: 'var(--method-ocr)' },
  manual: { icon: 'overview/method-manual.svg', color: 'var(--method-manual)' },
}

const FOLLOW_UP_LABELS: Record<FollowUp, string> = {
  none: 'No follow-up recorded',
  partial: 'Partial follow-up',
}

function isKnown<K extends string>(table: Record<K, unknown>, value: string): value is K {
  return Object.hasOwn(table, value)
}

/** A value the dashboard does not know, made readable: "pending_review" becomes "Pending review". */
export function humanize(value: string): string {
  const words = value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
  return words ? `${words.charAt(0).toUpperCase()}${words.slice(1)}` : 'Unknown'
}

export function outcomeLabel(outcome: Open<VerificationOutcome>): string {
  return isKnown(OUTCOME_LABELS, outcome) ? OUTCOME_LABELS[outcome] : humanize(outcome)
}

/** The result's pill; an unknown result is grey, without an icon. */
export function outcomeStyle(outcome: Open<VerificationOutcome>): {
  tone: StatusTone
  icon?: string
} {
  return isKnown(OUTCOME_STYLES, outcome) ? OUTCOME_STYLES[outcome] : { tone: 'neutral' }
}

export function actionStatusLabel(status: Open<ActionStatus>): string {
  return isKnown(ACTION_STATUS_LABELS, status) ? ACTION_STATUS_LABELS[status] : humanize(status)
}

export function actionStatusTone(status: Open<ActionStatus>): StatusTone {
  return isKnown(ACTION_STATUS_TONES, status) ? ACTION_STATUS_TONES[status] : 'neutral'
}

/** The method's name in the method card: "OCR-confirmed". */
export function methodLabel(method: Open<VerificationMethod>): string {
  return isKnown(METHOD_LABELS, method) ? METHOD_LABELS[method] : humanize(method)
}

/** The method's tag in registers: "QR Code". */
export function methodTag(method: Open<VerificationMethod>): string {
  return isKnown(METHOD_TAGS, method) ? METHOD_TAGS[method] : humanize(method)
}

/** The method's icon and colour; an unknown method is grey, without an icon. */
export function methodStyle(method: Open<VerificationMethod>): { icon?: string; color: string } {
  return isKnown(METHOD_STYLES, method)
    ? METHOD_STYLES[method]
    : { color: 'var(--status-neutral-dot)' }
}

export function sourceLabel(source: Open<RecordSource>): string {
  return isKnown(SOURCE_LABELS, source) ? SOURCE_LABELS[source] : humanize(source)
}

export function syncStatusLabel(status: Open<SyncStatus>): string {
  return isKnown(SYNC_STATUS_LABELS, status) ? SYNC_STATUS_LABELS[status] : humanize(status)
}

export function etagResultLabel(result: Open<EtagResult>): string {
  return isKnown(ETAG_RESULT_LABELS, result) ? ETAG_RESULT_LABELS[result] : humanize(result)
}

const ETAG_RESULT_COLORS: Record<EtagResult, string> = {
  valid: 'var(--etag-valid)',
  missing: 'var(--etag-missing)',
  invalid: 'var(--etag-invalid)',
  mismatch: 'var(--etag-mismatch)',
}

/** A valid tag is green; each problem has its own warm colour; anything else is grey. */
export function etagResultColor(result: Open<EtagResult>): string {
  return isKnown(ETAG_RESULT_COLORS, result)
    ? ETAG_RESULT_COLORS[result]
    : 'var(--status-neutral-dot)'
}

export function followUpLabel(followUp: Open<FollowUp>): string {
  return isKnown(FOLLOW_UP_LABELS, followUp) ? FOLLOW_UP_LABELS[followUp] : humanize(followUp)
}

/** "1 agent" / "4 agents". */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`
}

/** `part` as a whole-number share of `total`, for bars. */
export function share(part: number, total: number): number {
  return total > 0 ? (part / total) * 100 : 0
}
