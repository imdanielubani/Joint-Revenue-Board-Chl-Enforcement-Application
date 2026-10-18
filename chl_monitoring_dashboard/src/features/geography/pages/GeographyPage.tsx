import { useCallback, useMemo } from 'react'
import { useCurrentUser } from '@/features/auth/session-context'
import { PeriodFilter } from '@/features/overview/components/OverviewHeader'
import { plural } from '@/features/overview/overview-display'
import { periodLabel } from '@/features/overview/overview-period'
import { useOverview } from '@/features/overview/overview.queries'
import { useOverviewFilters } from '@/features/overview/use-overview-filters'
import { FilterBar } from '@/shared/ui/FilterBar'
import { FreshnessLine } from '@/shared/ui/FreshnessLine'
import { PageHero, RefreshButton } from '@/shared/ui/PageHero'
import { StatePanel } from '@/shared/ui/StatePanel'
import { SummaryStrip } from '@/shared/ui/SummaryStrip'
import { levelCaption, type Area } from '../areas'
import { useAreas } from '../areas.queries'
import { AreasCard, EnforcementPointsCard, ScopeTrail } from '../components/GeographyCards'
import { ScopeFeaturesCard, ScopeSelectorCard } from '../components/ScopeCards'
import { useGeography } from '../geography.queries'
import { scopeOptions, type ScopeOption } from '../scope-options'
import styles from './GeographyPage.module.css'

/**
 * Geographical monitoring (SRD 4): the same underlying data seen at one
 * monitoring scope at a time — enforcement location, zone, ward, LGA, state,
 * region, subregion or national — with the features the document lists for
 * every scope. The levels, and what sits under what, come from CHL.
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
  const filter = useOverviewFilters({ scopes, fallbackScope, areasPending, agents: [] })
  const { scope, filters, setScope } = filter
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
  const periodText = periodLabel(filters.range, filters)
  const refreshing =
    (overviewQuery.isFetching && !overviewQuery.isPending) ||
    (geographyQuery.isFetching && !geographyQuery.isPending)
  const refresh = () => {
    void overviewQuery.refetch()
    void geographyQuery.refetch()
  }

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <PageHero
            title="Geographical monitoring"
            lede="The same enforcement data seen by monitoring scope, from one enforcement location to the whole country."
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
                {periodText}
                {geography && ` · ${plural(geography.locations.length, 'enforcement point')}`}
              </span>
            </span>
          }
        />
      </div>

      <ScopeSelectorCard
        key={scope.value}
        scopes={scopes}
        areas={areas}
        current={scope}
        onScopeChange={onScopeChange}
      />

      {overviewQuery.isPending || geographyQuery.isPending ? (
        <StatePanel kind="loading" message="Loading geographical monitoring…" />
      ) : !overview || !geography ? (
        <StatePanel
          kind="error"
          error={overviewQuery.error ?? geographyQuery.error}
          onRetry={refresh}
        />
      ) : (
        <>
          {(overviewQuery.isError || geographyQuery.isError) && (
            <p className={styles.stale} role="status">
              The latest figures could not be loaded; these are from the last successful check.
            </p>
          )}
          <ScopeFeaturesCard
            scopeName={scope.name}
            scopeId={scope.value}
            periodText={periodText}
            overview={overview}
            locations={{
              total: geography.locations.length,
              reporting: overview.reportingLocations,
            }}
          />
          <EnforcementPointsCard
            points={geography.locations}
            canFocus={canFocus}
            onScopeChange={onScopeChange}
          />
          <AreasCard scope={scope} areas={geography.areas} onScopeChange={onScopeChange} />
        </>
      )}
    </div>
  )
}
