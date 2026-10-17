import { describe, expect, it } from 'vitest'
import {
  formatClock,
  formatDateTime,
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
