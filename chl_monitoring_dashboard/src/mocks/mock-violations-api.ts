import type { ViolationsApi } from '@/features/violations/violations.api'
import type {
  CaseAction,
  Closure,
  ViolationCase,
  ViolationsFilters,
  ViolationsMonitoring,
} from '@/features/violations/violations.schemas'
import { lagosDay } from '@/shared/lib/dates'
import { delay } from './delay'
import { MOCK_AGENTS } from './mock-agent-list'
import { notesOf } from './mock-evidence-api'
import { agentOf, noticeIdOf, numberOf, photographsOf, placeOf } from './mock-geography-api'
import { pointsWithin, summarize } from './mock-overview-api'
import { mockRecords, unit, type MockRecord } from './mock-records'
import { activationOf } from './mock-trips'
import { VEHICLE_TYPES, vehicleIdOf } from './mock-vehicles'

const HOUR = 3_600_000
const MINUTE = 60_000

/** The sample officers who act on cases in CHL. */
const SUPERVISOR = { id: 'JRB-SV-0011', name: 'Bola Adeyemi', role: 'Enforcement supervisor' }
const ADMINISTRATOR = { id: 'JRB-AD-0003', name: 'Ifeoma Okeke', role: 'Administrator' }

const CANCELLATION_REASONS = [
  'Duplicate report of the same stop',
  'Plate misread at verification',
  'Active trip confirmed on review',
]

const iso = (ms: number) => new Date(ms).toISOString()

/**
 * What was recorded on a case, and how it was closed or cancelled, as the
 * sample CHL records it: issued by the agent, a demand notice where one was
 * issued, escalation, payment, and the closing step with its actor and audit
 * reference where CHL supplies them.
 */
function historyOf(
  record: MockRecord,
  now: number,
): { actions: CaseAction[]; closure: Closure | null; paidAt: number | null } {
  const violation = record.violation!
  const number = numberOf(violation.id)
  const draw = (purpose: number) => unit(number * 17 + purpose)
  const at = (offset: number) => Math.round(Math.min(now, record.recordedAt + offset))
  const agent = { ...agentOf(record), role: 'Enforcement agent' }

  const actions: CaseAction[] = [
    { action: 'violation_issued', at: iso(record.recordedAt), actor: agent },
  ]
  if (violation.notice) {
    actions.push({ action: 'demand_notice_issued', at: iso(at(5 * MINUTE)), actor: null })
  }
  if (violation.status === 'escalated') {
    actions.push({ action: 'escalated', at: iso(at((2 + draw(1) * 28) * HOUR)), actor: SUPERVISOR })
  }
  const paidAt =
    violation.notice === 'received' ? (activationOf(record, now)?.paidAt ?? null) : null
  if (paidAt !== null) actions.push({ action: 'payment_received', at: iso(paidAt), actor: null })

  let closure: Closure | null = null
  if (violation.status === 'resolved') {
    // Closed on the payment's confirmation, or by an officer where no payment was due.
    const closedAt =
      paidAt !== null ? Math.min(now, paidAt + 10 * MINUTE) : at((4 + draw(2) * 36) * HOUR)
    closure = {
      outcome: 'resolved',
      at: iso(closedAt),
      actor: paidAt !== null ? null : SUPERVISOR,
      reason: paidAt !== null ? 'Payment confirmed' : null,
      auditReference: draw(3) < 0.75 ? `AUD-${number}` : null,
    }
  } else if (violation.status === 'cancelled') {
    closure = {
      outcome: 'cancelled',
      at: iso(at((3 + draw(4) * 45) * HOUR)),
      actor: draw(5) < 0.5 ? SUPERVISOR : ADMINISTRATOR,
      reason: CANCELLATION_REASONS[Math.floor(draw(6) * CANCELLATION_REASONS.length)]!,
      auditReference: `AUD-${number}`,
    }
  }
  if (closure) actions.push({ action: closure.outcome, at: closure.at, actor: closure.actor })
  actions.sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  return { actions, closure, paidAt }
}

/**
 * The violations for an area, period, agent and organization, as case
 * records, from the same sample records every view counts.
 */
export function summarizeViolations(
  filters: ViolationsFilters,
  now: number = Date.now(),
): ViolationsMonitoring {
  const { from, to, agentId, organization } = filters
  const points = pointsWithin(filters.scope)
  const organizationOf = new Map(MOCK_AGENTS.map((agent) => [agent.id, agent.organization]))
  const all = mockRecords(lagosDay(new Date(now)), now)
  const inScope = all.filter((record) => points.has(record.pointId))
  const records = inScope
    .filter(
      (record) =>
        record.violation !== null &&
        record.day >= from &&
        record.day <= to &&
        (!agentId || record.agentId === agentId) &&
        (!organization || organizationOf.get(record.agentId) === organization),
    )
    .sort((a, b) => b.recordedAt - a.recordedAt)
  // The repeat-vehicle alerts, as the Overview raises them for the same filters.
  const repeats = new Map(
    summarize(all, filters).repeatVehicles.items.map((item) => [item.plate, item]),
  )

  const cases = records.map((record): ViolationCase => {
    const violation = record.violation!
    const number = numberOf(violation.id)
    const { actions, closure, paidAt } = historyOf(record, now)
    const repeat = repeats.get(record.plate)
    return {
      id: violation.id,
      category: violation.category,
      status: violation.status,
      recordedAt: iso(record.recordedAt),
      receivedAt: iso(record.receivedAt),
      plate: record.plate,
      vehicleId: vehicleIdOf(record.plate),
      vehicleType: VEHICLE_TYPES[record.plate] ?? null,
      agent: agentOf(record),
      location: placeOf(record),
      position: record.position,
      verification: { reference: record.reference, outcome: record.outcome },
      evidence: {
        id: `EV-${number}`,
        photographs: photographsOf(violation.id),
        status: record.syncStatus === 'evidence_pending' ? 'pending' : 'received',
      },
      notes: notesOf(record),
      notice: violation.notice
        ? {
            id: noticeIdOf(violation.id),
            status: violation.notice,
            paidAt: paidAt === null ? null : iso(paidAt),
          }
        : null,
      actions,
      closure,
      repeatAlert: repeat ? { reports: repeat.reports, followUp: repeat.followUp } : null,
    }
  })

  const latest = inScope.reduce<number | null>(
    (max, record) => (max === null || record.receivedAt > max ? record.receivedAt : max),
    null,
  )
  return { latestReceivedAt: latest === null ? null : iso(latest), cases }
}

/** Sample data: from the sample records. Some cases need attention, so the sidebar shows its marker. */
export const mockViolationsApi: ViolationsApi = {
  async getSummary() {
    await delay()
    return { needingAttention: 3 }
  },
  async getMonitoring(filters) {
    await delay()
    return summarizeViolations(filters)
  },
}
