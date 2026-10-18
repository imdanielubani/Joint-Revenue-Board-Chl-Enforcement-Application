import { useCallback, useMemo } from 'react'
import { paths } from '@/config/paths'
import { useCurrentUser } from '@/features/auth/session-context'
import { useModuleLink } from '@/features/auth/use-module-link'
import { CasesCard, RepeatVehiclesCard } from '@/features/overview/components/AttentionCards'
import { PaymentStatusCard } from '@/features/overview/components/InsightCards'
import { OutcomesCard } from '@/features/overview/components/OutcomesCard'
import { OverviewFilterBar } from '@/features/overview/components/OverviewHeader'
import { PerformanceCard } from '@/features/overview/components/PerformanceCard'
import { RecentActivityCard } from '@/features/overview/components/RecentActivityCard'
import { plural } from '@/features/overview/overview-display'
import { periodLabel } from '@/features/overview/overview-period'
import { useOverview } from '@/features/overview/overview.queries'
import { useOverviewFilters } from '@/features/overview/use-overview-filters'
import { HeadlineFigures } from '@/shared/ui/HeadlineFigures'
import { PageHero, RefreshButton } from '@/shared/ui/PageHero'
import { StatePanel } from '@/shared/ui/StatePanel'
import { SummaryStrip } from '@/shared/ui/SummaryStrip'
import { levelCaption, type Area } from '../areas'
import { useAreas } from '../areas.queries'
import { AreasCard, EnforcementPointsCard, ScopeTrail } from '../components/GeographyCards'
import { useGeography } from '../geography.queries'
import { coversSeveralLocations, scopeOptions, type ScopeOption } from '../scope-options'
import styles from './GeographyPage.module.css'

/** No agent or organization filter here: every view is of the whole area. */
const NO_PEOPLE = {
  organizations: [],
  organization: null,
  onOrganizationChange: () => {},
  agents: [],
  agentId: null,
  onAgentChange: () => {},
  onClear: () => {},
}

/**
 * Geographical monitoring (SRD 4): one area at a time, from a single
 * enforcement point to the whole country, with the areas directly under it in
 * CHL's configuration. The same data as the Overview, seen by area.
 */
export function GeographyPage() {
  const user = useCurrentUser()
  const areas = useAreas()
  const scopes = useMemo(() => scopeOptions(user, areas.data), [user, areas.data])

  const [first] = scopes
  if (!first) {
    return (
      <StatePanel
        kind="empty"
        message="No areas are assigned to your account in CHL yet, so there is nothing to show. Ask your administrator to assign your areas."
      />
    )
  }
  return (
    <GeographyContent
      scopes={scopes}
      fallbackScope={first}
      areas={areas.data ?? []}
      areasPending={areas.isPending}
    />
  )
}

