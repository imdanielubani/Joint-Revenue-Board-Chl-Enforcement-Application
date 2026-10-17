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

const numberFormat = new Intl.NumberFormat('en-NG')

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

export function formatNumber(value: number): string {
  return numberFormat.format(value)
}

export function formatNaira(value: number): string {
  return nairaFormat.format(value)
}
