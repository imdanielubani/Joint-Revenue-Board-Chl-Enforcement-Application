import { describe, expect, it } from 'vitest'
import { presetPeriod } from '@/features/overview/overview-period'
import { verificationsMonitoringSchema } from '@/features/verifications/verifications.schemas'
import { summarizeGeography } from './mock-geography-api'
import { summarize } from './mock-overview-api'
import { mockRecords } from './mock-records'
import { summarizeVerifications } from './mock-verifications-api'

const NOW = Date.parse('2026-10-18T12:00:00+01:00')
const TODAY = '2026-10-18'
const filters = (scope: string, people: { agentId?: string; organization?: string } = {}) => ({
  scope,
  range: '30d' as const,
  ...presetPeriod('30d', TODAY),
  agentId: people.agentId ?? null,
  organization: people.organization ?? null,
})

describe('summarizeVerifications', () => {
  it('returns data the schema accepts', () => {
    const result = summarizeVerifications(filters('ng'), NOW)
    expect(verificationsMonitoringSchema.safeParse(result).success).toBe(true)
    expect(result.records.length).toBeGreaterThan(0)
  })

  it('lists the verifications the Overview and geographical monitoring count, newest first', () => {
    const whole = summarize(mockRecords(TODAY, NOW), filters('la'))
    const { records } = summarizeVerifications(filters('la'), NOW)
    expect(records).toHaveLength(whole.kpis.totalVerifications)
    expect(records.map((record) => record.reference)).toEqual(
      summarizeGeography(filters('la'), NOW).records.verifications.map(
        (record) => record.reference,
      ),
    )
    const times = records.map((record) => Date.parse(record.recordedAt))
    expect([...times].sort((a, b) => b - a)).toEqual(times)
  })

  it('narrows to one agent, or one organization', () => {
    const one = summarizeVerifications(filters('ng', { agentId: 'JRB-AG-0142' }), NOW).records
    expect(one.length).toBeGreaterThan(0)
    expect(one.every((record) => record.agent.id === 'JRB-AG-0142')).toBe(true)
    const zone = summarizeVerifications(filters('ng', { organization: 'Zone 2' }), NOW).records
    expect(zone.length).toBeGreaterThan(0)
    expect(zone.some((record) => record.agent.id === 'JRB-AG-0142')).toBe(false)
  })

  it('keeps an unavailable verification apart from a missing E-Tag or no active trip', () => {
    const { records } = summarizeVerifications(filters('ng'), NOW)
    const unavailable = records.filter((record) => record.result === 'verification_unavailable')
    expect(unavailable.length).toBeGreaterThan(0)
    for (const record of unavailable) {
      expect(record.etag).not.toBe('missing')
      expect(record.result).not.toBe('no_active_trip')
      expect(record.violation).toBeNull()
    }
  })

  it('records a missing tag only from a missing-tag result, never from a failed read', () => {
    const { records } = summarizeVerifications(filters('ng'), NOW)
    for (const record of records) {
      expect(record.etag === 'missing').toBe(record.result === 'etag_missing')
    }
  })

  it('resolves a vehicle unless the plate was not found, and links trips, cases and payments', () => {
    const { records } = summarizeVerifications(filters('ng'), NOW)
    for (const record of records) {
      expect(record.vehicle.id === null).toBe(record.result === 'vehicle_not_found')
      expect(record.tripId !== null).toBe(
        record.result === 'active_trip' || record.result === 'expired_trip',
      )
      if (record.payment) expect(record.violation).not.toBeNull()
      expect(record.actionTaken === 'violation_issued').toBe(record.violation !== null)
    }
    // A plate keeps one vehicle ID wherever it resolved.
    const ids = new Map<string, Set<string>>()
    for (const record of records) {
      if (record.vehicle.id)
        ids.set(record.plate, (ids.get(record.plate) ?? new Set()).add(record.vehicle.id))
    }
    for (const set of ids.values()) expect(set.size).toBe(1)
  })

  it('says where each result came from; only CHL’s own checks carry an attempt status', () => {
    const { records } = summarizeVerifications(filters('ng'), NOW)
    const kinds = new Set(records.map((record) => record.provenance))
    expect(kinds).toEqual(new Set(['live_backend', 'cached_result', 'offline_origin']))
    for (const record of records) {
      expect(record.provenance === 'live_backend').toBe(record.source === 'live')
      expect(record.attempt !== null).toBe(record.provenance === 'live_backend')
    }
  })
})
