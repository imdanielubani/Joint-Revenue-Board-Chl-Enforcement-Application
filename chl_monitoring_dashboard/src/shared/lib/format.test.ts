import { describe, expect, it } from 'vitest'
import {
  formatClock,
  formatDateTime,
  formatDelay,
  formatDuration,
  formatNaira,
  formatNumber,
  formatPercent,
  formatShortDateTime,
} from './format'

describe('formatDateTime', () => {
  it('shows the time in Lagos (UTC+1)', () => {
    expect(formatDateTime('2026-10-17T23:30:00Z')).toMatch(/18 Oct 2026.*12:30/)
  })

  it('shows a dash for an empty or unreadable value', () => {
    expect(formatDateTime(null)).toBe('—')
    expect(formatDateTime('not a date')).toBe('—')
  })
})

describe('formatNumber', () => {
  it('groups thousands', () => {
    expect(formatNumber(1234567)).toBe('1,234,567')
  })
})

describe('formatShortDateTime', () => {
  it('shows day, month and time in Lagos', () => {
    expect(formatShortDateTime('2026-10-14T09:18:00Z')).toBe('14 Oct, 10:18 AM')
  })
})

describe('formatClock', () => {
  it('shows the Lagos time with its zone', () => {
    expect(formatClock(new Date('2026-10-14T09:42:00Z'))).toBe('10:42 WAT')
  })
})

describe('formatPercent', () => {
  it('shows one decimal, and 0.0% without a total', () => {
    expect(formatPercent(9, 27)).toBe('33.3%')
    expect(formatPercent(0, 0)).toBe('0.0%')
  })
})

describe('formatNaira', () => {
  it('shows whole naira without kobo, and two places when there are kobo', () => {
    expect(formatNaira(70_000)).toBe('₦70,000')
    expect(formatNaira(0)).toBe('₦0')
    expect(formatNaira(70_000.5)).toBe('₦70,000.50')
  })
})

describe('formatDelay', () => {
  it('says how much later something arrived', () => {
    const at = '2026-10-14T09:00:00Z'
    expect(formatDelay(at, '2026-10-14T09:00:30Z')).toBe('at once')
    expect(formatDelay(at, '2026-10-14T09:47:00Z')).toBe('47 min later')
    expect(formatDelay(at, '2026-10-14T12:10:00Z')).toBe('3 h later')
    expect(formatDelay(at, '2026-10-15T10:00:00Z')).toBe('1 day later')
    expect(formatDelay(at, '2026-10-17T10:00:00Z')).toBe('3 days later')
  })
})

describe('formatDuration', () => {
  it('says how long something lasted', () => {
    const at = '2026-10-14T09:00:00Z'
    expect(formatDuration(at, '2026-10-14T09:00:40Z')).toBe('under a minute')
    expect(formatDuration(at, '2026-10-14T09:42:00Z')).toBe('42 min')
    expect(formatDuration(at, '2026-10-14T11:00:00Z')).toBe('2 h')
    expect(formatDuration(at, '2026-10-14T10:20:30Z')).toBe('1 h 20 min')
    expect(formatDuration(at, '2026-10-15T09:00:00Z')).toBe('1 day')
    expect(formatDuration(at, '2026-10-16T12:00:00Z')).toBe('2 days 3 h')
  })

  it('says under a minute for an unreadable or reversed span', () => {
    expect(formatDuration('nonsense', '2026-10-14T09:00:00Z')).toBe('under a minute')
    expect(formatDuration('2026-10-14T09:00:00Z', '2026-10-14T08:00:00Z')).toBe('under a minute')
  })
})
