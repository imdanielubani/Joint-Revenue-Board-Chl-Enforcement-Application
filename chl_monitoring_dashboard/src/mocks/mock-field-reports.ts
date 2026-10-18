import type { FieldReportType, LoadStatus } from '@/features/command-centre/command-centre.schemas'
import { addDays, type CalendarDay } from '@/shared/lib/dates'
import { MOCK_AGENTS } from './mock-agents-api'
import { AGENT_POINTS, HISTORY_DAYS, PLATES, pick, seeded, startOfDay } from './mock-records'

/**
 * Sample reports agents send from the mobile application: vehicle, driver and
 * situation reports, general notifications, and loaded / empty confirmations.
 * Seeded, so the same day always gives the same reports.
 */

export interface MockFieldReport {
  id: string
  type: FieldReportType
  summary: string
  agentId: string
  pointId: string
  plate: string | null
  recordedAt: number
  receivedAt: number
}

export interface MockLoadReport {
  id: string
  status: LoadStatus
  plate: string
  agentId: string
  pointId: string
  recordedAt: number
  receivedAt: number
}

const SUMMARIES: Record<FieldReportType, string[]> = {
  vehicle: [
    'Truck parked across the approach lane at the checkpoint.',
    'Vehicle turned back before reaching the checkpoint.',
    'Trailer without a rear plate seen heading north.',
  ],
  driver: [
    'Driver declined to stop when signalled; plate recorded.',
    'Driver presented a printed trip from an earlier date.',
    'Driver asked to call the transporter before paying.',
  ],
  situation: [
    'Heavy traffic at the checkpoint; queue past one kilometre.',
    'Road works narrowing the approach lane.',
    'Heavy rain reducing visibility at the checkpoint.',
  ],
  general: [
    'RFID reader replaced; checks resumed.',
    'Shift handover completed.',
    'Checkpoint signage damaged and reported.',
  ],
}

const REPORT_TYPES: [FieldReportType, number][] = [
  ['vehicle', 4],
  ['driver', 3],
  ['situation', 2],
  ['general', 2],
]

/** Today's reports arrive this far apart, up to now. */
const TODAY_SPACING_MS = 33 * 60_000

function generate(today: CalendarDay, now: number) {
  const random = seeded(20_261_019)
  const reports: MockFieldReport[] = []
  const loads: MockLoadReport[] = []

  const place = (daysAgo: number, index: number, count: number) => {
    const day = addDays(today, -daysAgo)
    const start = startOfDay(day)
    const recordedAt =
      daysAgo === 0
        ? Math.min(
            now,
            Math.max(
              start + (index + 1) * 60_000,
              now - (count - index) * TODAY_SPACING_MS - 7 * 60_000,
            ),
          )
        : start + (7 + random() * 11) * 3_600_000
    return Math.round(recordedAt)
  }
  const agentAndPoint = () => {
    const agent = MOCK_AGENTS[Math.floor(random() * MOCK_AGENTS.length)]!
    const points = AGENT_POINTS[agent.id] ?? []
    return {
      agentId: agent.id,
      pointId: points[Math.floor(random() * points.length)] ?? 'loc_ojota',
    }
  }
  const received = (recordedAt: number) =>
    Math.round(
      Math.min(now, recordedAt + (random() < 0.2 ? (25 + random() * 80) * 60_000 : 45_000)),
    )

  for (let daysAgo = HISTORY_DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
    const reportCount = daysAgo === 0 ? 2 : Math.floor(random() * 3)
    for (let index = 0; index < reportCount; index += 1) {
      const type = pick(random, REPORT_TYPES)
      const options = SUMMARIES[type]
      const recordedAt = place(daysAgo, index, reportCount)
      reports.push({
        id: '',
        type,
        summary: options[Math.floor(random() * options.length)]!,
        ...agentAndPoint(),
        plate: type === 'vehicle' || type === 'driver' ? pick(random, PLATES) : null,
        recordedAt,
        receivedAt: received(recordedAt),
      })
    }
    const loadCount = daysAgo === 0 ? 3 : 1 + Math.floor(random() * 3)
    for (let index = 0; index < loadCount; index += 1) {
      const recordedAt = place(daysAgo, index, loadCount) - 4 * 60_000
      loads.push({
        id: '',
        status: random() < 0.62 ? 'loaded' : 'empty',
        plate: pick(random, PLATES),
        ...agentAndPoint(),
        recordedAt,
        receivedAt: received(recordedAt),
      })
    }
  }

  reports.sort((a, b) => a.recordedAt - b.recordedAt)
  loads.sort((a, b) => a.recordedAt - b.recordedAt)
  return {
    reports: reports.map((report, index) => ({ ...report, id: `FR-${5200 + index}` })),
    loads: loads.map((load, index) => ({ ...load, id: `LE-${8100 + index}` })),
  }
}

let cache: { today: CalendarDay; data: ReturnType<typeof generate> } | null = null

/** The sample field reports and loaded / empty confirmations for the 90 days ending `today`. */
export function mockFieldReports(today: CalendarDay, now: number = Date.now()) {
  if (cache?.today !== today) cache = { today, data: generate(today, now) }
  return cache.data
}
