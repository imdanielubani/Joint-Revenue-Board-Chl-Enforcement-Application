import {
  actionStatusLabel,
  actionStatusTone,
  humanize,
  outcomeLabel,
  outcomeStyle,
} from '@/features/overview/overview-display'
import { formatDuration } from '@/shared/lib/format'
import type { StatusTone } from '@/shared/ui/StatusLabel'
import {
  FEED_KIND_LABELS,
  FIELD_REPORT_LABELS,
  SOS_TYPE_LABELS,
  type FeedItem,
  type FeedKind,
  type FieldReportType,
  type SosType,
} from './command-centre.schemas'

const isKind = (value: string): value is FeedKind => Object.hasOwn(FEED_KIND_LABELS, value)

export function feedKindLabel(kind: FeedItem['kind']): string {
  return isKind(kind) ? FEED_KIND_LABELS[kind] : humanize(kind)
}

export function fieldReportLabel(type: string): string {
  return Object.hasOwn(FIELD_REPORT_LABELS, type)
    ? FIELD_REPORT_LABELS[type as FieldReportType]
    : humanize(type)
}

/** "Threat or assault" and the other SOS types; one CHL adds later, made readable. */
export function sosTypeLabel(type: string): string {
  return Object.hasOwn(SOS_TYPE_LABELS, type) ? SOS_TYPE_LABELS[type as SosType] : humanize(type)
}

/** "Loaded", "Empty", or a status CHL adds later, made readable. */
export function loadLabel(load: string | null): string {
  if (load === 'loaded') return 'Loaded'
  if (load === 'empty') return 'Empty'
  return humanize(load ?? 'unknown')
}

/** An SOS notification's state: open in red; closed, or a state CHL adds later, in grey. */
export function sosStatus(status: string): { tone: StatusTone; label: string } {
  if (status === 'open') return { tone: 'danger', label: 'Open' }
  if (status === 'closed') return { tone: 'neutral', label: 'Closed' }
  return { tone: 'neutral', label: humanize(status) }
}

/** "Open for 42 min", "Closed after 25 min", or "Closed" when CHL gives no time. */
export function sosDuration(item: FeedItem, now: number): { text: string; open: boolean } | null {
  if (!item.sos) return null
  if (item.sos.status === 'open') {
    return { text: `Open for ${formatDuration(item.recordedAt, now)}`, open: true }
  }
  return {
    text: item.sos.closedAt
      ? `Closed after ${formatDuration(item.recordedAt, item.sos.closedAt)}`
      : 'Closed',
    open: false,
  }
}

/** Which enforcement point an entry or location is: its code, or its name without one. */
export function placeKey(place: { code: string; name: string }): string {
  return place.code || place.name
}

/** The coloured marker on each feed entry: what kind of event it is. */
const KIND_COLORS: Record<FeedKind, string> = {
  verification: 'var(--color-primary)',
  violation: 'var(--color-danger-strong)',
  payment: 'var(--amber)',
  field_report: 'var(--method-qr)',
  load_status: 'var(--status-neutral-dot)',
  sos: 'var(--color-danger)',
}

export function feedKindColor(kind: FeedItem['kind']): string {
  return isKind(kind) ? KIND_COLORS[kind] : 'var(--status-neutral-dot)'
}

/** The entry's headline: what happened, in a few words. */
export function feedTitle(item: FeedItem): string {
  if (item.kind === 'verification' && item.result) return outcomeLabel(item.result)
  if (item.kind === 'violation' && item.violation) return `Violation ${item.violation.id} issued`
  if (item.kind === 'payment' && item.payment) {
    if (item.payment.status === 'received') {
      return item.payment.tripActivated
        ? 'Payment received · trip activated'
        : 'Payment received · trip not yet activated'
    }
    if (item.payment.status === 'pending') return `Demand notice ${item.payment.noticeId} issued`
    return `${item.payment.noticeId}: ${humanize(item.payment.status)}`
  }
  if (item.kind === 'sos') return `SOS from ${item.agent.name}`
  if (item.kind === 'field_report' && item.report) return fieldReportLabel(item.report.type)
  if (item.kind === 'load_status' && item.load) {
    return item.load === 'loaded' || item.load === 'empty'
      ? `Reported ${item.load}`
      : loadLabel(item.load)
  }
  return feedKindLabel(item.kind)
}

/** The entry's status pill, where it has one. */
export function feedStatus(
  item: FeedItem,
): { tone: StatusTone; label: string; icon?: string } | null {
  if (item.kind === 'verification' && item.result) {
    return { ...outcomeStyle(item.result), label: outcomeLabel(item.result) }
  }
  if (item.sos) return sosStatus(item.sos.status)
  if (item.violation) {
    return {
      tone: actionStatusTone(item.violation.status),
      label: actionStatusLabel(item.violation.status),
    }
  }
  if (item.payment) {
    if (item.payment.status === 'received') {
      return item.payment.tripActivated
        ? { tone: 'success', label: 'Trip activated' }
        : { tone: 'amber', label: 'Paid · not activated' }
    }
    return item.payment.status === 'pending'
      ? { tone: 'amber', label: 'Awaiting payment' }
      : { tone: 'neutral', label: humanize(item.payment.status) }
  }
  if (item.load) {
    return { tone: item.load === 'loaded' ? 'info' : 'neutral', label: loadLabel(item.load) }
  }
  if (item.report) return { tone: 'info', label: fieldReportLabel(item.report.type) }
  return null
}

/** The feed's tabs; "Field reports" includes loaded / empty confirmations. */
export const FEED_VIEWS = ['all', 'verification', 'violation', 'payment', 'field'] as const
export type FeedView = (typeof FEED_VIEWS)[number]

export const VIEW_LABELS: Record<FeedView, string> = {
  all: 'All',
  verification: 'Verifications',
  violation: 'Violations',
  payment: 'Payments',
  field: 'Field reports',
}

export function inView(item: FeedItem, view: FeedView): boolean {
  if (view === 'all') return true
  if (view === 'field') return item.kind === 'field_report' || item.kind === 'load_status'
  return item.kind === view
}
