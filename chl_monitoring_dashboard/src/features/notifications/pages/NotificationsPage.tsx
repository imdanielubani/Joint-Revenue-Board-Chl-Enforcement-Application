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
import { useNotifications } from '../notifications.queries'
import styles from './NotificationsPage.module.css'

/**
 * Notifications (SRD 11): what CHL delivered to the dashboard for the user's
 * areas, enforcement and field notifications alike. Read-only: nothing is sent
 * to agents or answered here.
 */
export function NotificationsPage() {
  const user = useCurrentUser()
  const areas = useAreas()
  const scopes = useMemo(() => scopeOptions(user, areas.data), [user, areas.data])
  const [first] = scopes
  if (!first) {
    return (
      <StatePanel
        kind="empty"
        message="No areas are assigned to your account in CHL yet, so there are no notifications to show. Ask your administrator to assign your areas."
      />
    )
  }
  return (
    <NotificationsContent scopes={scopes} fallbackScope={first} areasPending={areas.isPending} />
  )
}

function NotificationsContent({
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
  const query = useNotifications(filters, { enabled: !filter.waiting })
  const data = query.data
  const notifications = useMemo(() => data?.notifications ?? [], [data])

  const counts = useMemo(
    () => ({
      unread: notifications.filter((item) => !item.read).length,
      openSos: notifications.filter((item) => item.entry?.sos?.status === 'open').length,
      field: notifications.filter((item) => item.category === 'field').length,
      enforcement: notifications.filter((item) => item.category === 'enforcement').length,
    }),
    [notifications],
  )

  return (
    <div className={styles.page}>
      <div>
        <PageHero
          title="Notifications"
          lede={`The notifications CHL delivered for ${scope.name}: enforcement notifications, and the SOS, reports and confirmations agents sent from the field. Read-only: nothing is sent to agents or answered here.`}
          section="Monitoring"
          icons="notifications"
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
        <StatePanel kind="loading" message="Loading notifications…" />
      ) : !data ? (
        <StatePanel kind="error" error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          {query.isError && (
            <p className={styles.stale} role="status">
              The latest notifications could not be loaded; these are from the last successful
              check.
            </p>
          )}
          <HeadlineFigures
            items={[
              {
                label: 'Unread',
                value: counts.unread,
                icon: 'overview/kpi-bell.svg',
                note: `Not opened yet, of ${notifications.length} in this period`,
              },
              {
                label: 'Open SOS',
                value: counts.openSos,
                icon: 'overview/kpi-unresolved.svg',
                note: 'Still open, as CHL reports them',
              },
              {
                label: 'Field notifications',
                value: counts.field,
                icon: 'overview/kpi-pin.svg',
                note: 'SOS, reports and loaded / empty confirmations',
              },
              {
                label: 'Enforcement notifications',
                value: counts.enforcement,
                icon: 'overview/kpi-violation.svg',
                note: 'Repeat vehicles and payments received',
              },
            ]}
          />
        </>
      )}
    </div>
  )
}
