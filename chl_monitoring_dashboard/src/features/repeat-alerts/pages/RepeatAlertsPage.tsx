import { useMemo } from 'react'
import { useAgents } from '@/features/agents/agents.queries'
import { useCurrentUser } from '@/features/auth/session-context'
import { useAreas } from '@/features/geography/areas.queries'
import { scopeOptions, type ScopeOption } from '@/features/geography/scope-options'
import { OverviewFilterBar } from '@/features/overview/components/OverviewHeader'
import { periodLabel } from '@/features/overview/overview-period'
import { useOverviewFilters } from '@/features/overview/use-overview-filters'
import { HeadlineFigures } from '@/shared/ui/HeadlineFigures'
import { PageHero, RefreshButton } from '@/shared/ui/PageHero'
import { StatePanel } from '@/shared/ui/StatePanel'
import { AlertRegister } from '../components/AlertRegister'
import { useRepeatAlerts } from '../repeat-alerts.queries'
import styles from './RepeatAlertsPage.module.css'

/**
 * Repeat vehicle alerts (SRD 11.1): vehicles reported three qualifying times
 * without appropriate follow-up, their reports, agents, locations, cases and
 * recorded actions, and the notifications the central supervisory process
 * sent. Read-only: no case is closed or changed here.
 */
export function RepeatAlertsPage() {
  const user = useCurrentUser()
  const areas = useAreas()
  const scopes = useMemo(() => scopeOptions(user, areas.data), [user, areas.data])
  const [first] = scopes
  if (!first) {
    return (
      <StatePanel
        kind="empty"
        message="No areas are assigned to your account in CHL yet, so there are no repeat-vehicle alerts to show. Ask your administrator to assign your areas."
      />
    )
  }
  return (
    <RepeatAlertsContent scopes={scopes} fallbackScope={first} areasPending={areas.isPending} />
  )
}

function RepeatAlertsContent({
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
  const query = useRepeatAlerts(filters, { enabled: !filter.waiting })
  const data = query.data
  const alerts = useMemo(() => data?.alerts ?? [], [data])

  const counts = useMemo(
    () => ({
      none: alerts.filter((alert) => alert.followUp === 'none').length,
      partial: alerts.filter((alert) => alert.followUp === 'partial').length,
      notified: alerts.filter((alert) => alert.notification).length,
      unread: alerts.filter((alert) => alert.notification && !alert.notification.read).length,
    }),
    [alerts],
  )
  const subtitle = `${scope.name} · ${periodLabel(filters.range, filters)}`

  return (
    <div className={styles.page}>
      <div>
        <PageHero
          title="Repeat vehicle alerts"
          lede={`Vehicles reported three qualifying times in ${scope.name} without appropriate follow-up, with their reports, agents, locations, cases and recorded actions. Read-only: no case is closed or changed here.`}
          section="Monitoring"
          icons="repeat-alerts"
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
        <StatePanel kind="loading" message="Loading repeat-vehicle alerts…" />
      ) : !data ? (
        <StatePanel kind="error" error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          {query.isError && (
            <p className={styles.stale} role="status">
              The latest alerts could not be loaded; these are from the last successful check.
            </p>
          )}
          <HeadlineFigures
            items={[
              {
                label: 'Repeat vehicles',
                value: alerts.length,
                icon: 'overview/kpi-violation.svg',
                note: `${data.threshold} or more qualifying reports, one still open`,
              },
              {
                label: 'No follow-up recorded',
                value: counts.none,
                icon: 'overview/kpi-unresolved.svg',
                note: 'No report escalated or closed yet',
              },
              {
                label: 'Partial follow-up',
                value: counts.partial,
                icon: 'overview/kpi-check.svg',
                note: 'Some reports escalated or closed',
              },
              {
                label: 'Notifications sent',
                value: counts.notified,
                icon: 'overview/kpi-bell.svg',
                note: `By the supervisory process · ${counts.unread} unread`,
              },
            ]}
          />

          <AlertRegister
            alerts={alerts}
            subtitle={`Vehicles reported ${data.threshold} or more qualifying times, most reports first · ${subtitle}`}
          />
        </>
      )}
    </div>
  )
}
