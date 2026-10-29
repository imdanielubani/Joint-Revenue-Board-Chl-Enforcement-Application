import { describe, expect, it } from 'vitest'
import { presetPeriod } from '@/features/overview/overview-period'
import { repeatAlertsSchema } from '@/features/repeat-alerts/repeat-alerts.schemas'
import { lagosDay } from '@/shared/lib/dates'
import { summarize } from './mock-overview-api'
import { mockRecords } from './mock-records'
import { summarizeRepeatAlerts } from './mock-repeat-alerts-api'
import { summarizeViolations } from './mock-violations-api'

const NOW = Date.parse('2026-10-18T12:00:00+01:00')
const TODAY = '2026-10-18'
const filters = (scope: string, range: '30d' | '90d' = '90d') => ({
  scope,
  range,
  ...presetPeriod(range, TODAY),
  agentId: null,
  organization: null,
})

describe('summarizeRepeatAlerts', () => {
  it('returns data the schema accepts, most reports first', () => {
    const result = summarizeRepeatAlerts(filters('ng'), NOW)
    expect(repeatAlertsSchema.safeParse(result).success).toBe(true)
    expect(result.threshold).toBe(3)
    expect(result.alerts.length).toBeGreaterThan(0)
    const reports = result.alerts.map((alert) => alert.reports)
    expect(reports).toEqual([...reports].sort((a, b) => b - a))
  })

  it('raises the same alerts the Overview counts, for the same area and period', () => {
    for (const scope of ['ng', 'la']) {
      const alerts = summarizeRepeatAlerts(filters(scope), NOW).alerts
      const overview = summarize(mockRecords(lagosDay(new Date(NOW)), NOW), filters(scope))
        .repeatVehicles.items
      expect(
        alerts.map((alert) => [alert.plate, alert.reports, alert.followUp, alert.area]),
      ).toEqual(
        overview.map((vehicle) => [vehicle.plate, vehicle.reports, vehicle.followUp, vehicle.area]),
      )
    }
  })

  it('counts three or more qualifying reports, one still open, and lists every case of the plate', () => {
    const { alerts } = summarizeRepeatAlerts(filters('ng'), NOW)
    const cases = summarizeViolations(filters('ng'), NOW).cases
    for (const alert of alerts) {
      const qualifying = alert.cases.filter((item) => item.status !== 'cancelled')
      expect(qualifying).toHaveLength(alert.reports)
      expect(alert.reports).toBeGreaterThanOrEqual(3)
      expect(
        qualifying.some((item) =>
          ['payment_pending', 'awaiting_action', 'escalated'].includes(item.status),
        ),
      ).toBe(true)
      // Every case of the plate, oldest first, as the Violations page lists them.
      expect(alert.cases.map((item) => item.id).sort()).toEqual(
        cases
          .filter((item) => item.plate === alert.plate)
          .map((item) => item.id)
          .sort(),
      )
      const times = alert.cases.map((item) => Date.parse(item.recordedAt))
      expect(times).toEqual([...times].sort((a, b) => a - b))
      expect(alert.firstReportedAt).toBe(qualifying[0]!.recordedAt)
      expect(alert.lastReportedAt).toBe(qualifying[qualifying.length - 1]!.recordedAt)
      expect(alert.raisedAt).toBe(qualifying[2]!.recordedAt)
      // Partial follow-up: a qualifying report was escalated or closed.
      const followedUp = qualifying.some((item) => ['escalated', 'resolved'].includes(item.status))
      expect(alert.followUp).toBe(followedUp ? 'partial' : 'none')
    }
  })

  it('keeps to the agent and organization asked for', () => {
    const agentId = 'JRB-AG-0142'
    for (const alert of summarizeRepeatAlerts({ ...filters('ng'), agentId }, NOW).alerts) {
      for (const item of alert.cases) expect(item.agent.id).toBe(agentId)
    }
  })
})
