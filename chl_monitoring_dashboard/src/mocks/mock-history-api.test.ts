import { describe, expect, it } from 'vitest'
import { verificationHistorySchema } from '@/features/history/history.schemas'
import { presetPeriod } from '@/features/overview/overview-period'
import { summarizeHistory } from './mock-history-api'
import { summarizeVerifications } from './mock-verifications-api'

const NOW = Date.parse('2026-10-18T12:00:00+01:00')
const TODAY = '2026-10-18'
const filters = (scope: string, range: '30d' | '90d' = '30d') => ({
  scope,
  range,
  ...presetPeriod(range, TODAY),
  agentId: null,
  organization: null,
})

describe('summarizeHistory', () => {
  it('returns data the schema accepts, newest first', () => {
    const result = summarizeHistory(filters('ng'), NOW)
    expect(verificationHistorySchema.safeParse(result).success).toBe(true)
    expect(result.records.length).toBeGreaterThan(0)
    const times = result.records.map((record) => Date.parse(record.recordedAt))
    expect(times).toEqual([...times].sort((a, b) => b - a))
  })

  it('holds every verification the Verifications page lists', () => {
    for (const scope of ['ng', 'la']) {
      const history = summarizeHistory(filters(scope), NOW)
      const verifications = summarizeVerifications(filters(scope), NOW)
      expect(history.latestReceivedAt).toBe(verifications.latestReceivedAt)
      expect(history.records.map((record) => record.reference)).toEqual(
        verifications.records.map((record) => record.reference),
      )
    }
  })

  it('reaches back beyond 30 days for a longer period', () => {
    const month = summarizeHistory(filters('ng', '30d'), NOW).records
    const quarter = summarizeHistory(filters('ng', '90d'), NOW).records
    expect(quarter.length).toBeGreaterThan(month.length)
  })

  it('links violations and payment requests to the attempts they came from', () => {
    const { records } = summarizeHistory(filters('ng'), NOW)
    expect(records.some((record) => record.violation)).toBe(true)
    expect(records.some((record) => record.payment)).toBe(true)
    for (const record of records) if (record.payment) expect(record.violation).not.toBeNull()
  })
})
