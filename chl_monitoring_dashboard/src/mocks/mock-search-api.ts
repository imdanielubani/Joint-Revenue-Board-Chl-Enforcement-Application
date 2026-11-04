import { isSearchable, matchesQuery } from '@/features/search/search-match'
import type { SearchApi } from '@/features/search/search.api'
import type {
  PaymentResult,
  SearchFilters,
  SearchResults,
  TripResult,
  VehicleResult,
  ViolationResult,
} from '@/features/search/search.schemas'
import { addDays, lagosDay } from '@/shared/lib/dates'
import { delay } from './delay'
import { MOCK_AGENTS } from './mock-agent-list'
import { HISTORY_DAYS } from './mock-records'
import { summarizeVerifications } from './mock-verifications-api'

const empty = (query: string): SearchResults => ({
  query,
  vehicles: [],
  agents: [],
  verifications: [],
  violations: [],
  payments: [],
  trips: [],
})

/**
 * The search over the sample records in an area: every sample verification
 * CHL holds there, and the sample agents. Each record appears once, at its
 * latest verification.
 */
export function summarizeSearch(
  { query, scope }: SearchFilters,
  now: number = Date.now(),
): SearchResults {
  if (!isSearchable(query)) return empty(query)
  const today = lagosDay(new Date(now))
  const { records } = summarizeVerifications(
    {
      scope,
      range: 'custom',
      from: addDays(today, -(HISTORY_DAYS - 1)),
      to: today,
      agentId: null,
      organization: null,
    },
    now,
  )

  const vehicles = new Map<string, VehicleResult>()
  const violations = new Map<string, ViolationResult>()
  const payments = new Map<string, PaymentResult>()
  const trips = new Map<string, TripResult>()
  // Newest first, so the first record seen for anything is its latest.
  for (const record of records) {
    if (matchesQuery(query, record.plate, record.vehicle.id)) {
      const seen = vehicles.get(record.plate)
      vehicles.set(
        record.plate,
        seen
          ? { ...seen, verifications: seen.verifications + 1 }
          : {
              plate: record.plate,
              vehicleId: record.vehicle.id,
              vehicleType: record.vehicle.type,
              verifications: 1,
              lastRecordedAt: record.recordedAt,
            },
      )
    }
    const { violation, payment, tripId } = record
    if (violation && !violations.has(violation.id) && matchesQuery(query, violation.id)) {
      violations.set(violation.id, {
        id: violation.id,
        plate: record.plate,
        category: violation.category,
        status: violation.status,
        recordedAt: record.recordedAt,
      })
    }
    if (violation && payment && !payments.has(payment.id) && matchesQuery(query, payment.id)) {
      payments.set(payment.id, {
        id: payment.id,
        violationId: violation.id,
        plate: record.plate,
        status: payment.status,
        recordedAt: record.recordedAt,
      })
    }
    if (tripId && !trips.has(tripId) && matchesQuery(query, tripId)) {
      trips.set(tripId, { reference: tripId, plate: record.plate, recordedAt: record.recordedAt })
    }
  }

  return {
    query,
    vehicles: [...vehicles.values()],
    agents: MOCK_AGENTS.filter((agent) => matchesQuery(query, agent.name, agent.id)).map(
      (agent) => ({ id: agent.id, name: agent.name, organization: agent.organization }),
    ),
    verifications: records.filter((record) => matchesQuery(query, record.reference)),
    violations: [...violations.values()],
    payments: [...payments.values()],
    trips: [...trips.values()],
  }
}

/** Sample data: from the sample verifications and agents. */
export const mockSearchApi: SearchApi = {
  async search(filters) {
    await delay()
    return summarizeSearch(filters)
  },
}
