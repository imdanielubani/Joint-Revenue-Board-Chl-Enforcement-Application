import type { CommandCentreApi } from '@/features/command-centre/command-centre.api'
import {
  FIELD_REPORT_TYPES,
  type CommandCentre,
  type CommandCentreFilters,
  type CcWindow,
  type FeedItem,
} from '@/features/command-centre/command-centre.schemas'
import { presetPeriod } from '@/features/overview/overview-period'
import { lagosDay } from '@/shared/lib/dates'
import { delay } from './delay'
import { MOCK_AGENTS } from './mock-agents-api'
import { mockFieldReports, mockSos } from './mock-field-reports'
import { pointsWithin, summarize } from './mock-overview-api'
import { mockRecords, pointById, startOfDay, type MockRecord } from './mock-records'

/** How many entries the feed returns, newest first. */
const FEED_LIMIT = 150
/** How many field reports and loaded / empty confirmations are listed. */
const REPORT_LIMIT = 50

const NOTES = [
  'Driver said the trip was paid at the last checkpoint.',
  'Tag read twice; plate checked by hand.',
  'Front, rear and haulage-bay photographs taken.',
  'Driver cooperative; demand notice explained.',
  'Vehicle parked aside while the driver arranged payment.',
]

const agentName = (id: string) => MOCK_AGENTS.find((agent) => agent.id === id)?.name ?? id

/** Where a window starts: an hour or a day ago, midnight in Lagos, or a week ago. */
export function windowStart(window: CcWindow, now: number): number {
  if (window === '1h') return now - 3_600_000
  if (window === 'today') return startOfDay(lagosDay(new Date(now)))
  if (window === '24h') return now - 24 * 3_600_000
  return now - 7 * 24 * 3_600_000
}

function place(pointId: string) {
  const point = pointById.get(pointId)
  return { name: point?.name ?? pointId, area: point?.state ?? '', code: point?.code ?? '' }
}

/** A stable small number from an id, for sample photograph counts and notes. */
const numberOf = (id: string) => Number(id.replace(/\D/g, '')) || 0

/** Every feed entry the sample records stand for, up to now. */
function feedFrom(
  records: readonly MockRecord[],
  today: string,
  now: number,
): (FeedItem & { pointId: string; at: number })[] {
  const items: (FeedItem & { pointId: string; at: number })[] = []
  const base = (record: MockRecord) => ({
    agent: { id: record.agentId, name: agentName(record.agentId) },
    location: place(record.pointId),
    pointId: record.pointId,
    plate: record.plate,
    source: record.source,
    syncStatus: record.syncStatus,
    result: null,
    violation: null,
    payment: null,
    report: null,
    load: null,
    sos: null,
    evidenceCount: 0,
    note: null,
  })

  for (const record of records) {
    const violation = record.violation
    items.push({
      ...base(record),
      id: `ver-${record.id}`,
      kind: 'verification',
      at: record.recordedAt,
      recordedAt: new Date(record.recordedAt).toISOString(),
      receivedAt: new Date(record.receivedAt).toISOString(),
      result: record.outcome,
      violation: violation
        ? { id: violation.id, category: violation.category, status: violation.status }
        : null,
    })
    if (!violation) continue

    const issuedAt = record.recordedAt + 3 * 60_000
    const n = numberOf(violation.id)
    items.push({
      ...base(record),
      id: `vio-${violation.id}`,
      kind: 'violation',
      at: issuedAt,
      recordedAt: new Date(issuedAt).toISOString(),
      receivedAt: new Date(Math.max(issuedAt, record.receivedAt)).toISOString(),
      violation: { id: violation.id, category: violation.category, status: violation.status },
      evidenceCount: 2 + (n % 4),
      note: NOTES[n % NOTES.length] ?? null,
    })

    if (!violation.notice) continue
    const noticeId = `DN-${n}`
    const noticeAt = record.recordedAt + 6 * 60_000
    items.push({
      ...base(record),
      id: `pay-${noticeId}-issued`,
      kind: 'payment',
      at: noticeAt,
      recordedAt: new Date(noticeAt).toISOString(),
      receivedAt: new Date(noticeAt).toISOString(),
      source: null,
      syncStatus: null,
      payment: { noticeId, status: 'pending', tripActivated: false },
    })
    if (violation.notice === 'received') {
      const paidAt = record.recordedAt + (2 + (n % 20)) * 3_600_000
      items.push({
        ...base(record),
        id: `pay-${noticeId}-paid`,
        kind: 'payment',
        at: paidAt,
        recordedAt: new Date(paidAt).toISOString(),
        receivedAt: new Date(paidAt).toISOString(),
        source: null,
        syncStatus: null,
        payment: { noticeId, status: 'received', tripActivated: violation.tripActivated },
      })
    }
  }

  const { reports, loads } = mockFieldReports(today, now)
  for (const report of reports) {
    items.push({
      id: `fr-${report.id}`,
      kind: 'field_report',
      at: report.recordedAt,
      recordedAt: new Date(report.recordedAt).toISOString(),
      receivedAt: new Date(report.receivedAt).toISOString(),
      source: report.receivedAt - report.recordedAt > 10 * 60_000 ? 'offline' : 'live',
      syncStatus: 'synced',
      agent: { id: report.agentId, name: agentName(report.agentId) },
      location: place(report.pointId),
      pointId: report.pointId,
      plate: report.plate,
      result: null,
      violation: null,
      payment: null,
      report: { type: report.type, summary: report.summary },
      load: null,
      sos: null,
      evidenceCount: report.type === 'general' ? 0 : 1 + (numberOf(report.id) % 2),
      note: null,
    })
  }
  for (const load of loads) {
    items.push({
      id: `le-${load.id}`,
      kind: 'load_status',
      at: load.recordedAt,
      recordedAt: new Date(load.recordedAt).toISOString(),
      receivedAt: new Date(load.receivedAt).toISOString(),
      source: load.receivedAt - load.recordedAt > 10 * 60_000 ? 'offline' : 'live',
      syncStatus: 'synced',
      agent: { id: load.agentId, name: agentName(load.agentId) },
      location: place(load.pointId),
      pointId: load.pointId,
      plate: load.plate,
      result: null,
      violation: null,
      payment: null,
      report: null,
      load: load.status,
      sos: null,
      evidenceCount: 0,
      note: null,
    })
  }
  for (const alert of mockSos(today, now)) {
    items.push({
      id: `sos-${alert.id}`,
      kind: 'sos',
      at: alert.recordedAt,
      recordedAt: new Date(alert.recordedAt).toISOString(),
      receivedAt: new Date(alert.receivedAt).toISOString(),
      source: 'live',
      syncStatus: 'synced',
      agent: { id: alert.agentId, name: agentName(alert.agentId) },
      location: place(alert.pointId),
      pointId: alert.pointId,
      plate: null,
      result: null,
      violation: null,
      payment: null,
      report: null,
      load: null,
      sos: { status: alert.open ? 'open' : 'closed', message: alert.message },
      evidenceCount: 0,
      note: null,
    })
  }
  // Events still to come (a payment hours after the notice) are not shown yet.
  return items
    .filter((item) => item.at <= now && receivedTime(item) <= now)
    .sort((a, b) => receivedTime(b) - receivedTime(a) || b.at - a.at)
}

