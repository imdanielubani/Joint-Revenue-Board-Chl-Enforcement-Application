import { paths } from '@/config/paths'
import { HeadlineFigures, type HeadlineFigure } from '@/shared/ui/HeadlineFigures'
import { plural } from '../overview-display'
import type { Overview } from '../overview.schemas'
import { useModuleLink } from '@/features/auth/use-module-link'

/** The eight headline figures, four to a row. */
export function KpiGrid({ kpis }: { kpis: Overview['kpis'] }) {
  const link = useModuleLink()
  const items: HeadlineFigure[] = [
    {
      label: 'Total agent verifications',
      value: kpis.totalVerifications,
      icon: 'overview/kpi-scan.svg',
      note: 'Received records in the selected window',
      to: link('verifications', paths.verifications),
    },
    {
      label: 'Active-trip verification results',
      value: kpis.activeTripResults,
      icon: 'overview/kpi-check.svg',
      note: 'Verification outcomes, not unique trips',
      to: link('verifications', `${paths.verifications}?result=active_trip`),
    },
    {
      label: 'No-active-trip verification results',
      value: kpis.noActiveTripResults,
      icon: 'overview/kpi-doc.svg',
      note: 'Explicit No Active Trip outcomes only',
      to: link('verifications', `${paths.verifications}?result=no_active_trip`),
    },
    {
      label: 'Violations issued',
      value: kpis.violationsIssued,
      icon: 'overview/kpi-violation.svg',
      note: `${plural(kpis.agentsWithViolations, 'agent')} with issued violations`,
      to: link('violations', paths.violations),
    },
    {
      label: 'Unresolved violations',
      value: kpis.unresolvedViolations,
      icon: 'overview/kpi-unresolved.svg',
      note: `${kpis.escalatedViolations} escalated within this total`,
      to: link('violations', `${paths.violations}?status=unresolved`),
    },
    {
      label: 'Repeat vehicles without follow-up',
      value: kpis.repeatVehiclesWithoutFollowUp,
      icon: 'overview/kpi-bell.svg',
      note: `${plural(kpis.openRepeatAlerts, 'open alert')} · no follow-up recorded`,
      to: link('violations', `${paths.violations}?view=repeat-vehicles`),
    },
    {
      label: 'Agents with recorded activity',
      value: kpis.agentsWithActivity,
      icon: 'overview/kpi-agents.svg',
      note: 'Verification and enforcement activity',
      to: link('agents', paths.agents),
    },
    {
      label: 'Enforcement locations',
      value: kpis.enforcementLocations,
      icon: 'overview/kpi-pin.svg',
      note: 'Recorded locations, not live positions',
      to: link('geography', paths.geography),
    },
  ]

  return <HeadlineFigures items={items} />
}
