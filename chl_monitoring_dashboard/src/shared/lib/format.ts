/** Every time on the dashboard is shown in Lagos time, whatever the viewer's clock. */
export const DISPLAY_TIME_ZONE = 'Africa/Lagos'

const dateTimeFormat = new Intl.DateTimeFormat('en-NG', {
  timeZone: DISPLAY_TIME_ZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
})

const shortDateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: DISPLAY_TIME_ZONE,
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
})

const clockFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: DISPLAY_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const numberFormat = new Intl.NumberFormat('en-NG')

const percentFormat = new Intl.NumberFormat('en-NG', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const nairaFormat = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 2,
})

/** "17 Oct 2026, 05:30 pm". An empty or unreadable value becomes "—". */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormat.format(date)
}

/** "14 Oct, 10:18 AM", for record lists where the year is plain from the period. */
export function formatShortDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    shortDateTimeFormat.formatToParts(date).find((p) => p.type === type)?.value ?? ''
  return `${part('day')} ${part('month')}, ${part('hour')}:${part('minute')} ${part('dayPeriod').toUpperCase()}`
}

/** "10:42 WAT": the time in Lagos, which is West Africa Time all year. */
export function formatClock(value: number | Date): string {
  return `${clockFormat.format(value)} WAT`
}

export function formatNumber(value: number): string {
  return numberFormat.format(value)
}

/** `part` as a share of `total`, "33.3%"; "0.0%" when there is no total. */
export function formatPercent(part: number, total: number): string {
  return `${percentFormat.format(total > 0 ? (part / total) * 100 : 0)}%`
}

export function formatNaira(value: number): string {
  return nairaFormat.format(value)
}
