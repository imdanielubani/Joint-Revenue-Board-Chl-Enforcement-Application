import { describe, expect, it } from 'vitest'
import { formatDateTime, formatNumber } from './format'

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
