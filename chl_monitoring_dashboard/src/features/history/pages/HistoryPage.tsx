import { useMemo, useState } from 'react'
import { useAgents } from '@/features/agents/agents.queries'
import { useCurrentUser } from '@/features/auth/session-context'
import { useAreas } from '@/features/geography/areas.queries'
import { scopeOptions, type ScopeOption } from '@/features/geography/scope-options'
import { OverviewFilterBar } from '@/features/overview/components/OverviewHeader'
import { periodLabel } from '@/features/overview/overview-period'
import { useOverviewFilters } from '@/features/overview/use-overview-filters'
import { TripRelatedDialog, type TripRelated } from '@/features/trips/components/TripRelatedDialog'
import { VerificationDetailsDialog } from '@/features/verifications/components/VerificationDetailsDialog'
import { HeadlineFigures } from '@/shared/ui/HeadlineFigures'
import cards from '@/features/payments/components/PaymentCards.module.css'
import { assetUrl } from '@/shared/lib/asset-url'
import { downloadCsv } from '@/shared/lib/csv'
import { HeroButton, PageHero, RefreshButton } from '@/shared/ui/PageHero'
import { useToast } from '@/shared/ui/toast/toast-context'
import { StatePanel } from '@/shared/ui/StatePanel'
import { RegisterSkeleton } from '@/shared/ui/Skeleton'
import { HistoryRegister } from '../components/HistoryRegister'
import { applyHistoryFilters, historyCounts } from '../history-display'
import { historyCsvRows } from '../history-export'
import { useVerificationHistory } from '../history.queries'
import { useHistoryView } from '../use-history-view'
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
  const page = useHistoryView()
  const query = useVerificationHistory(filters, { enabled: !filter.waiting })
  const data = query.data
  const records = useMemo(() => data?.records ?? [], [data])
  const counts = useMemo(() => historyCounts(records), [records])
  const open = records.find((record) => record.reference === page.recordReference) ?? null
  // A record an attempt leads to, open in its own popup in place of the record details.
  const [related, setRelated] = useState<TripRelated | null>(null)
  const { showToast } = useToast()

  /** Saves the attempts the register shows as a CSV file. */
  const exportRecords = () => {
    const rows = applyHistoryFilters(records, page.filters)
    downloadCsv(`verification-history-${filters.from}-to-${filters.to}.csv`, historyCsvRows(rows))
    showToast({
      title: 'Verification history exported',
      lines: [`${rows.length} verification attempts saved as a CSV file.`],
      key: 'history-export',
    })
  }

  return (
    <div className={styles.page}>
      <div>
        <PageHero
          title="Verification history"
          lede={`The verification attempts recorded in ${scope.name}: whether each was completed, the action taken, the violation it is linked to, the payment request generated and what is still pending. Read-only.`}
          section="Monitoring"
          icons="history"
          actions={
            <>
              <RefreshButton
                refreshing={query.isFetching && !query.isPending}
                onRefresh={() => void query.refetch()}
              />
              <HeroButton
                variant="solid"
                icon="overview/export.svg"
                onClick={exportRecords}
                disabled={!data || records.length === 0}
              >
                Export records
              </HeroButton>
            </>
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
        <RegisterSkeleton message="Loading the verification history…" filters={5} />
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
          <HeadlineFigures
            items={[
              {
                label: 'Verification attempts',
                value: records.length,
                icon: 'overview/kpi-scan.svg',
                note: `${counts.completed} completed · ${counts.notCompleted} not completed`,
                to: page.linkTo({ completion: 'unsuccessful' }),
              },
              {
                label: 'Linked violations',
                value: counts.violations,
                icon: 'overview/kpi-violation.svg',
                note: 'Violations issued from these verifications',
                to: page.linkTo({ violation: 'linked' }),
              },
              {
                label: 'Payment requests',
                value: counts.payments,
                icon: 'overview/kpi-doc.svg',
                note: 'Demand notices generated from the violations',
                to: page.linkTo({ payment: 'any' }),
              },
              {
                label: 'Pending actions',
                value: counts.pending,
                icon: 'verifications/kpi-pending.svg',
                note: 'Open cases or evidence still uploading',
                to: page.linkTo({ pending: 'yes' }),
              },
            ]}
          />
          {records.length === 0 ? (
            <StatePanel
              kind="empty"
              message={`No verification attempts were recorded in ${scope.name} in this period.`}
            />
          ) : (
            <HistoryRegister
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
              {...(filters.agentId ? {} : { onAgent: filter.setAgent })}
              subtitle={`Recorded verification attempts, newest first · ${scope.name} · ${periodLabel(filters.range, filters)}`}
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
              {page.recordReference} is not in the verification history for this area and period.
              Choose another area or a longer period to find it.
            </p>
          )}

          <aside className={cards.pageNote}>
            <img src={assetUrl('verifications/note-info.svg')} alt="" width={16} height={16} />
            <div>
              <p className={cards.pageNoteTitle}>Not limited to the last 30 days.</p>
              <p className={cards.pageNoteText}>
                The SRD’s “last 30 days” default and “view all” apply to an agent’s personal
                history; they are not a 30-day limit on administrator access. Choose any period,
                including a custom range. No record is edited here.
              </p>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}
