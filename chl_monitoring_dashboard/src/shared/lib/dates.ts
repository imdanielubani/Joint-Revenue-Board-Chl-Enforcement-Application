import { DISPLAY_TIME_ZONE } from './format'

/**
 * Calendar days as "2026-10-14" strings. Reports cover whole days in Lagos,
 * whatever the viewer's clock says, so days are never built from local time.
 */
export type CalendarDay = string

const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: DISPLAY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** The day it is in Lagos at `now`. */
export function lagosDay(now: Date = new Date()): CalendarDay {
  return dayFormat.format(now)
}

/** The day `days` after `day` (before, when negative). */
export function addDays(day: CalendarDay, days: number): CalendarDay {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function parts(day: CalendarDay) {
  const [year, month, date] = day.split('-').map(Number)
  return { year, month: MONTHS[(month ?? 1) - 1] ?? '', date }
}

/** "08 Jun 2025". */
export function formatDay(day: CalendarDay): string {
  const { year, month, date } = parts(day)
  return `${String(date).padStart(2, '0')} ${month} ${year}`
}

/** "1–14 Oct, 2026", "28 Sep – 11 Oct, 2026" or "28 Dec, 2025 – 3 Jan, 2026". */
export function formatPeriod(from: CalendarDay, to: CalendarDay): string {
  const start = parts(from)
  const end = parts(to)
  if (from === to) return `${end.date} ${end.month}, ${end.year}`
  if (start.year !== end.year) {
    return `${start.date} ${start.month}, ${start.year} – ${end.date} ${end.month}, ${end.year}`
  }
  if (start.month !== end.month) {
    return `${start.date} ${start.month} – ${end.date} ${end.month}, ${end.year}`
  }
  return `${start.date}–${end.date} ${end.month}, ${end.year}`
}
