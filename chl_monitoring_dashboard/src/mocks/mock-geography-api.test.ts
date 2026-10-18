import { describe, expect, it } from 'vitest'
import { geographySchema } from '@/features/geography/geography.schemas'
import { presetPeriod } from '@/features/overview/overview-period'
import { summarizeGeography } from './mock-geography-api'
import { summarize } from './mock-overview-api'
import { mockRecords } from './mock-records'

const NOW = Date.parse('2026-10-18T12:00:00+01:00')
const TODAY = '2026-10-18'
const filters = (scope: string) => ({ scope, range: '30d' as const, ...presetPeriod('30d', TODAY) })

describe('summarizeGeography', () => {
  it('returns data the schema accepts', () => {
    expect(geographySchema.safeParse(summarizeGeography(filters('ng'), NOW)).success).toBe(true)
  })

  it('lists the underlying records the Overview counts, newest first', () => {
    const records = mockRecords(TODAY, NOW)
    const whole = summarize(records, { ...filters('la'), agentId: null, organization: null })
    const geo = summarizeGeography(filters('la'), NOW).records
    expect(geo.verifications).toHaveLength(whole.kpis.totalVerifications)
    expect(geo.violations).toHaveLength(whole.kpis.violationsIssued)
    expect(geo.notices).toHaveLength(whole.payments.received + whole.payments.pending)
    expect(geo.notices.filter((notice) => notice.status === 'received')).toHaveLength(
      whole.payments.received,
    )
    const times = geo.verifications.map((record) => Date.parse(record.recordedAt))
    expect([...times].sort((a, b) => b - a)).toEqual(times)
    for (const notice of geo.notices) {
      expect(
        geo.violations.find((violation) => violation.id === notice.violationId)?.noticeId,
      ).toBe(notice.id)
    }
  })

  it('gives each record the GPS its device captured near its location, or none', () => {
    const { verifications } = summarizeGeography(filters('ng'), NOW).records
    const { locations } = summarizeGeography(filters('ng'), NOW)
    const at = new Map(locations.map((location) => [location.id, location.position!]))
    for (const record of verifications) {
      if (!record.position) continue
      const point = at.get(record.location.id)!
      expect(Math.abs(record.position.lat - point.lat)).toBeLessThan(0.003)
      expect(Math.abs(record.position.lng - point.lng)).toBeLessThan(0.003)
    }
    expect(verifications.some((record) => record.position)).toBe(true)
  })

  it('lists an enforcement location alone at its own scope', () => {
    const point = summarizeGeography(filters('loc_ojota'), NOW)
    expect(point.locations.map((location) => location.id)).toEqual(['loc_ojota'])
    expect(point.records.verifications.every((record) => record.location.id === 'loc_ojota')).toBe(
      true,
    )
  })

  it('lists every enforcement point in scope with its recorded position', () => {
    const { locations } = summarizeGeography(filters('la'), NOW)
    expect(locations.map((location) => location.id).sort()).toEqual([
      'loc_apapa',
      'loc_ikeja_gate',
      'loc_ojota',
    ])
    for (const location of locations) expect(location.position).not.toBeNull()
  })
})