/** When CHL received an entry; its recorded time when the receipt time is not supplied. */
const receivedTime = (item: FeedItem & { at: number }) =>
  item.receivedAt ? Date.parse(item.receivedAt) : item.at

/** The Command centre for an area and window, counted from the sample records. */
export function summarizeCommandCentre(
  filters: CommandCentreFilters,
  now: number = Date.now(),
): CommandCentre {
  const today = lagosDay(new Date(now))
  const records = mockRecords(today, now)
  const points = pointsWithin(filters.scope)
  const from = windowStart(filters.window, now)

  // The window is when CHL received each entry: a record made offline days ago
  // and synced a minute ago is new activity.
  const everything = feedFrom(records, today, now).filter((item) => points.has(item.pointId))
  const inWindow = everything.filter((item) => receivedTime(item) >= from)

  // Cases open now, whenever they were raised (the last 90 days of records).
  const open = summarize(records, {
    scope: filters.scope,
    range: '90d',
    ...presetPeriod('90d', today),
    agentId: null,
    organization: null,
  })

  // The latest event recorded at each point, by when it happened there.
  const lastAt = new Map<string, number>()
  for (const item of everything) {
    lastAt.set(item.pointId, Math.max(lastAt.get(item.pointId) ?? 0, item.at))
  }
  const latestReceived = inWindow.reduce<number | null>((latest, item) => {
    const at = item.receivedAt ? Date.parse(item.receivedAt) : null
    return at !== null && (latest === null || at > latest) ? at : latest
  }, null)

  // SOS: those received in the window, and any still open whenever sent; open first.
  const sos = everything
    .filter((item) => item.sos && (item.sos.status === 'open' || receivedTime(item) >= from))
    .sort((a, b) => Number(b.sos?.status === 'open') - Number(a.sos?.status === 'open'))
  const reports = inWindow.filter((item) => item.kind === 'field_report')
  const loads = inWindow.filter((item) => item.kind === 'load_status')

  const strip = ({
    pointId: _pointId,
    at: _at,
    ...item
  }: FeedItem & { pointId: string; at: number }) => item

  return {
    window: { from: new Date(from).toISOString(), to: new Date(now).toISOString() },
    latestReceivedAt: latestReceived === null ? null : new Date(latestReceived).toISOString(),
    counts: { activity: inWindow.length },
    feed: inWindow.slice(0, FEED_LIMIT).map(strip),
    fieldReports: {
      total: reports.length,
      byType: FIELD_REPORT_TYPES.map((type) => ({
        type,
        count: reports.filter((item) => item.report?.type === type).length,
      })),
      items: reports.slice(0, REPORT_LIMIT).map(strip),
    },
    loadReports: {
      loaded: loads.filter((item) => item.load === 'loaded').length,
      empty: loads.filter((item) => item.load === 'empty').length,
      items: loads.slice(0, REPORT_LIMIT).map(strip),
    },
    sos: {
      open: sos.filter((item) => item.sos?.status === 'open').length,
      items: sos.map(strip),
    },
    cases: open.cases,
    repeatVehicles: open.repeatVehicles,
    locations: [...points].flatMap((pointId) => {
      const point = pointById.get(pointId)
      if (!point) return []
      const last = lastAt.get(pointId)
      return [
        {
          id: point.id,
          name: point.name,
          area: point.state,
          code: point.code,
          events: inWindow.filter((item) => item.pointId === pointId).length,
          lastEventAt: last === undefined ? null : new Date(last).toISOString(),
          position: { lat: point.lat, lng: point.lng },
        },
      ]
    }),
  }
}

/** Sample data: counted from the sample records and field reports. */
export const mockCommandCentreApi: CommandCentreApi = {
  async getCommandCentre(filters) {
    await delay()
    return summarizeCommandCentre(filters)
  },
}
