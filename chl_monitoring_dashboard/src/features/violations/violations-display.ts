import { actionStatusLabel, actionStatusTone, humanize } from '@/features/overview/overview-display'
import type { ActionStatus, Open } from '@/features/overview/overview.schemas'
import type { StatusTone } from '@/shared/ui/StatusLabel'
import type { ViolationCase } from './violations.schemas'

/** A pill: its colour, label and, where it has one, icon. */
export interface Pill {
  tone: StatusTone
  label: string
  icon?: string
}

const STATUS_ICONS: Partial<Record<ActionStatus, string>> = {
  payment_pending: 'overview/status-pending.svg',
  escalated: 'overview/status-escalated.svg',
}

/** The case's status as CHL returns it; a state it adds later is shown as it comes. */
export function statusPill(status: Open<ActionStatus>): Pill {
  const icon = STATUS_ICONS[status as ActionStatus]
  return {
    tone: actionStatusTone(status),
    label: actionStatusLabel(status),
    ...(icon ? { icon } : {}),
  }
}

/** The states that leave a case outstanding (SRD 8.4). */
export const UNRESOLVED_STATUSES: readonly string[] = [
  'payment_pending',
  'awaiting_action',
  'escalated',
]

export const isUnresolved = (item: ViolationCase) => UNRESOLVED_STATUSES.includes(item.status)
export const isClosed = (item: ViolationCase) => item.closure !== null

const ACTION_LABELS: Record<string, string> = {
  violation_issued: 'Violation issued',
  demand_notice_issued: 'Demand notice issued',
  escalated: 'Escalated',
  payment_received: 'Payment received',
  resolved: 'Closed',
  cancelled: 'Cancelled',
}

/** "Demand notice issued"; an action CHL adds later is shown as it comes. */
export const actionLabel = (action: string) =>
  Object.hasOwn(ACTION_LABELS, action) ? ACTION_LABELS[action]! : humanize(action)

/** Whether a case was closed or cancelled (SRD 8.5). */
export function closurePill(outcome: string): Pill {
  if (outcome === 'resolved') return { tone: 'success', label: 'Closed' }
  if (outcome === 'cancelled') return { tone: 'neutral', label: 'Cancelled' }
  return { tone: 'neutral', label: humanize(outcome) }
}

/** What is still outstanding on a case, from its status and its demand notice. */
export function pendingFollowUp(item: ViolationCase): string {
  if (!isUnresolved(item)) return 'None'
  const payment = item.notice?.status === 'pending' ? `Payment pending on ${item.notice.id}` : null
  if (item.status === 'payment_pending') return payment ?? actionStatusLabel(item.status)
  return [actionStatusLabel(item.status), payment].filter(Boolean).join(' · ')
}

/** "Lagos / Ojota enforcement point". */
export const placeText = (location: { name: string; area: string }) =>
  location.area ? `${location.area} / ${location.name}` : location.name

/** The text a register's search matches. */
export function searchTextOf(item: ViolationCase): string {
  return [
    item.id,
    item.category,
    actionStatusLabel(item.status),
    item.plate,
    item.vehicleId ?? '',
    item.agent.name,
    item.agent.id,
    item.location.name,
    item.location.area,
    item.verification.reference,
    item.notice?.id ?? '',
  ].join(' ')
}
