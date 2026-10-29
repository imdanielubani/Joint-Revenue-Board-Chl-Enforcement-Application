import { followUpLabel } from '@/features/overview/overview-display'
import type { Pill } from '@/features/violations/violations-display'
import type { ViolationCase } from '@/features/violations/violations.schemas'
import type { RepeatAlert } from './repeat-alerts.schemas'

/** The reports that count towards the alert: violations not cancelled. */
export const qualifyingCases = (alert: RepeatAlert): ViolationCase[] =>
  alert.cases.filter((item) => item.status !== 'cancelled')

export interface InvolvedAgent {
  id: string
  name: string
  /** Qualifying reports they made. */
  reports: number
  lastReportedAt: string
}

export interface InvolvedLocation {
  id: string
  name: string
  area: string
  code: string
  /** Qualifying reports made there. */
  reports: number
  lastReportedAt: string
}

/** Who reported the vehicle, most reports first (SRD 11.1, "involved agents"). */
export function involvedAgents(alert: RepeatAlert): InvolvedAgent[] {
  const byId = new Map<string, InvolvedAgent>()
  for (const item of qualifyingCases(alert)) {
    const known = byId.get(item.agent.id)
    byId.set(item.agent.id, {
      ...item.agent,
      reports: (known?.reports ?? 0) + 1,
      lastReportedAt: item.recordedAt,
    })
  }
  return [...byId.values()].sort((a, b) => b.reports - a.reports || a.name.localeCompare(b.name))
}

/** Where it was reported, most reports first (SRD 11.1, "involved locations"). */
export function involvedLocations(alert: RepeatAlert): InvolvedLocation[] {
  const byId = new Map<string, InvolvedLocation>()
  for (const item of qualifyingCases(alert)) {
    const known = byId.get(item.location.id)
    byId.set(item.location.id, {
      ...item.location,
      reports: (known?.reports ?? 0) + 1,
      lastReportedAt: item.recordedAt,
    })
  }
  return [...byId.values()].sort((a, b) => b.reports - a.reports || a.name.localeCompare(b.name))
}

export interface RecordedAction {
  /** Unique within the alert: the case and the action's place on it. */
  key: string
  case: ViolationCase
  action: ViolationCase['actions'][number]
}

/** Every action recorded on the plate's cases, oldest first (SRD 11.1, "recorded actions"). */
export function recordedActions(alert: RepeatAlert): RecordedAction[] {
  return alert.cases
    .flatMap((item) =>
      item.actions.map((action, index) => ({ key: `${item.id}-${index}`, case: item, action })),
    )
    .sort((a, b) => Date.parse(a.action.at) - Date.parse(b.action.at))
}

/** No follow-up in red, partial in amber; another state CHL adds is shown as it comes. */
export function followUpPill(followUp: string): Pill {
  if (followUp === 'none') return { tone: 'danger', label: followUpLabel(followUp) }
  if (followUp === 'partial') return { tone: 'amber', label: followUpLabel(followUp) }
  return { tone: 'neutral', label: followUpLabel(followUp) }
}

/** The notification filter's states: sent and unread, sent and read, or not sent. */
export const NOTIFIED_OPTIONS = [
  { value: 'unread', label: 'Sent, unread' },
  { value: 'read', label: 'Sent, read' },
  { value: 'none', label: 'Not sent' },
] as const

/** Whether the alert's notification matches the notification filter. */
export function matchesNotified(alert: RepeatAlert, notified: string): boolean {
  if (notified === 'none') return alert.notification === null
  if (!alert.notification) return false
  return notified === 'read' ? alert.notification.read : !alert.notification.read
}

/** What a register search looks through. */
export function searchTextOf(alert: RepeatAlert): string {
  return [
    alert.plate,
    alert.vehicleId ?? '',
    alert.vehicleType ?? '',
    alert.area,
    ...alert.cases.map((item) => item.id),
    ...involvedAgents(alert).flatMap((agent) => [agent.id, agent.name]),
    ...involvedLocations(alert).flatMap((location) => [location.name, location.code]),
  ].join(' ')
}
