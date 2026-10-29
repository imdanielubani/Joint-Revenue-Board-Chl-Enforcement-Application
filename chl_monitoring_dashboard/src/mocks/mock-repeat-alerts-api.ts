import type { RepeatAlertsApi } from '@/features/repeat-alerts/repeat-alerts.api'
import type {
  RepeatAlert,
  RepeatAlerts,
  RepeatAlertsFilters,
} from '@/features/repeat-alerts/repeat-alerts.schemas'
import type { Notification } from '@/features/notifications/notifications.schemas'
import type { ViolationCase } from '@/features/violations/violations.schemas'
import { presetPeriod } from '@/features/overview/overview-period'
import { lagosDay } from '@/shared/lib/dates'
import { delay } from './delay'
import { summarizeNotifications } from './mock-notifications-api'
import { REPEAT_THRESHOLD } from './mock-overview-api'
import { summarizeViolations } from './mock-violations-api'

/** A report that counts towards an alert: a violation not cancelled, as the Overview counts them. */
const qualifying = (item: ViolationCase) => item.status !== 'cancelled'

const byRecorded = (a: ViolationCase, b: ViolationCase) =>
  Date.parse(a.recordedAt) - Date.parse(b.recordedAt)

/** The notification an alert links to: which one, when CHL received it, and whether it was read. */
const notificationOf = (item: Notification | undefined): RepeatAlert['notification'] =>
  item ? { id: item.id, receivedAt: item.receivedAt, read: item.read } : null

/**
 * The repeat-vehicle alerts in an area and period, from the same cases the
 * Violations page lists and the Overview counts: one for each plate whose
 * cases carry an alert, with every case of the plate, oldest first.
 */
export function summarizeRepeatAlerts(
  filters: RepeatAlertsFilters,
  now: number = Date.now(),
): RepeatAlerts {
  const { latestReceivedAt, cases } = summarizeViolations(filters, now)
  const byPlate = new Map<string, ViolationCase[]>()
  for (const item of cases) byPlate.set(item.plate, [...(byPlate.get(item.plate) ?? []), item])

  // The supervisory process counts over the history CHL keeps: when the alert
  // was raised, and the repeat-vehicle notification it sent then.
  const history = {
    ...filters,
    range: '90d',
    ...presetPeriod('90d', lagosDay(new Date(now))),
  } as const
  const historyCases = summarizeViolations(history, now).cases.filter(qualifying).sort(byRecorded)
  const notifications = new Map(
    summarizeNotifications(history, now)
      .notifications.filter((item) => item.type === 'repeat_vehicle' && item.plate)
      .map((item) => [item.plate!, item]),
  )

  const alerts = [...byPlate.values()].flatMap((plateCases): RepeatAlert[] => {
    const alert = plateCases.find((item) => item.repeatAlert)?.repeatAlert
    if (!alert) return []
    const all = [...plateCases].sort(byRecorded)
    const reports = all.filter(qualifying)
    const first = reports[0]!
    const last = reports[reports.length - 1]!
    const raised =
      historyCases.filter((item) => item.plate === first.plate)[REPEAT_THRESHOLD - 1] ??
      reports[REPEAT_THRESHOLD - 1]!
    return [
      {
        plate: first.plate,
        vehicleId: first.vehicleId,
        vehicleType: first.vehicleType,
        area: last.location.area,
        reports: alert.reports,
        followUp: alert.followUp,
        firstReportedAt: first.recordedAt,
        lastReportedAt: last.recordedAt,
        raisedAt: raised.recordedAt,
        cases: all,
        notification: notificationOf(notifications.get(first.plate)),
      },
    ]
  })

  return {
    latestReceivedAt,
    threshold: REPEAT_THRESHOLD,
    alerts: alerts.sort((a, b) => b.reports - a.reports || a.plate.localeCompare(b.plate)),
  }
}

/** Sample data: from the sample violations. */
export const mockRepeatAlertsApi: RepeatAlertsApi = {
  async getRepeatAlerts(filters) {
    await delay()
    return summarizeRepeatAlerts(filters)
  },
}
