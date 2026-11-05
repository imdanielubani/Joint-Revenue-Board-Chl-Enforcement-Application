import { useMemo } from 'react'
import { useAgents } from '@/features/agents/agents.queries'
import { useCurrentUser } from '@/features/auth/session-context'
import { useAreas } from '@/features/geography/areas.queries'
import { scopeOptions, type ScopeOption } from '@/features/geography/scope-options'
import { OverviewFilterBar } from '@/features/overview/components/OverviewHeader'
import { periodLabel } from '@/features/overview/overview-period'
import { useOverviewFilters } from '@/features/overview/use-overview-filters'
import cards from '@/features/payments/components/PaymentCards.module.css'
import { assetUrl } from '@/shared/lib/asset-url'
import { HeadlineFigures } from '@/shared/ui/HeadlineFigures'
import { PageHero, RefreshButton } from '@/shared/ui/PageHero'
import { StatePanel } from '@/shared/ui/StatePanel'
import { RegisterSkeleton } from '@/shared/ui/Skeleton'
import { DeviceStatusRegister } from '../components/DeviceStatusRegister'
import { fieldStatusCounts } from '../field-status-display'
import { useFieldStatus } from '../field-status.queries'
import { useFieldStatusView } from '../use-field-status-view'
import styles from './FieldStatusPage.module.css'

/**
 * Field operational status (document 13): each agent's last-reported RFID
 * reader, internet and GPS status, only where CHL supplies it, with when it was
 * reported. Never shown as current. Read-only.
 */
export function FieldStatusPage() {
  const user = useCurrentUser()
  const areas = useAreas()
  const scopes = useMemo(() => scopeOptions(user, areas.data), [user, areas.data])
  const [first] = scopes
  if (!first) {
    return (
      <StatePanel
        kind="empty"
        message="No areas are assigned to your account in CHL yet, so there is no device status to show. Ask your administrator to assign your areas."
      />
    )
  }
  return <FieldStatusContent scopes={scopes} fallbackScope={first} areasPending={areas.isPending} />
}

function FieldStatusContent({
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
  const page = useFieldStatusView()
  const query = useFieldStatus(filters, { enabled: !filter.waiting })
  const data = query.data
  const devices = useMemo(() => data?.devices ?? [], [data])
  const counts = useMemo(() => fieldStatusCounts(devices), [devices])

  return (
    <div className={styles.page}>
      <div>
        <PageHero
          title="Field operational status"
          lede={`Each agent’s last-reported RFID reader, internet and GPS status in ${scope.name}, where CHL supplies it, with when it was reported. Last reported, not current. Read-only.`}
          section="Monitoring"
          icons="field-status"
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
        <RegisterSkeleton message="Loading the reported device status…" filters={3} />
      ) : !data ? (
        <StatePanel kind="error" error={query.error} onRetry={() => void query.refetch()} />
      ) : !data.provided ? (
        <StatePanel
          kind="empty"
          message="CHL does not supply agents’ RFID reader, internet or GPS status, so none can be shown here."
        />
      ) : (
        <>
          {query.isError && (
            <p className={styles.stale} role="status">
              The latest device status could not be loaded; this is from the last successful check.
            </p>
          )}
          <HeadlineFigures
            items={[
              {
                label: 'Agents reporting',
                value: devices.length,
                icon: 'overview/kpi-agents.svg',
                note: 'Agents with a status report in this period',
              },
              {
                label: 'RFID reader disconnected',
                value: counts.readerDisconnected,
                icon: 'verifications/method-rfid.svg',
                note: 'As last reported, not current',
                to: page.linkTo({ rfid: 'disconnected' }),
              },
              {
                label: 'Internet disconnected',
                value: counts.internetDisconnected,
                icon: 'verifications/kpi-offline.svg',
                note: 'As last reported, not current',
                to: page.linkTo({ internet: 'disconnected' }),
              },
              {
                label: 'GPS disabled',
                value: counts.gpsDisabled,
                icon: 'overview/kpi-pin.svg',
                note: 'As last reported, not current',
                to: page.linkTo({ gps: 'disabled' }),
              },
            ]}
          />
          {devices.length === 0 ? (
            <StatePanel
              kind="empty"
              message={`No agent in ${scope.name} reported a device status in this period.`}
            />
          ) : (
            <DeviceStatusRegister
              devices={devices}
              filters={page.filters}
              onFilterChange={page.setFilter}
              subtitle={`Each agent’s last report, latest first · ${scope.name} · ${periodLabel(filters.range, filters)}`}
            />
          )}

          <aside className={cards.pageNote}>
            <img src={assetUrl('verifications/note-info.svg')} alt="" width={16} height={16} />
            <div>
              <p className={cards.pageNoteTitle}>Last reported, not current.</p>
              <p className={cards.pageNoteText}>
                Each status is what the agent’s device last reported, at the time shown. The
                dashboard cannot know a phone’s current state, or about actions still stored only on
                an offline phone. A status CHL does not supply is shown as “Not supplied”. No record
                is edited here.
              </p>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}
