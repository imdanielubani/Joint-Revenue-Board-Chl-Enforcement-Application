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

  it('lists the areas directly under the scope, as the area tree has them', () => {
    expect(summarizeGeography(filters('ng'), NOW).areas.map((area) => area.id)).toEqual([
      'sw',
      'nw',
      'nc',
      'ss',
    ])
    expect(summarizeGeography(filters('la'), NOW).areas.map((area) => area.id)).toEqual([
      'la-ikeja',
      'la-apapa',
    ])
    // Levels are not assumed: Ikeja holds a ward and, directly, an enforcement point.
    const ikeja = summarizeGeography(filters('la-ikeja'), NOW).areas
    expect(ikeja.map((area) => [area.id, area.level])).toEqual([
      ['la-ikeja-ojota', 'ward'],
      ['loc_ikeja_gate', 'enforcement_point'],
    ])
  })

  it('counts each area as the Overview counts it, so the parts add up to the whole', () => {
    const records = mockRecords(TODAY, NOW)
    const whole = summarize(records, { ...filters('ng'), agentId: null, organization: null })
    const { areas } = summarizeGeography(filters('ng'), NOW)
    const sum = (pick: (area: (typeof areas)[number]) => number) =>
      areas.reduce((total, area) => total + pick(area), 0)
    expect(sum((area) => area.verifications)).toBe(whole.kpis.totalVerifications)
    expect(sum((area) => area.violations)).toBe(whole.kpis.violationsIssued)
    expect(sum((area) => area.unresolved)).toBe(whole.kpis.unresolvedViolations)
    expect(sum((area) => area.locations)).toBe(6)
  })

  it('has nothing under an enforcement point, and lists that point alone', () => {
    const point = summarizeGeography(filters('loc_ojota'), NOW)
    expect(point.areas).toEqual([])
    expect(point.locations.map((location) => location.id)).toEqual(['loc_ojota'])
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
