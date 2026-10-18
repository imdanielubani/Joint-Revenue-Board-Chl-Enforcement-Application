import { describe, expect, it } from 'vitest'
import { commandCentreSchema } from '@/features/command-centre/command-centre.schemas'
import { summarizeCommandCentre, windowStart } from './mock-command-centre-api'

const NOW = Date.parse('2026-10-18T12:00:00+01:00')

describe('summarizeCommandCentre', () => {
  it('returns data the schema accepts', () => {
    const result = summarizeCommandCentre({ scope: 'ng', window: '24h' }, NOW)
    expect(commandCentreSchema.safeParse(result).success).toBe(true)
  })

  it('keeps the feed to entries received in the window, latest received first', () => {
    const { feed, window } = summarizeCommandCentre({ scope: 'ng', window: '7d' }, NOW)
    expect(feed.length).toBeGreaterThan(0)
    const received = feed.map((item) => Date.parse(item.receivedAt ?? item.recordedAt))
    for (const time of received) {
      expect(time).toBeGreaterThanOrEqual(Date.parse(window.from))
      expect(time).toBeLessThanOrEqual(NOW)
    }
    expect([...received].sort((a, b) => b - a)).toEqual(received)
    for (const item of feed) {
      expect(Date.parse(item.recordedAt)).toBeLessThanOrEqual(Date.parse(item.receivedAt!))
    }
  })

  it('shows a record made offline when it reaches CHL, not when it was made', () => {
    const week = summarizeCommandCentre({ scope: 'ng', window: '7d' }, NOW)
    const day = summarizeCommandCentre({ scope: 'ng', window: '24h' }, NOW)
    const from = Date.parse(day.window.from)
    // Every entry received in the last 24 hours is in that window, whenever it was recorded.
    const expected = week.feed
      .filter((item) => Date.parse(item.receivedAt!) >= from)
      .map((item) => item.id)
    expect(day.feed.map((item) => item.id)).toEqual(expected.slice(0, day.feed.length))
    expect(day.counts.activity).toBe(expected.length)
  })

  it('counts more activity in a wider window', () => {
    const hour = summarizeCommandCentre({ scope: 'ng', window: '1h' }, NOW).counts.activity
    const day = summarizeCommandCentre({ scope: 'ng', window: '24h' }, NOW).counts.activity
    const week = summarizeCommandCentre({ scope: 'ng', window: '7d' }, NOW).counts.activity
    expect(hour).toBeLessThanOrEqual(day)
    expect(day).toBeLessThanOrEqual(week)
    expect(week).toBeGreaterThan(day)
  })

  it('lists field reports and loaded / empty confirmations apart from the feed', () => {
    const { feed, fieldReports, loadReports, counts } = summarizeCommandCentre(
      { scope: 'ng', window: '7d' },
      NOW,
    )
    expect(fieldReports.items.every((item) => item.kind === 'field_report')).toBe(true)
    expect(fieldReports.byType.reduce((sum, entry) => sum + entry.count, 0)).toBe(
      fieldReports.total,
    )
    expect(loadReports.items.every((item) => item.kind === 'load_status')).toBe(true)
    expect(loadReports.loaded + loadReports.empty).toBeGreaterThan(0)
    // The week's sample fits in the feed, so the lists must agree with it.
    expect(feed).toHaveLength(counts.activity)
    expect(fieldReports.total).toBe(feed.filter((item) => item.kind === 'field_report').length)
    expect(loadReports.loaded).toBe(feed.filter((item) => item.load === 'loaded').length)
    expect(loadReports.empty).toBe(feed.filter((item) => item.load === 'empty').length)
  })

  it('narrows everything to the chosen area', () => {
    const lagos = summarizeCommandCentre({ scope: 'la', window: '7d' }, NOW)
    expect(lagos.locations.every((location) => location.area === 'Lagos')).toBe(true)
    const names = new Set(lagos.locations.map((location) => location.name))
    expect(lagos.feed.every((item) => names.has(item.location.name))).toBe(true)
    const national = summarizeCommandCentre({ scope: 'ng', window: '7d' }, NOW)
    expect(lagos.counts.activity).toBeLessThan(national.counts.activity)
  })

  it('keeps payment received apart from trip activated', () => {
    const { feed } = summarizeCommandCentre({ scope: 'ng', window: '7d' }, NOW)
    const pending = feed.filter((item) => item.payment?.status === 'pending')
    expect(pending.every((item) => item.payment?.tripActivated === false)).toBe(true)
  })

  it('starts "today" at midnight in Lagos', () => {
    expect(new Date(windowStart('today', NOW)).toISOString()).toBe('2026-10-17T23:00:00.000Z')
  })
})
