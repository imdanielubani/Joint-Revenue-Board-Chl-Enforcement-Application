import type { AuditApi } from '@/features/audit/audit.api'
import type { AuditEntry, AuditFilters, AuditTrail } from '@/features/audit/audit.schemas'
import type { VerificationEntry } from '@/features/verifications/verifications.schemas'
import { delay } from './delay'
import { MOCK_AGENTS } from './mock-agent-list'
import { unit } from './mock-records'
import { summarizeVerifications } from './mock-verifications-api'

/** A stable number for a reference, so its sample identifier and device never change. */
const seedOf = (reference: string) =>
  [...reference].reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 7), 0)

const HEX = '0123456789ABCDEF'
const hex = (seed: number, length: number) =>
  Array.from({ length }, (_, index) => HEX[Math.floor(unit(seed * 31 + index) * 16)]).join('')

/**
 * What the verification processed, as an administrator may see it: an RFID
 * tag only by its last four characters, a QR code and a plate in full.
 */
function identifierOf(entry: VerificationEntry, seed: number): AuditEntry['identifier'] {
  switch (entry.method) {
    case 'rfid':
      return { kind: 'rfid_tag', value: `•••• •••• ${hex(seed, 4)}`, masked: true }
    case 'qr':
      return { kind: 'qr_code', value: `QR-${hex(seed, 8)}`, masked: false }
    case 'manual':
    case 'ocr':
      return { kind: 'plate', value: entry.plate, masked: false }
    default:
      return null
  }
}

/** Each agent's handset; about one record in ten carries no device details. */
function deviceOf(entry: VerificationEntry, seed: number): AuditEntry['device'] {
  if (unit(seed * 13 + 3) < 0.1) return null
  return {
    id: `JRB-MD-${entry.agent.id.replace(/\D/g, '')}`,
    appVersion: unit(seed * 17 + 5) < 0.7 ? '2.4.1' : '2.4.0',
  }
}

/**
 * The audit trail for an area, period, agent and organization: every
 * verification the Verifications page lists, with its audit fields, so every
 * view agrees.
 */
export function summarizeAuditTrail(filters: AuditFilters, now: number = Date.now()): AuditTrail {
  const { latestReceivedAt, records } = summarizeVerifications(filters, now)
  const organizationOf = new Map(MOCK_AGENTS.map((agent) => [agent.id, agent.organization]))
  return {
    latestReceivedAt,
    entries: records.map((entry) => {
      const seed = seedOf(entry.reference)
      return {
        ...entry,
        organization: organizationOf.get(entry.agent.id) ?? null,
        identifier: identifierOf(entry, seed),
        device: deviceOf(entry, seed),
      }
    }),
  }
}

/** Sample data: from the sample verifications. */
export const mockAuditApi: AuditApi = {
  async getAuditTrail(filters) {
    await delay()
    return summarizeAuditTrail(filters)
  },
}
