import { useCallback, useMemo } from 'react'
import { paths } from '@/config/paths'
import { useCurrentUser } from '@/features/auth/session-context'
import { useModuleLink } from '@/features/auth/use-module-link'
import { PeriodFilter } from '@/features/overview/components/OverviewHeader'
import { periodLabel } from '@/features/overview/overview-period'
import { useOverview } from '@/features/overview/overview.queries'
import { useOverviewFilters } from '@/features/overview/use-overview-filters'
import { formatDay } from '@/shared/lib/dates'
import { FilterBar } from '@/shared/ui/FilterBar'
import { FreshnessLine } from '@/shared/ui/FreshnessLine'
import { HeadlineFigures } from '@/shared/ui/HeadlineFigures'
import { PageHero, RefreshButton } from '@/shared/ui/PageHero'
import { StatePanel } from '@/shared/ui/StatePanel'
import { useAreas } from '../areas.queries'
import {
  EnforcementFollowUpCard,
  GeoOutcomesCard,
  PaymentFollowUpCard,
} from '../components/FollowUpCards'
import { EnforcementFootprintCard, LocationsInViewCard } from '../components/GeographyCards'
import { MonitoringScopeCard } from '../components/ScopeCards'
import { UnderlyingRecordsCard } from '../components/UnderlyingRecordsCard'
import { useGeography } from '../geography.queries'
import { scopeOptions, type ScopeOption } from '../scope-options'
import styles from './GeographyPage.module.css'

/**
 * Geographical monitoring (SRD 4): eight views of the same enforcement
 * records — national, region, subregion, state, LGA, ward, enforcement zone or
 * enforcement location — each with verification totals and outcomes, agent
 * activity, violations, unresolved and escalated cases, repeat-vehicle alerts,
 * payment follow-up, enforcement locations and the underlying records. Which
 * areas exist comes from CHL; no parent-child hierarchy is assumed.
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
  return <GeographyContent scopes={scopes} rootScope={first} areasPending={areas.isPending} />
}

function GeographyContent({
  scopes,
  rootScope,
  areasPending,
}: {
  scopes: readonly ScopeOption[]
  /** The user's own area: every location they may see is within it. */
  rootScope: ScopeOption
  areasPending: boolean
}) {
  const link = useModuleLink()
  const filter = useOverviewFilters({ scopes, fallbackScope: rootScope, areasPending, agents: [] })
  const { scope, filters, setScope } = filter
  const onScopeChange = useCallback((value: string) => setScope(value), [setScope])

  const enabled = !filter.waiting
  const overviewQuery = useOverview({ ...filters, agentId: null, organization: null }, { enabled })
  const geographyQuery = useGeography(filters, { enabled })
  // Every permitted location: the Enforcement Location view chooses among them all.
  const permittedQuery = useGeography({ ...filters, scope: rootScope.value }, { enabled })
  const overview = overviewQuery.data
  const geography = geographyQuery.data
  const permitted = permittedQuery.data

  const atLocation = scope.level === 'enforcement_point'
  const pointsInView = atLocation ? permitted?.locations : geography?.locations
  const onSelectLocation = useCallback(
    (id: string) => {
      if (scopes.some((option) => option.value === id)) setScope(id)
    },
    [scopes, setScope],
  )

  const scoped = (to: string) =>
    `${to}${to.includes('?') ? '&' : '?'}scope=${encodeURIComponent(scope.value)}`
  const queries = [overviewQuery, geographyQuery, permittedQuery]
  const refreshing = queries.some((query) => query.isFetching && !query.isPending)
  const refresh = () => {
    for (const query of queries) void query.refetch()
  }
  const recordWindow = `${periodLabel(filters.range, filters)} record window · through ${formatDay(filters.to)}`

  return (
    <div className={styles.page}>
      <div>
        <PageHero
          title="Geographical monitoring"
          lede="Eight views of the same enforcement records, from one enforcement location to the whole country."
          section="Workspace"
          icons="geography"
          actions={<RefreshButton refreshing={refreshing} onRefresh={refresh} />}
        />
        <FilterBar
          end={
            <FreshnessLine
              checkedAt={overviewQuery.dataUpdatedAt}
              latestReceivedAt={overview?.latestReceivedAt}
            />
          }
        >
          <PeriodFilter
            range={filters.range}
            onRangeChange={filter.setRange}
            period={filters}
            onCustomPeriodChange={filter.setCustomPeriod}
          />
        </FilterBar>
      </div>

      {queries.some((query) => query.isPending) ? (
        <StatePanel kind="loading" message="Loading geographical monitoring…" />
      ) : !overview || !geography || !permitted || !pointsInView ? (
        <StatePanel
          kind="error"
          error={overviewQuery.error ?? geographyQuery.error ?? permittedQuery.error}
          onRetry={refresh}
        />
      ) : (
        <>
          {queries.some((query) => query.isError) && (
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
                note: 'Outcomes, not unique trips',
                to: link('verifications', scoped(paths.verifications)),
              },
              {
                label: 'Agents with activity',
                value: overview.kpis.agentsWithActivity,
                icon: 'overview/kpi-agents.svg',
                note: 'Distinct recorded agent IDs',
                to: link('agents', scoped(paths.agents)),
              },
              {
                label: 'Unresolved cases',
                value: overview.kpis.unresolvedViolations,
                icon: 'overview/kpi-unresolved.svg',
                note: `${overview.kpis.escalatedViolations} escalated within this total`,
                to: link('violations', scoped(`${paths.violations}?status=unresolved`)),
              },
              {
                label: 'Repeat-vehicle alerts',
                value: overview.repeatVehicles.open,
                icon: 'overview/kpi-bell.svg',
                note: `${overview.repeatVehicles.withoutFollowUp} with no follow-up recorded`,
                to: link('violations', scoped(`${paths.violations}?view=repeat-vehicles`)),
              },
            ]}
          />

          <MonitoringScopeCard
            key={scope.value}
            scopes={scopes}
            current={scope}
            onScopeChange={onScopeChange}
            recordWindow={recordWindow}
          />

          <div className={styles.splitRow}>
            <EnforcementFootprintCard
              points={pointsInView}
              verifications={geography.records.verifications}
              selectedId={atLocation ? scope.value : null}
              onSelect={onSelectLocation}
            />
            <LocationsInViewCard
              scopeName={scope.name}
              points={pointsInView}
              permitted={permitted.locations.length}
              selectedId={atLocation ? scope.value : null}
              onSelect={onSelectLocation}
            />
          </div>

          <div className={styles.row}>
            <GeoOutcomesCard scopeId={scope.value} overview={overview} />
            <EnforcementFollowUpCard
              scopeId={scope.value}
              overview={overview}
              violations={geography.records.violations}
            />
            <PaymentFollowUpCard scopeId={scope.value} notices={geography.records.notices} />
          </div>

          <UnderlyingRecordsCard
            scopeName={scope.name}
            overview={overview}
            records={geography.records}
            locations={geography.locations}
          />

          <p className={styles.note}>
            Scope memberships are configuration assignments from CHL; no parent-child hierarchy is
            assumed. Only records CHL has received are counted — uploads still pending on a device
            are not.
          </p>
        </>
      )}
    </div>
  )
}
