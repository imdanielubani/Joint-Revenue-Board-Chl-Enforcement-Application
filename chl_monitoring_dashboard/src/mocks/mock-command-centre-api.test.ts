import { describe, expect, it } from 'vitest'
import { commandCentreSchema } from '@/features/command-centre/command-centre.schemas'
import { summarizeCommandCentre, windowStart } from './mock-command-centre-api'

const NOW = Date.parse('2026-10-18T12:00:00+01:00')

describe('summarizeCommandCentre', () => {
  it('returns data the schema accepts', () => {
    const result = summarizeCommandCentre({ scope: 'ng', window: '24h' }, NOW)
    expect(commandCentreSchema.safeParse(result).success).toBe(true)
  })

  it('keeps the feed inside the window, newest first, and never in the future', () => {
    const { feed, window } = summarizeCommandCentre({ scope: 'ng', window: '7d' }, NOW)
    expect(feed.length).toBeGreaterThan(0)
    const times = feed.map((item) => Date.parse(item.recordedAt))
    for (const time of times) {
      expect(time).toBeGreaterThanOrEqual(Date.parse(window.from))
      expect(time).toBeLessThanOrEqual(NOW)
    }
    expect([...times].sort((a, b) => b - a)).toEqual(times)
  })

  it('counts more activity in a wider window', () => {
    const hour = summarizeCommandCentre({ scope: 'ng', window: '1h' }, NOW).counts.activity
    const day = summarizeCommandCentre({ scope: 'ng', window: '24h' }, NOW).counts.activity
    const week = summarizeCommandCentre({ scope: 'ng', window: '7d' }, NOW).counts.activity
    expect(hour).toBeLessThanOrEqual(day)
    expect(day).toBeLessThanOrEqual(week)
    expect(week).toBeGreaterThan(day)
  })

  it('counts field reports and loaded / empty confirmations from the feed', () => {
    const { counts, feed } = summarizeCommandCentre({ scope: 'ng', window: '24h' }, NOW)
    expect(counts.fieldReports).toBe(feed.filter((item) => item.kind === 'field_report').length)
    expect(counts.loaded).toBe(feed.filter((item) => item.load === 'loaded').length)
    expect(counts.empty).toBe(feed.filter((item) => item.load === 'empty').length)
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
