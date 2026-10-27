import { describe, expect, it, vi } from 'vitest'
import { notificationsSchema } from '@/features/notifications/notifications.schemas'
import { presetPeriod } from '@/features/overview/overview-period'
import { lagosDay } from '@/shared/lib/dates'
import { summarizeCommandCentre } from './mock-command-centre-api'
import { mockNotificationsApi, summarizeNotifications, unreadCount } from './mock-notifications-api'
import { summarize } from './mock-overview-api'
import { mockRecords } from './mock-records'

const NOW = Date.parse('2026-10-18T12:00:00+01:00')
const TODAY = '2026-10-18'
const filters = (scope: string, range: 'today' | '30d' | '90d' = '30d') => ({
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

  it('sends a notification for each payment CHL confirmed, as the Command centre reports it', () => {
    const result = summarizeNotifications(filters('la', 'today'), NOW).notifications
    const payments = result.filter((item) => item.type === 'payment_received')
    const cc = summarizeCommandCentre({ scope: 'la', window: 'today' }, NOW).feed.filter(
      (item) => item.kind === 'payment' && item.payment?.status === 'received',
    )
    expect(payments.map((item) => item.entry!.id).sort()).toEqual(cc.map((item) => item.id).sort())
    for (const item of payments) {
      expect(item.category).toBe('enforcement')
      expect(item.title).toBe(`Payment received for ${item.entry!.payment!.noticeId}`)
    }
  })

  it('sends one repeat-vehicle notification for each alert, when its third report arrived', () => {
    const today = lagosDay(new Date(NOW))
    const records = mockRecords(today, NOW)
    const history = summarize(records, filters('la', '90d')).repeatVehicles.items
    const all = summarizeNotifications(filters('la', '90d'), NOW).notifications.filter(
      (item) => item.type === 'repeat_vehicle',
    )
    expect(all.length).toBeGreaterThan(0)
    expect(all.map((item) => item.repeatVehicle!.plate).sort()).toEqual(
      history.map((vehicle) => vehicle.plate).sort(),
    )
    // The same alert, at the same time, whatever period lists it.
    const repeat = summarizeNotifications(filters('la'), NOW).notifications.filter(
      (item) => item.type === 'repeat_vehicle',
    )
    for (const item of repeat) {
      expect(all.find((entry) => entry.id === item.id)).toEqual(item)
    }
    for (const item of repeat) {
      expect(item.category).toBe('enforcement')
      expect(item.plate).toBe(item.repeatVehicle!.plate)
      expect(item.repeatVehicle!.reports).toBeGreaterThanOrEqual(3)
    }
  })

  it('keeps to the area, period, agent and organization asked for', () => {
    const all = summarizeNotifications(filters('ng'), NOW).notifications
    const lagos = summarizeNotifications(filters('la'), NOW).notifications
    expect(lagos.length).toBeGreaterThan(0)
    expect(lagos.length).toBeLessThan(all.length)
    for (const item of lagos) expect(item.location?.area).toBe('Lagos')

    const agentId = lagos.find((item) => item.agent)!.agent!.id
    const mine = summarizeNotifications({ ...filters('la'), agentId }, NOW).notifications
    expect(mine.length).toBeGreaterThan(0)
    // A repeat-vehicle notification names no single agent; it counts only this agent's reports.
    for (const item of mine.filter((entry) => entry.agent)) expect(item.agent!.id).toBe(agentId)

    const zone = summarizeNotifications({ ...filters('ng'), organization: 'Zone 1' }, NOW)
    for (const item of zone.notifications.filter((entry) => entry.agent)) {
      expect(['JRB-AG-0142', 'JRB-AG-0143']).toContain(item.agent!.id)
    }

    const from = Date.parse('2026-09-19T00:00:00+01:00')
    for (const item of all) expect(Date.parse(item.receivedAt)).toBeGreaterThanOrEqual(from)
  })

  it('counts a notification unread for a day, until the user reads it', async () => {
    const all = summarizeNotifications(filters('la'), NOW).notifications
    const unread = all.filter((item) => !item.read)
    expect(unread.length).toBeGreaterThan(0)
    for (const item of all) {
      expect(item.read).toBe(Date.parse(item.receivedAt) < NOW - 24 * 3_600_000)
    }
    expect(unreadCount(['la'], NOW)).toBe(unread.length)

    vi.useFakeTimers({ now: NOW, toFake: ['Date'] })
    try {
      await mockNotificationsApi.markRead([unread[0]!.id])
    } finally {
      vi.useRealTimers()
    }
    const after = summarizeNotifications(filters('la'), NOW).notifications
    expect(after.find((item) => item.id === unread[0]!.id)!.read).toBe(true)
    expect(unreadCount(['la'], NOW)).toBe(unread.length - 1)
    // A user with two areas counts a notification in both once.
    expect(unreadCount(['la', 'la'], NOW)).toBe(unread.length - 1)
  })

  it('says CHL does not pass on agents’ operational notifications', () => {
    expect(summarizeNotifications(filters('ng'), NOW).operationalProvided).toBe(false)
  })
})
