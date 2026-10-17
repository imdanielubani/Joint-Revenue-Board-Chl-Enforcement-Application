import { addDays, formatPeriod, lagosDay, type CalendarDay } from '@/shared/lib/dates'
import { RANGE_DAYS, RANGE_LABELS, type OverviewRange, type PresetRange } from './overview.schemas'

export interface Period {
  from: CalendarDay
  to: CalendarDay
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Whether `value` is a real calendar day, "2026-10-14" (not "2026-02-30"). */
export function isCalendarDay(value: string | null | undefined): value is CalendarDay {
  if (!value || !DAY_PATTERN.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** The days a preset covers, ending today in Lagos. */
export function presetPeriod(range: PresetRange, today: CalendarDay = lagosDay()): Period {
  return { from: addDays(today, -(RANGE_DAYS[range] - 1)), to: today }
}

/** Why a custom period cannot be used, or null when it can. */
export function customPeriodProblem(
  from: string,
  to: string,
  today: CalendarDay = lagosDay(),
): string | null {
  if (!isCalendarDay(from) || !isCalendarDay(to)) return 'Enter both dates.'
  if (from > to) return 'The start date must be on or before the end date.'
  if (to > today) return 'The end date cannot be in the future.'
  return null
}

/** How many days a period covers, both ends included. */
export function periodDays({ from, to }: Period): number {
  const ms = new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()
  return Math.round(ms / 86_400_000) + 1
}

/** "Last 14 days" for a preset; the dates themselves, "1–14 Oct, 2026", for a custom period. */
export function periodLabel(range: OverviewRange, period: Period): string {
  return range === 'custom' ? formatPeriod(period.from, period.to) : RANGE_LABELS[range]
}
