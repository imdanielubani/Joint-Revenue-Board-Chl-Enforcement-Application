import { useCallback, useId, useMemo, useState } from 'react'
import { useAgents } from '@/features/agents/agents.queries'
import { useCurrentUser } from '@/features/auth/session-context'
import { useAreas } from '@/features/geography/areas.queries'
import { scopeOptions, type ScopeOption } from '@/features/geography/scope-options'
import { OverviewFilterBar } from '@/features/overview/components/OverviewHeader'
import { periodLabel } from '@/features/overview/overview-period'
import { useOverviewFilters } from '@/features/overview/use-overview-filters'
import { TripRelatedDialog, type TripRelated } from '@/features/trips/components/TripRelatedDialog'
import cards from '@/features/payments/components/PaymentCards.module.css'
import { assetUrl } from '@/shared/lib/asset-url'
import { HeadlineFigures } from '@/shared/ui/HeadlineFigures'
import { PageHero, RefreshButton } from '@/shared/ui/PageHero'
import { SegmentedTabs } from '@/shared/ui/SegmentedTabs'
import { StatePanel } from '@/shared/ui/StatePanel'
import { panelId, tabId } from '@/shared/ui/tab-ids'
import { AlertDialog } from '../components/AlertDialog'
import { AlertRegister } from '../components/AlertRegister'
import { SupervisoryNotifications } from '../components/SupervisoryNotifications'
import { useRepeatAlerts } from '../repeat-alerts.queries'
import { useRepeatAlertsView, type RepeatAlertsView } from '../use-repeat-alerts-view'
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
  const tabsId = useId()
  const agentList = useAgents()
  const filter = useOverviewFilters({ scopes, fallbackScope, areasPending, agents: agentList.data })
  const { scope, filters } = filter
  const page = useRepeatAlertsView()
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
  const { openAlert } = page
  // A record an alert leads to, open in its own popup in place of the alert.
  const [related, setRelated] = useState<TripRelated | null>(null)
  const onOpen = useCallback(
    (alert: { plate: string }) => {
      setRelated(null)
      openAlert(alert.plate)
    },
    [openAlert],
  )
  const onRelated = useCallback(
    (next: TripRelated) => {
      openAlert(null)
      setRelated(next)
    },
    [openAlert],
  )
  const open = alerts.find((alert) => alert.plate === page.alertPlate) ?? null

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
                to: page.linkTo({ followUp: 'none' }),
              },
              {
                label: 'Partial follow-up',
                value: counts.partial,
                icon: 'overview/kpi-check.svg',
                note: 'Some reports escalated or closed',
                to: page.linkTo({ followUp: 'partial' }),
              },
              {
                label: 'Notifications sent',
                value: counts.notified,
                icon: 'overview/kpi-bell.svg',
                note: `By the supervisory process · ${counts.unread} unread`,
                to: page.linkTo({ notified: 'unread' }),
              },
            ]}
          />

          <section className={styles.views} aria-label="Repeat vehicle alert views">
            <SegmentedTabs<RepeatAlertsView>
              idBase={tabsId}
              label="Repeat vehicle alert views"
              tabs={[
                { id: 'alerts', label: 'Alert register', count: alerts.length },
                { id: 'notifications', label: 'Supervisory notifications', count: counts.notified },
              ]}
              value={page.view}
              onChange={page.setView}
            />
            <div id={panelId(tabsId)} role="tabpanel" aria-labelledby={tabId(tabsId, page.view)}>
              {page.view === 'notifications' ? (
                <SupervisoryNotifications
                  alerts={alerts}
                  subtitle={`Repeat-vehicle notifications the central supervisory process sent, latest first · ${subtitle}`}
                  onOpen={onOpen}
                />
              ) : (
                <AlertRegister
                  alerts={alerts}
                  subtitle={`Vehicles reported ${data.threshold} or more qualifying times, most reports first · ${subtitle}`}
                  followUp={page.followUp}
                  notified={page.notified}
                  onFollowUpChange={page.setFollowUp}
                  onNotifiedChange={page.setNotified}
                  onOpen={onOpen}
                  onRelated={onRelated}
                />
              )}
            </div>
          </section>

          {open && (
            <AlertDialog
              key={open.plate}
              alert={open}
              periodText={periodLabel(filters.range, filters)}
              onRelated={onRelated}
              onClose={() => openAlert(null)}
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
          {page.alertPlate && !open && (
            <p className={styles.stale} role="status">
              {page.alertPlate} has no repeat-vehicle alert in this area and period. Choose another
              area or period to find it.
            </p>
          )}

          <aside className={cards.pageNote}>
            <img src={assetUrl('verifications/note-info.svg')} alt="" width={16} height={16} />
            <div>
              <p className={cards.pageNoteTitle}>
                An alert is three qualifying reports, not any three scans.
              </p>
              <p className={cards.pageNoteText}>
                A qualifying report is a violation that was not cancelled; a vehicle is listed while
                one of its reports is still open. Follow-up is partial once a report was escalated
                or closed. Alerts and their notifications come from the central supervisory process;
                no case is closed, escalated or changed here.
              </p>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}
