import { useMemo } from 'react'
import { useAgents } from '@/features/agents/agents.queries'
import { useCurrentUser } from '@/features/auth/session-context'
import { useAreas } from '@/features/geography/areas.queries'
import { scopeOptions, type ScopeOption } from '@/features/geography/scope-options'
import { OverviewFilterBar } from '@/features/overview/components/OverviewHeader'
import { useOverviewFilters } from '@/features/overview/use-overview-filters'
import { PageHero, RefreshButton } from '@/shared/ui/PageHero'
import { StatePanel } from '@/shared/ui/StatePanel'
import { useVerificationHistory } from '../history.queries'
import styles from './HistoryPage.module.css'

/**
 * Verification history (document 12.1): the recorded verification attempts,
 * each with its completion status, the action taken, the linked violation, the
 * payment request generated and what is still pending. Read-only.
 */
export function HistoryPage() {
  const user = useCurrentUser()
  const areas = useAreas()
  const scopes = useMemo(() => scopeOptions(user, areas.data), [user, areas.data])
  const [first] = scopes
  if (!first) {
    return (
      <StatePanel
        kind="empty"
        message="No areas are assigned to your account in CHL yet, so there is no verification history to show. Ask your administrator to assign your areas."
      />
    )
  }
  return <HistoryContent scopes={scopes} fallbackScope={first} areasPending={areas.isPending} />
}

function HistoryContent({
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
  const query = useVerificationHistory(filters, { enabled: !filter.waiting })
  const data = query.data
  const records = useMemo(() => data?.records ?? [], [data])

  return (
    <div className={styles.page}>
      <div>
        <PageHero
          title="Verification history"
          lede={`The verification attempts recorded in ${scope.name}: whether each was completed, the action taken, the violation it is linked to, the payment request generated and what is still pending. Read-only.`}
          section="Monitoring"
          icons="history"
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
        <StatePanel kind="loading" message="Loading the verification history…" />
      ) : !data ? (
        <StatePanel kind="error" error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          {query.isError && (
            <p className={styles.stale} role="status">
              The latest verification history could not be loaded; this is from the last successful
              check.
            </p>
          )}
          {records.length === 0 && (
            <StatePanel
              kind="empty"
              message={`No verification attempts were recorded in ${scope.name} in this period.`}
            />
          )}
        </>
      )}
    </div>
  )
}
