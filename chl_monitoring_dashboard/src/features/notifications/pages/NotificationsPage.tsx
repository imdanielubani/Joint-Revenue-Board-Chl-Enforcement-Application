import { useCallback, useId, useMemo, useState } from 'react'
import { useAgents } from '@/features/agents/agents.queries'
import { useCurrentUser } from '@/features/auth/session-context'
import { useAreas } from '@/features/geography/areas.queries'
import { scopeOptions, type ScopeOption } from '@/features/geography/scope-options'
import { OverviewFilterBar } from '@/features/overview/components/OverviewHeader'
import { periodLabel } from '@/features/overview/overview-period'
import { useOverviewFilters } from '@/features/overview/use-overview-filters'
import { TripRelatedDialog, type TripRelated } from '@/features/trips/components/TripRelatedDialog'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import { HeadlineFigures } from '@/shared/ui/HeadlineFigures'
import { PageHero, RefreshButton } from '@/shared/ui/PageHero'
import { SegmentedTabs } from '@/shared/ui/SegmentedTabs'
import { StatePanel } from '@/shared/ui/StatePanel'
import { panelId, tabId } from '@/shared/ui/tab-ids'
import { NotificationDialog } from '../components/NotificationDialog'
import { NotificationRegister } from '../components/NotificationRegister'
import { useMarkNotificationsRead, useNotifications } from '../notifications.queries'
import { useNotificationsView, type NotificationsView } from '../use-notifications-view'
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

/** Each tab's register: its title, what it lists, and its table's name. */
const PANELS: Record<NotificationsView, { title: string; subtitle: string; label: string }> = {
  all: {
    title: 'All notifications',
    subtitle: 'Everything CHL delivered, latest first',
    label: 'Notifications',
  },
  enforcement: {
    title: 'Enforcement notifications',
    subtitle: 'Repeat-vehicle notifications and payments CHL confirmed',
    label: 'Enforcement notifications',
  },
  field: {
    title: 'Field notifications',
    subtitle:
      'SOS, vehicle, driver and situation reports, general notifications and loaded / empty confirmations from agents',
    label: 'Field notifications',
  },
  operational: {
    title: 'Operational notifications',
    subtitle: 'RFID reader, internet, GPS and synchronization notices from agents’ devices',
    label: 'Operational notifications',
  },
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
  const tabsId = useId()
  const agentList = useAgents()
  const filter = useOverviewFilters({ scopes, fallbackScope, areasPending, agents: agentList.data })
  const { scope, filters } = filter
  const page = useNotificationsView()
  const query = useNotifications(filters, { enabled: !filter.waiting })
  const { mutate: markRead } = useMarkNotificationsRead()
  const onRead = useCallback((id: string) => markRead([id]), [markRead])
  const { openNotification } = page
  // A record a notification leads to, open in its own popup in place of the notification.
  const [related, setRelated] = useState<TripRelated | null>(null)
  const onOpen = useCallback(
    (notification: { id: string }) => {
      setRelated(null)
      openNotification(notification.id)
    },
    [openNotification],
  )
  const onRelated = useCallback(
    (next: TripRelated) => {
      openNotification(null)
      setRelated(next)
    },
    [openNotification],
  )
  const data = query.data
  const notifications = useMemo(() => data?.notifications ?? [], [data])

  const counts = useMemo(
    () => ({
      unread: notifications.filter((item) => !item.read).length,
      openSos: notifications.filter((item) => item.entry?.sos?.status === 'open').length,
      field: notifications.filter((item) => item.category === 'field').length,
      enforcement: notifications.filter((item) => item.category === 'enforcement').length,
      operational: notifications.filter((item) => item.category === 'operational').length,
    }),
    [notifications],
  )
  const open = notifications.find((item) => item.id === page.notificationId) ?? null
  const subtitle = `${scope.name} · ${periodLabel(filters.range, filters)}`
  const panel = PANELS[page.view]
  const rows =
    page.view === 'all'
      ? notifications
      : notifications.filter((item) => item.category === page.view)

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

          <section className={styles.views} aria-label="Notification views">
            <SegmentedTabs<NotificationsView>
              idBase={tabsId}
              label="Notification views"
              tabs={[
                { id: 'all', label: 'All', count: notifications.length },
                { id: 'enforcement', label: 'Enforcement', count: counts.enforcement },
                { id: 'field', label: 'Field', count: counts.field },
                {
                  id: 'operational',
                  label: 'Operational',
                  // No count while CHL does not pass them on: nothing is not zero.
                  ...(data.operationalProvided ? { count: counts.operational } : {}),
                },
              ]}
              value={page.view}
              onChange={page.setView}
            />
            <div id={panelId(tabsId)} role="tabpanel" aria-labelledby={tabId(tabsId, page.view)}>
              {page.view === 'operational' && !data.operationalProvided ? (
                <DashboardCard
                  title={panel.title}
                  subtitle={panel.subtitle}
                  icon="overview/card-recent.svg"
                >
                  <p className={styles.empty}>
                    CHL does not provide agents’ operational notifications yet. They are the mobile
                    application’s own notices, and the SRD does not guarantee the backend receives
                    them. They will appear here once it does.
                  </p>
                </DashboardCard>
              ) : (
                <NotificationRegister
                  key={page.view}
                  title={panel.title}
                  subtitle={`${panel.subtitle} · ${subtitle}`}
                  label={panel.label}
                  notifications={rows}
                  showCategory={page.view === 'all'}
                  status={page.status}
                  type={page.type}
                  onStatusChange={page.setStatus}
                  onTypeChange={page.setType}
                  onOpen={onOpen}
                  onRelated={onRelated}
                />
              )}
            </div>
          </section>

          {open && (
            <NotificationDialog
              key={open.id}
              notification={open}
              onRead={onRead}
              onRelated={onRelated}
              onClose={() => openNotification(null)}
            />
          )}
          {related && (
            <TripRelatedDialog
              key={JSON.stringify(related)}
              related={related}
              filters={filters}
              periodText={periodLabel(filters.range, filters)}
              onClose={() => setRelated(null)}
            />
          )}
        </>
      )}
    </div>
  )
}
