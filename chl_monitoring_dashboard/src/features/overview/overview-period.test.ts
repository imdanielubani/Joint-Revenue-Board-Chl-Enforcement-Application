import { describe, expect, it } from 'vitest'
import {
  customPeriodProblem,
  isCalendarDay,
  periodDays,
  periodLabel,
  presetPeriod,
} from './overview-period'

const TODAY = '2026-10-18'

describe('periods', () => {
  it('ends every preset today', () => {
    expect(presetPeriod('today', TODAY)).toEqual({ from: TODAY, to: TODAY })
    expect(presetPeriod('14d', TODAY)).toEqual({ from: '2026-10-05', to: TODAY })
    expect(presetPeriod('90d', TODAY)).toEqual({ from: '2026-07-21', to: TODAY })
  })

  it('accepts only real calendar days', () => {
    expect(isCalendarDay('2026-02-28')).toBe(true)
    expect(isCalendarDay('2026-02-30')).toBe(false)
    expect(isCalendarDay('18/10/2026')).toBe(false)
    expect(isCalendarDay(null)).toBe(false)
  })

  it('says what is wrong with a custom period', () => {
    expect(customPeriodProblem('2026-10-01', '2026-10-10', TODAY)).toBeNull()
    expect(customPeriodProblem('2026-10-18', '2026-10-18', TODAY)).toBeNull()
    expect(customPeriodProblem('', '2026-10-10', TODAY)).toBe('Enter both dates.')
    expect(customPeriodProblem('2026-10-11', '2026-10-10', TODAY)).toBe(
      'The start date must be on or before the end date.',
    )
    expect(customPeriodProblem('2026-10-01', '2026-10-19', TODAY)).toBe(
      'The end date cannot be in the future.',
    )
  })

  it('counts days with both ends included, across months', () => {
    expect(periodDays({ from: '2026-10-05', to: '2026-10-18' })).toBe(14)
    expect(periodDays({ from: '2026-09-28', to: '2026-10-03' })).toBe(6)
  })

  it('labels a preset by name and a custom period by its dates', () => {
    expect(periodLabel('7d', { from: '2026-10-12', to: TODAY })).toBe('Last 7 days')
    expect(periodLabel('custom', { from: '2026-10-01', to: '2026-10-10' })).toBe('1–10 Oct, 2026')
  })
})
