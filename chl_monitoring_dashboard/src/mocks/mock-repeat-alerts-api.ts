import type { RepeatAlertsApi } from '@/features/repeat-alerts/repeat-alerts.api'
import type {
  RepeatAlert,
  RepeatAlerts,
  RepeatAlertsFilters,
} from '@/features/repeat-alerts/repeat-alerts.schemas'
import type { ViolationCase } from '@/features/violations/violations.schemas'
import { delay } from './delay'
import { REPEAT_THRESHOLD } from './mock-overview-api'
import { summarizeViolations } from './mock-violations-api'

/** A report that counts towards an alert: a violation not cancelled, as the Overview counts them. */
const qualifying = (item: ViolationCase) => item.status !== 'cancelled'

const byRecorded = (a: ViolationCase, b: ViolationCase) =>
  Date.parse(a.recordedAt) - Date.parse(b.recordedAt)

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

  const alerts = [...byPlate.values()].flatMap((plateCases): RepeatAlert[] => {
    const alert = plateCases.find((item) => item.repeatAlert)?.repeatAlert
    if (!alert) return []
    const all = [...plateCases].sort(byRecorded)
    const reports = all.filter(qualifying)
    const first = reports[0]!
    const last = reports[reports.length - 1]!
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
        raisedAt: reports[REPEAT_THRESHOLD - 1]!.recordedAt,
        cases: all,
        notification: null,
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
