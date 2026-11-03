import type { FieldStatusApi } from '@/features/field-status/field-status.api'
import type {
  DeviceStatus,
  FieldStatus,
  FieldStatusFilters,
} from '@/features/field-status/field-status.schemas'
import type { VerificationEntry } from '@/features/verifications/verifications.schemas'
import { delay } from './delay'
import { MOCK_AGENTS } from './mock-agent-list'
import { unit } from './mock-records'
import { summarizeVerifications } from './mock-verifications-api'

/** Musa Ibrahim's device sends no RFID reader status: the page shows it as not supplied. */
const NO_READER_STATUS = 'JRB-AG-0144'

/**
 * Each agent's device status as reported with their latest record: offline
 * when the record was sent later, GPS off when it carries no position, the
 * reader connected when it read a tag by RFID.
 */
function statusOf(record: VerificationEntry): DeviceStatus {
  const index = Number(record.id.replace(/\D/g, ''))
  return {
    agent: record.agent,
    organization: MOCK_AGENTS.find((agent) => agent.id === record.agent.id)?.organization ?? null,
    location: record.location,
    reportedAt: record.recordedAt,
    receivedAt: record.receivedAt,
    rfidReader:
      record.agent.id === NO_READER_STATUS
        ? null
        : record.method === 'rfid' || unit(index * 11 + 3) < 0.5
          ? 'connected'
          : 'disconnected',
    internet: record.source === 'offline' ? 'disconnected' : 'connected',
    gps: record.position ? 'enabled' : 'disabled',
  }
}

/**
 * Agents' last-reported device status for an area, period, agent and
 * organization, from the same sample records as every other view. An agent
 * who recorded nothing in the period has no report to show.
 */
export function summarizeFieldStatus(
  filters: FieldStatusFilters,
  now: number = Date.now(),
): FieldStatus {
  const { latestReceivedAt, records } = summarizeVerifications(filters, now)
  const latest = new Map<string, VerificationEntry>()
  // Newest first, so the first record seen for an agent is their latest.
  for (const record of records)
    if (!latest.has(record.agent.id)) latest.set(record.agent.id, record)
  return {
    provided: true,
    latestReceivedAt,
    devices: [...latest.values()].map(statusOf),
  }
}

/** Sample data: from the sample verifications. */
export const mockFieldStatusApi: FieldStatusApi = {
  async getFieldStatus(filters) {
    await delay()
    return summarizeFieldStatus(filters)
  },
}
