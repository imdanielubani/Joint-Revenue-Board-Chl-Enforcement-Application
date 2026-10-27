import { describe, expect, it } from 'vitest'
import { fieldReportsSchema } from '@/features/field-reports/field-reports.schemas'
import { presetPeriod } from '@/features/overview/overview-period'
import { summarizeCommandCentre } from './mock-command-centre-api'
import { summarizeFieldReports } from './mock-field-reports-api'
import { summarizeNotifications } from './mock-notifications-api'

const NOW = Date.parse('2026-10-18T12:00:00+01:00')
const TODAY = '2026-10-18'
const filters = (scope: string, range: 'today' | '30d' = '30d') => ({
  scope,
  range,
  ...presetPeriod(range, TODAY),
  agentId: null,
  organization: null,
})
const ids = (items: readonly { id: string }[]) => items.map((item) => item.id).sort()

describe('summarizeFieldReports', () => {
  it('returns data the schema accepts, latest first', () => {
    const result = summarizeFieldReports(filters('ng'), NOW)
    expect(fieldReportsSchema.safeParse(result).success).toBe(true)
    expect(result.reports.length).toBeGreaterThan(0)
    expect(result.loadReports.length).toBeGreaterThan(0)
    for (const list of [result.reports, result.loadReports]) {
      const times = list.map((item) => Date.parse(item.receivedAt!))
      expect(times).toEqual([...times].sort((a, b) => b - a))
    }
    for (const item of result.reports) expect(item.kind).toBe('field_report')
    for (const item of result.loadReports) expect(item.kind).toBe('load_status')
  })

  it('lists the same reports the Command centre and Notifications received', () => {
    const result = summarizeFieldReports(filters('la', 'today'), NOW)
    const cc = summarizeCommandCentre({ scope: 'la', window: 'today' }, NOW)
    expect(ids(result.reports)).toEqual(ids(cc.fieldReports.items))
    expect(ids(result.loadReports)).toEqual(ids(cc.loadReports.items))
    const notified = summarizeNotifications(filters('la'), NOW).notifications.flatMap((item) =>
      item.entry && item.entry.kind !== 'sos' && item.category === 'field' ? [item.entry] : [],
    )
    const month = summarizeFieldReports(filters('la'), NOW)
    expect(ids(notified)).toEqual(ids([...month.reports, ...month.loadReports]))
  })

  it('keeps to the area, period, agent and organization asked for', () => {
    const all = summarizeFieldReports(filters('ng'), NOW)
    const lagos = summarizeFieldReports(filters('la'), NOW)
    expect(lagos.reports.length).toBeLessThan(all.reports.length)
    for (const item of lagos.reports) expect(item.location.area).toBe('Lagos')

    const agentId = lagos.reports[0]!.agent.id
    const mine = summarizeFieldReports({ ...filters('la'), agentId }, NOW)
    for (const item of [...mine.reports, ...mine.loadReports]) {
      expect(item.agent.id).toBe(agentId)
    }
    const zone = summarizeFieldReports({ ...filters('ng'), organization: 'Zone 2' }, NOW)
    for (const item of [...zone.reports, ...zone.loadReports]) {
      expect(['JRB-AG-0144', 'JRB-AG-0145']).toContain(item.agent.id)
    }
    const from = Date.parse('2026-09-19T00:00:00+01:00')
    for (const item of all.reports)
      expect(Date.parse(item.receivedAt!)).toBeGreaterThanOrEqual(from)
  })
})
