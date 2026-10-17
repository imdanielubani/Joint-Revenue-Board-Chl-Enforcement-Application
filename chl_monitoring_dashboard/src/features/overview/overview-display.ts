import type { StatusTone } from '@/shared/ui/StatusLabel'
import type { ActionStatus, VerificationMethod, VerificationOutcome } from './overview.schemas'

/** Each verification result's pill: its colour and icon, as in the design. */
export const OUTCOME_STYLES: Record<VerificationOutcome, { tone: StatusTone; icon: string }> = {
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

export const ACTION_STATUS_TONES: Record<ActionStatus, StatusTone> = {
  no_violation: 'success',
  awaiting_action: 'warning',
  payment_pending: 'warning',
  escalated: 'danger',
  resolved: 'success',
}

/** Each method's icon and colour in the method card. */
export const METHOD_STYLES: Record<VerificationMethod, { icon: string; color: string }> = {
  rfid: { icon: 'overview/method-rfid.svg', color: 'var(--method-rfid)' },
  qr: { icon: 'overview/method-qr.svg', color: 'var(--method-qr)' },
  ocr: { icon: 'overview/method-ocr.svg', color: 'var(--method-ocr)' },
  manual: { icon: 'overview/method-manual.svg', color: 'var(--method-manual)' },
}

/** "1 agent" / "4 agents". */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`
}

/** `part` as a whole-number share of `total`, for bars. */
export function share(part: number, total: number): number {
  return total > 0 ? (part / total) * 100 : 0
}
