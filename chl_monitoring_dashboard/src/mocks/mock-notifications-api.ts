import type { FeedItem } from '@/features/command-centre/command-centre.schemas'
import type { NotificationsApi } from '@/features/notifications/notifications.api'
import type {
  Notification,
  Notifications,
  NotificationsFilters,
} from '@/features/notifications/notifications.schemas'
import { addDays, lagosDay } from '@/shared/lib/dates'
import { delay } from './delay'
import { MOCK_AGENTS } from './mock-agent-list'
import { feedFrom, receivedTime } from './mock-command-centre-api'
import { pointsWithin } from './mock-overview-api'
import { mockRecords, startOfDay } from './mock-records'

const iso = (ms: number) => new Date(ms).toISOString()
const organizationOf = (agentId: string) =>
  MOCK_AGENTS.find((agent) => agent.id === agentId)?.organization ?? null

type Entry = FeedItem & { pointId: string; at: number }

/** The entry without the sample-only fields the Command centre adds. */
const strip = ({ pointId: _pointId, at: _at, ...item }: Entry): FeedItem => item

/** A field notification (SRD 11.3): SOS, a report, or a loaded / empty confirmation. */
function fieldNotification(entry: Entry): Notification | null {
  const base = {
    category: 'field',
    receivedAt: iso(receivedTime(entry)),
    read: false,
    plate: entry.plate,
    agent: entry.agent,
    location: entry.location,
    entry: strip(entry),
    repeatVehicle: null,
  } as const
  if (entry.kind === 'sos') {
    return { ...base, id: `ntf-${entry.id}`, type: 'sos', title: `SOS from ${entry.agent.name}` }
  }
  if (entry.kind === 'field_report' && entry.report) {
    const type = entry.report.type === 'general' ? 'general' : `${entry.report.type}_report`
    return { ...base, id: `ntf-${entry.id}`, type, title: entry.report.summary }
  }
  if (entry.kind === 'load_status' && entry.load) {
    return {
      ...base,
      id: `ntf-${entry.id}`,
      type: 'load_status',
      title: `${entry.plate ?? 'Vehicle'} confirmed ${entry.load}`,
    }
  }
  return null
}

/**
 * The notifications CHL received in an area and period, from the same sample
 * records and field reports the Command centre shows, latest first.
 */
export function summarizeNotifications(
  filters: NotificationsFilters,
  now: number = Date.now(),
): Notifications {
  const today = lagosDay(new Date(now))
  const points = pointsWithin(filters.scope)
  const from = startOfDay(filters.from)
  const to = startOfDay(addDays(filters.to, 1))
  const entries = feedFrom(mockRecords(today, now), today, now).filter((entry) => {
    const at = receivedTime(entry)
    return (
      points.has(entry.pointId) &&
      at >= from &&
      at < to &&
      (!filters.agentId || entry.agent.id === filters.agentId) &&
      (!filters.organization || organizationOf(entry.agent.id) === filters.organization)
    )
  })

  const notifications = entries
    .flatMap((entry) => fieldNotification(entry) ?? [])
    .sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt))
  return {
    latestReceivedAt: notifications[0]?.receivedAt ?? null,
    notifications,
    // The sample backend, like the SRD, does not pass on agents' device notifications.
    operationalProvided: false,
  }
}

/** Sample data: six unread notifications, as in the design. */
export const mockNotificationsApi: NotificationsApi = {
  async getSummary() {
    await delay()
    return { unread: 6 }
  },
  async getNotifications(filters) {
    await delay()
    return summarizeNotifications(filters)
  },
}
