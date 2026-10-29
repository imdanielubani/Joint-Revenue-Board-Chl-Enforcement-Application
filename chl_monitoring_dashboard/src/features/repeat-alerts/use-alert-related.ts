import { useMemo } from 'react'
import { paths } from '@/config/paths'
import { useModuleLink } from '@/features/auth/use-module-link'
import type { RepeatVehicle } from '@/features/overview/overview.schemas'
import type { TripRelated } from '@/features/trips/components/TripRelatedDialog'
import { involvedAgents } from './repeat-alerts-display'
import type { RepeatAlert } from './repeat-alerts.schemas'

/** The vehicle as its alert counts it, as the Vehicle reports popup takes it. */
export function vehicleOf(alert: RepeatAlert): RepeatVehicle {
  return {
    plate: alert.plate,
    reports: alert.reports,
    agents: involvedAgents(alert).length,
    area: alert.area,
    followUp: alert.followUp,
  }
}

/**
 * The records an alert leads to, each opened in a popup on the page: a case
 * with its recorded actions, an agent, the vehicle's reports. Each only where
 * the user may open its module; null otherwise.
 */
export function useAlertRelated() {
  const link = useModuleLink()
  return useMemo(() => {
    const cases = link('violations', paths.violations) !== undefined
    const agents = link('agents', paths.agents) !== undefined
    return {
      caseOf: (violationId: string): TripRelated | null =>
        cases ? { kind: 'case', violationId } : null,
      agentOf: (agent: { id: string; name: string }): TripRelated | null =>
        agents ? { kind: 'agent', agent } : null,
      reportsOf: (alert: RepeatAlert): TripRelated | null =>
        cases ? { kind: 'vehicleReports', vehicle: vehicleOf(alert) } : null,
    }
  }, [link])
}
