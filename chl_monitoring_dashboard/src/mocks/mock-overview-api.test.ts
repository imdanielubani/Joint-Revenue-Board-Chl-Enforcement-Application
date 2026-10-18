import { describe, expect, it } from 'vitest'
import { presetPeriod } from '@/features/overview/overview-period'
import { overviewSchema, type OverviewFilters } from '@/features/overview/overview.schemas'
import { lagosDay } from '@/shared/lib/dates'
import { summarize } from './mock-overview-api'
import { mockRecords } from './mock-records'

const today = lagosDay()
const all = mockRecords(today)
const filters = (overrides: Partial<OverviewFilters> = {}): OverviewFilters => ({
  scope: 'ng',
  range: '30d',
  ...presetPeriod('30d', today),
  agentId: null,
  organization: null,
  ...overrides,
})

const CASES: [string, Partial<OverviewFilters>][] = [
  ['the whole country', {}],
  ['a state', { scope: 'la' }],
  ['one enforcement point', { scope: 'loc_ojota' }],
  ['an organization', { organization: 'Zone 2' }],
  ['an agent', { agentId: 'JRB-AG-0142' }],
  ['a quarter', { range: '90d', ...presetPeriod('90d', today) }],
  ['today', { range: 'today', ...presetPeriod('today', today) }],
]

describe('sample overview', () => {
  it.each(CASES)('adds up for %s', (_, overrides) => {
    const overview = summarize(all, filters(overrides))
    expect(overviewSchema.safeParse(overview).success).toBe(true)

    const { kpis } = overview
    const total = kpis.totalVerifications
    const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)
    expect(overview.recentActivity).toHaveLength(total)
    expect(sum(overview.dailyVerifications.map((day) => day.count))).toBe(total)
    expect(sum(overview.outcomes.map((item) => item.count))).toBe(total)
    expect(sum(overview.methods.map((item) => item.count))).toBe(total)
    expect(sum(overview.agents.map((agent) => agent.verifications))).toBe(total)
    expect(sum(overview.locations.map((location) => location.verifications))).toBe(total)
    expect(sum(overview.violationCategories.map((item) => item.count))).toBe(kpis.violationsIssued)
    expect(sum(overview.agents.map((agent) => agent.violationsIssued))).toBe(kpis.violationsIssued)
    expect(sum(overview.agents.map((agent) => agent.unresolved))).toBe(kpis.unresolvedViolations)
    expect(overview.cases.items).toHaveLength(kpis.unresolvedViolations)
    expect(kpis.escalatedViolations).toBeLessThanOrEqual(kpis.unresolvedViolations)
    expect(kpis.openRepeatAlerts).toBe(overview.repeatVehicles.items.length)
    expect(kpis.enforcementLocations).toBe(overview.locations.length)
    // Missing, fake and mismatched tags are exactly those outcomes; valid tags are on top.
    const outcome = (name: string) => overview.outcomes.find((item) => item.outcome === name)?.count
    const etag = (name: string) => overview.etagResults.find((item) => item.result === name)?.count
    expect(etag('missing')).toBe(outcome('etag_missing'))
    expect(etag('invalid')).toBe(outcome('invalid_etag'))
    expect(etag('mismatch')).toBe(outcome('tag_vehicle_mismatch'))
    expect(sum(overview.etagResults.map((item) => item.count))).toBeLessThanOrEqual(total)
  })

  it('keeps to the chosen area, agent, organization and days', () => {
    const lagos = summarize(all, filters({ scope: 'la' }))
    expect(new Set(lagos.recentActivity.map((record) => record.location.area))).toEqual(
      new Set(['Lagos']),
    )

    const tunde = summarize(all, filters({ agentId: 'JRB-AG-0142' }))
    expect(new Set(tunde.recentActivity.map((record) => record.agent.id))).toEqual(
      new Set(['JRB-AG-0142']),
    )

    const zone2 = summarize(all, filters({ organization: 'Zone 2' }))
    expect(new Set(zone2.agents.map((agent) => agent.organization))).toEqual(new Set(['Zone 2']))

    const week = summarize(all, filters({ range: '7d', ...presetPeriod('7d', today) }))
    const { from } = presetPeriod('7d', today)
    for (const record of week.recentActivity) {
      expect(lagosDay(new Date(record.recordedAt)) >= from).toBe(true)
    }
  })

  it('raises a repeat-vehicle alert only after three qualifying reports', () => {
    const overview = summarize(all, filters({ range: '90d', ...presetPeriod('90d', today) }))
    expect(overview.repeatVehicles.items.length).toBeGreaterThan(0)
    for (const vehicle of overview.repeatVehicles.items) {
      expect(vehicle.reports).toBeGreaterThanOrEqual(3)
    }
  })

  it('gives the same records every time for the same day', () => {
    expect(mockRecords(today)).toBe(mockRecords(today))
    const again = summarize(all, filters())
    expect(again).toEqual(summarize(all, filters()))
  })
})