function GeographyContent({
  scopes,
  fallbackScope,
  areas,
  areasPending,
}: {
  scopes: readonly ScopeOption[]
  fallbackScope: ScopeOption
  areas: readonly Area[]
  areasPending: boolean
}) {
  const link = useModuleLink()
  const filter = useOverviewFilters({ scopes, fallbackScope, areasPending, agents: [] })
  const { scope, filters } = filter
  const { setScope } = filter
  const onScopeChange = useCallback((value: string) => setScope(value), [setScope])

  const enabled = !filter.waiting
  const overviewQuery = useOverview({ ...filters, agentId: null, organization: null }, { enabled })
  const geographyQuery = useGeography(filters, { enabled })
  const overview = overviewQuery.data
  const geography = geographyQuery.data

  // The scope's place in the area tree, up to the user's own area.
  const trail = useMemo(() => {
    const byId = new Map(areas.map((area) => [area.id, area]))
    const allowed = new Set(scopes.map((option) => option.value))
    const path: Area[] = []
    let current = byId.get(scope.value) ?? {
      id: scope.value,
      name: scope.name,
      level: scope.level,
      parentId: null,
    }
    for (;;) {
      path.unshift(current)
      const parent = current.parentId ? byId.get(current.parentId) : undefined
      if (!parent || !allowed.has(parent.id)) break
      current = parent
    }
    return path
  }, [areas, scopes, scope])

  const canFocus = useCallback(
    (id: string) => scopes.some((option) => option.value === id),
    [scopes],
  )
  const scoped = (to: string) =>
    `${to}${to.includes('?') ? '&' : '?'}scope=${encodeURIComponent(scope.value)}`
  const refreshing =
    (overviewQuery.isFetching && !overviewQuery.isPending) ||
    (geographyQuery.isFetching && !geographyQuery.isPending)
  const refresh = () => {
    void overviewQuery.refetch()
    void geographyQuery.refetch()
  }
  const failed = overviewQuery.error ?? geographyQuery.error

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <PageHero
            title="Geographical monitoring"
            lede="Enforcement activity by area, from a single enforcement point to the whole country."
            section="Workspace"
            icons="geography"
            actions={<RefreshButton refreshing={refreshing} onRefresh={refresh} />}
          />
          <OverviewFilterBar
            scopes={scopes}
            scope={scope.value}
            onScopeChange={onScopeChange}
            range={filters.range}
            onRangeChange={filter.setRange}
            period={filters}
            onCustomPeriodChange={filter.setCustomPeriod}
            people={NO_PEOPLE}
            checkedAt={overviewQuery.dataUpdatedAt}
            latestReceivedAt={overview?.latestReceivedAt}
          />
        </div>
        {overview && geography && (
          <SummaryStrip
            title={
              // "Lagos state · State" says the level twice; "Lagos Zone 1 · Enforcement zone" does not.
              scope.name.toLowerCase().includes(levelCaption(scope.level).toLowerCase())
                ? scope.name
                : `${scope.name} · ${levelCaption(scope.level)}`
            }
            meta={
              <span className={styles.stripMeta}>
                {trail.length > 1 && <ScopeTrail trail={trail} onScopeChange={onScopeChange} />}
                <span>
                  {periodLabel(filters.range, filters)} ·{' '}
                  {plural(geography.locations.length, 'enforcement point')} ·{' '}
                  {overview.reportingLocations} reporting
                </span>
              </span>
            }
          />
        )}
      </div>

      {overviewQuery.isPending || geographyQuery.isPending ? (
        <StatePanel kind="loading" message="Loading geographical monitoring…" />
      ) : !overview || !geography ? (
        <StatePanel kind="error" error={failed} onRetry={refresh} />
      ) : (
        <>
          {(overviewQuery.isError || geographyQuery.isError) && (
            <p className={styles.stale} role="status">
              The latest figures could not be loaded; these are from the last successful check.
            </p>
          )}
          <HeadlineFigures
            items={[
              {
                label: 'Verifications',
                value: overview.kpis.totalVerifications,
                icon: 'overview/kpi-scan.svg',
                note: `${overview.kpis.activeTripResults} active trip · ${overview.kpis.noActiveTripResults} no active trip`,
                to: link('verifications', scoped(paths.verifications)),
              },
              {
                label: 'Agents active',
                value: overview.kpis.agentsWithActivity,
                icon: 'overview/kpi-agents.svg',
                note: 'Recorded activity in this period',
                to: link('agents', scoped(paths.agents)),
              },
              {
                label: 'Violations issued',
                value: overview.kpis.violationsIssued,
                icon: 'overview/kpi-violation.svg',
                note: `By ${plural(overview.kpis.agentsWithViolations, 'agent')}`,
                to: link('violations', scoped(paths.violations)),
              },
              {
                label: 'Unresolved cases',
                value: overview.kpis.unresolvedViolations,
                icon: 'overview/kpi-unresolved.svg',
                note: 'Raised in this period, still open',
                to: link('violations', scoped(`${paths.violations}?status=unresolved`)),
              },
              {
                label: 'Escalated cases',
                value: overview.kpis.escalatedViolations,
                icon: 'overview/kpi-doc.svg',
                note: 'Escalated and still open',
                to: link('violations', scoped(`${paths.violations}?status=escalated`)),
              },
              {
                label: 'Repeat-vehicle alerts',
                value: overview.kpis.openRepeatAlerts,
                icon: 'overview/kpi-bell.svg',
                note: `${overview.kpis.repeatVehiclesWithoutFollowUp} without follow-up`,
                to: link('violations', scoped(`${paths.violations}?view=repeat-vehicles`)),
              },
              {
                label: 'Payments received',
                value: overview.payments.received,
                icon: 'overview/kpi-check.svg',
                note: `${overview.payments.pending} pending · ${overview.payments.tripActivatedOnPaid} trips activated`,
                to: link('payments', scoped(paths.payments)),
              },
              {
                label: 'Enforcement locations',
                value: geography.locations.length,
                icon: 'overview/kpi-pin.svg',
                note: `${overview.reportingLocations} reporting · recorded positions, not live`,
              },
            ]}
          />

          <AreasCard scope={scope} areas={geography.areas} onScopeChange={onScopeChange} />

          <div className={styles.splitRow}>
            <EnforcementPointsCard
              points={geography.locations}
              canFocus={canFocus}
              onScopeChange={onScopeChange}
            />
            <OutcomesCard outcomes={overview.outcomes} />
          </div>

          <PerformanceCard
            agents={overview.agents}
            locations={overview.locations}
            showLocations={coversSeveralLocations(scope.level)}
          />

          <div className={styles.row}>
            <CasesCard cases={overview.cases} />
            <RepeatVehiclesCard repeat={overview.repeatVehicles} />
            <PaymentStatusCard payments={overview.payments} />
          </div>

          <RecentActivityCard records={overview.recentActivity} />
        </>
      )}
    </div>
  )
}
