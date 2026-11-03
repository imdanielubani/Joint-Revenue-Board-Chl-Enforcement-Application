import { useMemo, useState } from 'react'
import { useAgents } from '@/features/agents/agents.queries'
import { useCurrentUser } from '@/features/auth/session-context'
import { useAreas } from '@/features/geography/areas.queries'
import { scopeOptions, type ScopeOption } from '@/features/geography/scope-options'
import { OverviewFilterBar } from '@/features/overview/components/OverviewHeader'
import { periodLabel } from '@/features/overview/overview-period'
import { useOverviewFilters } from '@/features/overview/use-overview-filters'
import cards from '@/features/payments/components/PaymentCards.module.css'
import { TripRelatedDialog, type TripRelated } from '@/features/trips/components/TripRelatedDialog'
import { VerificationDetailsDialog } from '@/features/verifications/components/VerificationDetailsDialog'
import { assetUrl } from '@/shared/lib/asset-url'
import { HeadlineFigures } from '@/shared/ui/HeadlineFigures'
import { PageHero, RefreshButton } from '@/shared/ui/PageHero'
import { StatePanel } from '@/shared/ui/StatePanel'
import { SyncRegister } from '../components/SyncRegister'
import { syncCounts } from '../sync-display'
import { useSynchronization } from '../sync.queries'
import { useSyncView } from '../use-sync-view'
import styles from './SyncPage.module.css'

/**
 * Synchronization (document 13): the synchronization status stored with the
 * records CHL received, the records made offline, their evidence uploads and
 * how fresh the data is. Received data only. Read-only.
 */
export function SyncPage() {
  const user = useCurrentUser()
  const areas = useAreas()
  const scopes = useMemo(() => scopeOptions(user, areas.data), [user, areas.data])
  const [first] = scopes
  if (!first) {
    return (
      <StatePanel
        kind="empty"
        message="No areas are assigned to your account in CHL yet, so there are no received records to show. Ask your administrator to assign your areas."
      />
    )
  }
  return <SyncContent scopes={scopes} fallbackScope={first} areasPending={areas.isPending} />
}

function SyncContent({
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
  const page = useSyncView()
  const query = useSynchronization(filters, { enabled: !filter.waiting })
  const data = query.data
  const records = useMemo(() => data?.records ?? [], [data])
  const counts = useMemo(() => syncCounts(records), [records])
  const open = records.find((record) => record.reference === page.recordReference) ?? null
  // A record it leads to, open in its own popup in place of the record details.
  const [related, setRelated] = useState<TripRelated | null>(null)

  return (
    <div className={styles.page}>
      <div>
        <PageHero
          title="Synchronization"
          lede={`The records CHL has received from ${scope.name}: the synchronization status stored with each, the records made offline, their evidence uploads and when they arrived. Received data only. Read-only.`}
          section="Monitoring"
          icons="sync"
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
        <StatePanel kind="loading" message="Loading the received records…" />
      ) : !data ? (
        <StatePanel kind="error" error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          {query.isError && (
            <p className={styles.stale} role="status">
              The latest synchronization could not be loaded; this is from the last successful
              check.
            </p>
          )}
          <HeadlineFigures
            items={[
              {
                label: 'Records received',
                value: records.length,
                icon: 'overview/kpi-scan.svg',
                note: `${counts.synced} synced · ${counts.late} received late`,
                to: page.linkTo({ sync: 'synced' }),
              },
              {
                label: 'Offline-origin records',
                value: counts.offline,
                icon: 'verifications/source-offline.svg',
                note: 'Recorded with no connection, sent later',
                to: page.linkTo({ source: 'offline_origin' }),
              },
              {
                label: 'Received late',
                value: counts.late,
                icon: 'verifications/sync-late.svg',
                note: 'Received more than 10 minutes after recording',
                to: page.linkTo({ sync: 'received_late' }),
              },
              {
                label: 'Evidence uploading',
                value: counts.uploading,
                icon: 'verifications/kpi-pending.svg',
                note: 'Evidence still uploading, where CHL exposes it',
                to: page.linkTo({ sync: 'upload_pending' }),
              },
            ]}
          />
          {records.length === 0 ? (
            <StatePanel
              kind="empty"
              message={`CHL received no records from ${scope.name} in this period.`}
            />
          ) : (
            <SyncRegister
              records={records}
              filters={page.filters}
              onFilterChange={page.setFilter}
              onOpen={(record) => {
                setRelated(null)
                page.openRecord(record.reference)
              }}
              onRelated={(next) => {
                page.openRecord(null)
                setRelated(next)
              }}
              subtitle={`Received records, newest first · ${scope.name} · ${periodLabel(filters.range, filters)}`}
            />
          )}
          {open && (
            <VerificationDetailsDialog
              key={open.reference}
              entry={open}
              onClose={() => page.openRecord(null)}
              onVehicle={(plate) => {
                page.openRecord(null)
                setRelated({ kind: 'vehicle', plate })
              }}
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
          {page.recordReference && !open && (
            <p className={styles.stale} role="status">
              {page.recordReference} is not among the records received from this area in this
              period. Choose another area or a longer period to find it.
            </p>
          )}

          <aside className={cards.pageNote}>
            <img src={assetUrl('verifications/note-info.svg')} alt="" width={16} height={16} />
            <div>
              <p className={cards.pageNoteTitle}>Received data only.</p>
              <p className={cards.pageNoteText}>
                The dashboard cannot know about actions still stored only on an offline phone; they
                appear here once CHL receives them, with their earlier recorded time. “Field data
                received” is when CHL last received a record, and “Last checked” when this page last
                asked. No record is edited here.
              </p>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}
