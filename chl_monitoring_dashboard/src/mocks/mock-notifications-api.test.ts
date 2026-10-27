import { describe, expect, it } from 'vitest'
import { notificationsSchema } from '@/features/notifications/notifications.schemas'
import { presetPeriod } from '@/features/overview/overview-period'
import { summarizeCommandCentre } from './mock-command-centre-api'
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

describe('summarizeNotifications', () => {
  it('returns data the schema accepts, latest first', () => {
    const result = summarizeNotifications(filters('ng'), NOW)
    expect(notificationsSchema.safeParse(result).success).toBe(true)
    expect(result.notifications.length).toBeGreaterThan(0)
    const times = result.notifications.map((item) => Date.parse(item.receivedAt))
    expect(times).toEqual([...times].sort((a, b) => b - a))
    expect(result.latestReceivedAt).toBe(result.notifications[0]!.receivedAt)
  })

  it('lists the SOS, field reports and loaded / empty confirmations the Command centre received', () => {
    const field = summarizeNotifications(filters('la', 'today'), NOW).notifications.filter(
      (item) => item.category === 'field',
    )
    const cc = summarizeCommandCentre({ scope: 'la', window: 'today' }, NOW)
    const ids = (items: { id: string }[]) => items.map((item) => item.id).sort()
    expect(
      ids(field.filter((item) => item.type === 'load_status').map((item) => item.entry!)),
    ).toEqual(ids(cc.loadReports.items))
    expect(
      ids(field.filter((item) => item.entry?.kind === 'field_report').map((item) => item.entry!)),
    ).toEqual(ids(cc.fieldReports.items))
    for (const item of field) {
      expect(item.agent).toEqual(item.entry!.agent)
      expect(item.plate).toBe(item.entry!.plate)
    }
  })

  it('keeps to the area, period, agent and organization asked for', () => {
    const all = summarizeNotifications(filters('ng'), NOW).notifications
    const lagos = summarizeNotifications(filters('la'), NOW).notifications
    expect(lagos.length).toBeGreaterThan(0)
    expect(lagos.length).toBeLessThan(all.length)
    for (const item of lagos) expect(item.location?.area).toBe('Lagos')

    const agentId = lagos[0]!.agent!.id
    const mine = summarizeNotifications({ ...filters('la'), agentId }, NOW).notifications
    expect(mine.length).toBeGreaterThan(0)
    for (const item of mine) expect(item.agent?.id).toBe(agentId)

    const zone = summarizeNotifications({ ...filters('ng'), organization: 'Zone 1' }, NOW)
    for (const item of zone.notifications) {
      expect(['JRB-AG-0142', 'JRB-AG-0143']).toContain(item.agent?.id)
    }

    const from = Date.parse('2026-09-19T00:00:00+01:00')
    for (const item of all) expect(Date.parse(item.receivedAt)).toBeGreaterThanOrEqual(from)
  })

  it('says CHL does not pass on agents’ operational notifications', () => {
    expect(summarizeNotifications(filters('ng'), NOW).operationalProvided).toBe(false)
  })
})
