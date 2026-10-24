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
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const wholeNairaFormat = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
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

/**
 * How long after `from` something happened: "2 min later", "3 h later",
 * "2 days later"; "at once" within a minute.
 */
export function formatDelay(from: string | Date, to: string | Date): string {
  const minutes = Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 60_000)
  if (!Number.isFinite(minutes) || minutes < 1) return 'at once'
  if (minutes < 60) return `${minutes} min later`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h later`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} later`
}

/**
 * How long something lasted: "under a minute", "42 min", "1 h 20 min",
 * "2 days 3 h". Used for how long an SOS has been, or was, open.
 */
export function formatDuration(from: string | Date | number, to: string | Date | number): string {
  const minutes = Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 60_000)
  if (!Number.isFinite(minutes) || minutes < 1) return 'under a minute'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return minutes % 60 === 0 ? `${hours} h` : `${hours} h ${minutes % 60} min`
  const days = Math.floor(hours / 24)
  const dayText = `${days} day${days === 1 ? '' : 's'}`
  return hours % 24 === 0 ? dayText : `${dayText} ${hours % 24} h`
}

export function formatNumber(value: number): string {
  return numberFormat.format(value)
}

/** `part` as a share of `total`, "33.3%"; "0.0%" when there is no total. */
export function formatPercent(part: number, total: number): string {
  return `${percentFormat.format(total > 0 ? (part / total) * 100 : 0)}%`
}

/** "₦70,000" for whole naira, "₦70,000.50" when there are kobo. */
export function formatNaira(value: number): string {
  return (Number.isInteger(value) ? wholeNairaFormat : nairaFormat).format(value)
}
