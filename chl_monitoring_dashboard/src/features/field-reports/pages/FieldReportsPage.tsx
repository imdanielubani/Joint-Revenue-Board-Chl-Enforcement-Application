import { useMemo } from 'react'
import { useAgents } from '@/features/agents/agents.queries'
import { useCurrentUser } from '@/features/auth/session-context'
import { useAreas } from '@/features/geography/areas.queries'
import { scopeOptions, type ScopeOption } from '@/features/geography/scope-options'
import { OverviewFilterBar } from '@/features/overview/components/OverviewHeader'
import { useOverviewFilters } from '@/features/overview/use-overview-filters'
import { HeadlineFigures } from '@/shared/ui/HeadlineFigures'
import { PageHero, RefreshButton } from '@/shared/ui/PageHero'
import { StatePanel } from '@/shared/ui/StatePanel'
import { useFieldReports } from '../field-reports.queries'
import styles from './FieldReportsPage.module.css'

/**
 * Field reports (SRD 3, 11.3): the vehicle, driver and situation reports,
 * general notifications and loaded / empty confirmations agents sent from the
 * mobile application. Read-only: nothing is answered or changed here.
 */
export function FieldReportsPage() {
  const user = useCurrentUser()
  const areas = useAreas()
  const scopes = useMemo(() => scopeOptions(user, areas.data), [user, areas.data])
  const [first] = scopes
  if (!first) {
    return (
      <StatePanel
        kind="empty"
        message="No areas are assigned to your account in CHL yet, so there are no field reports to show. Ask your administrator to assign your areas."
      />
    )
  }
  return (
    <FieldReportsContent scopes={scopes} fallbackScope={first} areasPending={areas.isPending} />
  )
}

function FieldReportsContent({
  scopes,
  fallbackScope,
  areasPending,
}: {
  scopes: readonly ScopeOption[]
  /** The area shown when the address names none, or one the user may not see. */
  fallbackScope: ScopeOption
  /** True until CHL's area tree has loaded; until then only the user's own areas are known. */
  areasPending: boolean
}) {
  const agentList = useAgents()
  const filter = useOverviewFilters({ scopes, fallbackScope, areasPending, agents: agentList.data })
  const { scope, filters } = filter
  const query = useFieldReports(filters, { enabled: !filter.waiting })
  const data = query.data
  const reports = useMemo(() => data?.reports ?? [], [data])
  const loads = useMemo(() => data?.loadReports ?? [], [data])

  const counts = useMemo(
    () => ({
      loaded: loads.filter((item) => item.load === 'loaded').length,
      empty: loads.filter((item) => item.load === 'empty').length,
      // Recorded offline on the device and synchronized later (SRD 13).
      offline: [...reports, ...loads].filter((item) => item.source === 'offline').length,
    }),
    [reports, loads],
  )

  return (
    <div className={styles.page}>
      <div>
        <PageHero
          title="Field reports"
          lede={`What agents reported from the field in ${scope.name}: vehicle, driver and situation reports, general notifications, and haulage-loaded or empty confirmations. Read-only: nothing is answered or changed here.`}
          section="Enforcement"
          icons="field-reports"
          actions={
            <RefreshButton
              refreshing={query.isFetching && !query.isPending}
              onRefresh={() => void query.refetch()}
            />
          }
        />
        <OverviewFilterBar
          scopes={scopes}
          scope={scope.value}
          onScopeChange={filter.setScope}
          range={filters.range}
          onRangeChange={filter.setRange}
          period={filters}
          onCustomPeriodChange={filter.setCustomPeriod}
          people={{
            organizations: filter.organizations,
            organization: filters.organization,
            onOrganizationChange: filter.setOrganization,
            agents: filter.agentOptions,
            agentId: filters.agentId,
            onAgentChange: filter.setAgent,
            onClear: filter.clearPeopleFilters,
          }}
          checkedAt={query.dataUpdatedAt}
          latestReceivedAt={data?.latestReceivedAt}
        />
      </div>

      {filter.waiting || query.isPending ? (
        <StatePanel kind="loading" message="Loading field reports…" />
      ) : !data ? (
        <StatePanel kind="error" error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          {query.isError && (
            <p className={styles.stale} role="status">
              The latest field reports could not be loaded; these are from the last successful
              check.
            </p>
          )}
          <HeadlineFigures
            items={[
              {
                label: 'Field reports',
                value: reports.length,
                icon: 'overview/kpi-doc.svg',
                note: 'Vehicle, driver, situation and general',
              },
              {
                label: 'Loaded',
                value: counts.loaded,
                icon: 'overview/kpi-check.svg',
                note: `Of ${loads.length} loaded / empty confirmations`,
              },
              {
                label: 'Empty',
                value: counts.empty,
                icon: 'overview/kpi-scan.svg',
                note: `Of ${loads.length} loaded / empty confirmations`,
              },
              {
                label: 'Recorded offline',
                value: counts.offline,
                icon: 'overview/kpi-pin.svg',
                note: 'Synchronized to CHL after they were made',
              },
            ]}
          />
        </>
      )}
    </div>
  )
}
