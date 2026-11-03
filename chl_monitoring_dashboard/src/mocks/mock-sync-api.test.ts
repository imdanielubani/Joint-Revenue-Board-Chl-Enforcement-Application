import { describe, expect, it } from 'vitest'
import { presetPeriod } from '@/features/overview/overview-period'
import { synchronizationSchema } from '@/features/sync/sync.schemas'
import { syncStateOf } from '@/features/verifications/verifications-display'
import { summarizeSync } from './mock-sync-api'
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

describe('summarizeSync', () => {
  it('returns data the schema accepts, newest first', () => {
    const result = summarizeSync(filters('ng'), NOW)
    expect(synchronizationSchema.safeParse(result).success).toBe(true)
    const times = result.records.map((record) => Date.parse(record.recordedAt))
    expect(times.length).toBeGreaterThan(0)
    expect(times).toEqual([...times].sort((a, b) => b - a))
  })

  it('holds the records the Verifications page lists', () => {
    for (const scope of ['ng', 'la']) {
      const sync = summarizeSync(filters(scope), NOW)
      const verifications = summarizeVerifications(filters(scope), NOW)
      expect(sync.latestReceivedAt).toBe(verifications.latestReceivedAt)
      expect(sync.records.map((record) => record.reference)).toEqual(
        verifications.records.map((record) => record.reference),
      )
    }
  })

  it('has records made offline, received late and with evidence still uploading', () => {
    const { records } = summarizeSync(filters('ng'), NOW)
    expect(records.some((record) => record.provenance === 'offline_origin')).toBe(true)
    expect(records.some((record) => syncStateOf(record) === 'received_late')).toBe(true)
    expect(records.some((record) => syncStateOf(record) === 'upload_pending')).toBe(true)
    for (const record of records) {
      if (record.receivedAt) {
        expect(Date.parse(record.receivedAt)).toBeGreaterThanOrEqual(Date.parse(record.recordedAt))
      }
    }
  })
})
