import { describe, expect, it } from 'vitest'
import { addDays, formatDay, formatPeriod, lagosDay } from './dates'

describe('dates', () => {
  it('takes the day in Lagos, not the viewer’s', () => {
    expect(lagosDay(new Date('2026-10-17T23:30:00Z'))).toBe('2026-10-18')
  })

  it('adds days across months and years', () => {
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30')
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01')
  })

  it('formats days and periods as the design does', () => {
    expect(formatDay('2025-06-08')).toBe('08 Jun 2025')
    expect(formatPeriod('2026-10-01', '2026-10-14')).toBe('1–14 Oct, 2026')
    expect(formatPeriod('2026-09-28', '2026-10-11')).toBe('28 Sep – 11 Oct, 2026')
    expect(formatPeriod('2025-12-28', '2026-01-03')).toBe('28 Dec, 2025 – 3 Jan, 2026')
    expect(formatPeriod('2026-10-14', '2026-10-14')).toBe('14 Oct, 2026')
  })
})
