import { describe, expect, it } from 'vitest'
import { auditTrailSchema } from '@/features/audit/audit.schemas'
import { presetPeriod } from '@/features/overview/overview-period'
import { summarizeAuditTrail } from './mock-audit-api'
import { summarizeVerifications } from './mock-verifications-api'

const NOW = Date.parse('2026-10-18T12:00:00+01:00')
const TODAY = '2026-10-18'
const filters = (scope: string) => ({
  scope,
  range: '30d' as const,
  ...presetPeriod('30d', TODAY),
  agentId: null,
  organization: null,
})

describe('summarizeAuditTrail', () => {
  it('returns data the schema accepts, newest first', () => {
    const result = summarizeAuditTrail(filters('ng'), NOW)
    expect(auditTrailSchema.safeParse(result).success).toBe(true)
    expect(result.entries.length).toBeGreaterThan(0)
    const times = result.entries.map((entry) => Date.parse(entry.recordedAt))
    expect(times).toEqual([...times].sort((a, b) => b - a))
  })

  it('records every verification the Verifications page lists, successful or not', () => {
    for (const scope of ['ng', 'la']) {
      const audit = summarizeAuditTrail(filters(scope), NOW)
      const verifications = summarizeVerifications(filters(scope), NOW)
      expect(audit.latestReceivedAt).toBe(verifications.latestReceivedAt)
      expect(audit.entries.map((entry) => entry.reference)).toEqual(
        verifications.records.map((record) => record.reference),
      )
    }
  })

  it('masks RFID tags and shows QR codes and plates in full', () => {
    const { entries } = summarizeAuditTrail(filters('ng'), NOW)
    for (const entry of entries) {
      if (entry.method === 'rfid') {
        expect(entry.identifier).toMatchObject({ kind: 'rfid_tag', masked: true })
        expect(entry.identifier!.value).toMatch(/^•••• •••• [0-9A-F]{4}$/)
      } else if (entry.method === 'qr') {
        expect(entry.identifier).toMatchObject({ kind: 'qr_code', masked: false })
      } else if (entry.method === 'manual' || entry.method === 'ocr') {
        expect(entry.identifier).toEqual({ kind: 'plate', value: entry.plate, masked: false })
      }
    }
    expect(entries.some((entry) => entry.identifier?.kind === 'rfid_tag')).toBe(true)
  })

  it('gives each agent their organization and most records their device', () => {
    const { entries } = summarizeAuditTrail(filters('ng'), NOW)
    for (const entry of entries) {
      expect(entry.organization).not.toBeUndefined()
      if (entry.device) expect(entry.device.id).toMatch(/^JRB-MD-\d+$/)
    }
    expect(entries.some((entry) => entry.device === null)).toBe(true)
    expect(entries.filter((entry) => entry.device).length).toBeGreaterThan(entries.length / 2)
  })

  it('is the same for the same records, whenever it is asked', () => {
    expect(summarizeAuditTrail(filters('la'), NOW)).toEqual(summarizeAuditTrail(filters('la'), NOW))
  })
})
