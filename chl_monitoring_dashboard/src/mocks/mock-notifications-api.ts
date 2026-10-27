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
import {
  pointsWithin,
  qualifies,
  recordsIn,
  REPEAT_THRESHOLD,
  summarize,
} from './mock-overview-api'
import { mockRecords, pointById, startOfDay, type MockRecord } from './mock-records'

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

/** An enforcement notification (SRD 11.2) for a payment CHL confirmed. */
function paymentNotification(entry: Entry): Notification | null {
  if (entry.kind !== 'payment' || entry.payment?.status !== 'received') return null
  return {
    id: `ntf-${entry.id}`,
    category: 'enforcement',
    type: 'payment_received',
    title: `Payment received for ${entry.payment.noticeId}`,
    receivedAt: iso(receivedTime(entry)),
    read: false,
    plate: entry.plate,
    agent: entry.agent,
    location: entry.location,
    entry: strip(entry),
    repeatVehicle: null,
  }
}

/**
 * The repeat-vehicle notifications (SRD 11.1, 11.2): one for each vehicle the
 * period's alerts list, sent when its third qualifying report reached CHL.
 */
function repeatNotifications(
  records: readonly MockRecord[],
  filters: NotificationsFilters,
): Notification[] {
  const inPeriod = recordsIn(records, filters).filter(qualifies)
  return summarize(records, filters).repeatVehicles.items.flatMap((vehicle) => {
    const reports = inPeriod
      .filter((record) => record.plate === vehicle.plate)
      .sort((a, b) => a.recordedAt - b.recordedAt)
    const raised = reports[REPEAT_THRESHOLD - 1]
    if (!raised) return []
    const point = pointById.get(raised.pointId)
    return [
      {
        id: `ntf-repeat-${vehicle.plate}`,
        category: 'enforcement',
        type: 'repeat_vehicle',
        title: `Repeat vehicle ${vehicle.plate}`,
        receivedAt: iso(raised.receivedAt),
        read: false,
        plate: vehicle.plate,
        // Several agents reported it: the alert counts them, rather than naming one.
        agent: null,
        location: {
          name: point?.name ?? raised.pointId,
          area: point?.state ?? '',
          code: point?.code ?? '',
        },
        entry: null,
        repeatVehicle: vehicle,
      },
    ]
  })
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
  const records = mockRecords(today, now)
  const entries = feedFrom(records, today, now).filter((entry) => {
    const at = receivedTime(entry)
    return (
      points.has(entry.pointId) &&
      at >= from &&
      at < to &&
      (!filters.agentId || entry.agent.id === filters.agentId) &&
      (!filters.organization || organizationOf(entry.agent.id) === filters.organization)
    )
  })

  const notifications = [
    ...entries.flatMap((entry) => paymentNotification(entry) ?? fieldNotification(entry) ?? []),
    // An alert raised by reports CHL had not yet received by the period's end is not sent yet.
    ...repeatNotifications(records, filters).filter((item) => Date.parse(item.receivedAt) < to),
  ].sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt))
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
