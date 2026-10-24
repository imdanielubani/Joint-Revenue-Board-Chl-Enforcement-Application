import { describe, expect, it } from 'vitest'
import { presetPeriod } from '@/features/overview/overview-period'
import {
  VIOLATION_CATEGORIES,
  violationsMonitoringSchema,
} from '@/features/violations/violations.schemas'
import { summarizeEvidence } from './mock-evidence-api'
import { summarizeGeography } from './mock-geography-api'
import { summarize } from './mock-overview-api'
import { mockRecords } from './mock-records'
import { summarizeViolations } from './mock-violations-api'

const NOW = Date.parse('2026-10-18T12:00:00+01:00')
const TODAY = '2026-10-18'
const filters = (scope: string) => ({
  scope,
  range: '30d' as const,
  ...presetPeriod('30d', TODAY),
  agentId: null,
  organization: null,
})

describe('summarizeViolations', () => {
  it('returns data the schema accepts', () => {
    const result = summarizeViolations(filters('ng'), NOW)
    expect(violationsMonitoringSchema.safeParse(result).success).toBe(true)
    expect(result.cases.length).toBeGreaterThan(0)
  })

  it('lists the violations every other view counts, newest first', () => {
    const { cases } = summarizeViolations(filters('la'), NOW)
    const geography = summarizeGeography(filters('la'), NOW).records.violations
    expect(cases.map((item) => item.id)).toEqual(geography.map((item) => item.id))
    expect(cases).toHaveLength(
      summarize(mockRecords(TODAY, NOW), filters('la')).kpis.violationsIssued,
    )
  })

  it('uses only the documented categories, the tag-vehicle mismatch among them', () => {
    const { cases } = summarizeViolations(filters('ng'), NOW)
    const known: readonly string[] = VIOLATION_CATEGORIES
    for (const item of cases) expect(known).toContain(item.category)
    expect(cases.some((item) => item.category === 'Tag-Vehicle Mismatch')).toBe(true)
  })

  it('links each case to its evidence and notes, as Evidence records shows them', () => {
    const { cases } = summarizeViolations(filters('ng'), NOW)
    const evidence = new Map(
      summarizeEvidence(filters('ng'), NOW).records.map((entry) => [entry.violation.id, entry]),
    )
    for (const item of cases) {
      const entry = evidence.get(item.id)!
      expect(item.evidence?.id).toBe(entry.id)
      expect(item.evidence?.photographs).toBe(entry.photographs.length)
      expect(item.notes).toEqual(entry.notes)
    }
  })

  it('records a payment date only once payment is received', () => {
    const { cases } = summarizeViolations(filters('ng'), NOW)
    for (const item of cases) {
      if (!item.notice) continue
      expect(item.notice.paidAt !== null).toBe(item.notice.status === 'received')
    }
  })

  it('records the actions in order, closing only resolved or cancelled cases', () => {
    const { cases } = summarizeViolations(filters('ng'), NOW)
    for (const item of cases) {
      const times = item.actions.map((action) => Date.parse(action.at))
      expect([...times].sort((a, b) => a - b)).toEqual(times)
      expect(item.actions[0]?.action).toBe('violation_issued')
      for (const time of times) expect(time).toBeLessThanOrEqual(NOW)
      const closed = item.status === 'resolved' || item.status === 'cancelled'
      expect(item.closure !== null).toBe(closed)
      if (item.closure) expect(item.closure.outcome).toBe(item.status)
      if (item.status === 'cancelled') expect(item.closure?.actor).not.toBeNull()
    }
  })

  it('flags the repeat-vehicle alerts the Overview raises', () => {
    const { cases } = summarizeViolations(filters('ng'), NOW)
    const repeats = new Set(
      summarize(mockRecords(TODAY, NOW), filters('ng')).repeatVehicles.items.map(
        (item) => item.plate,
      ),
    )
    for (const item of cases) expect(item.repeatAlert !== null).toBe(repeats.has(item.plate))
  })
})
