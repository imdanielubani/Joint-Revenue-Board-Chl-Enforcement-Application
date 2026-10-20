import { useCallback, useId, useMemo } from 'react'
import { useCurrentUser } from '@/features/auth/session-context'
import { useAgents } from '@/features/agents/agents.queries'
import { useAreas } from '@/features/geography/areas.queries'
import { scopeOptions, type ScopeOption } from '@/features/geography/scope-options'
import { OverviewFilterBar } from '@/features/overview/components/OverviewHeader'
import { periodLabel } from '@/features/overview/overview-period'
import { useOverviewFilters } from '@/features/overview/use-overview-filters'
import { assetUrl } from '@/shared/lib/asset-url'
import { HeadlineFigures } from '@/shared/ui/HeadlineFigures'
import { PageHero, RefreshButton } from '@/shared/ui/PageHero'
import { SegmentedTabs } from '@/shared/ui/SegmentedTabs'
import { StatePanel } from '@/shared/ui/StatePanel'
import { panelId, tabId } from '@/shared/ui/tab-ids'
import { RecordsPanel } from '../components/RecordsPanel'
import { EtagResultsCard, MethodsCard, ProvenanceCard } from '../components/SummaryCards'
import { VerificationDetailsDialog } from '../components/VerificationDetailsDialog'
import { OutcomesPanel, SyncPanel, VehiclesPanel } from '../components/ViewPanels'
import { OUTCOME_ORDER, syncStateOf } from '../verifications-display'
import type { RegisterFilters } from '../verifications-filters'
import { useVerificationsMonitoring } from '../verifications.queries'
import type { VerificationEntry } from '../verifications.schemas'
import { useVerificationsView, type VerificationsView } from '../use-verifications-view'
import cards from '../components/VerificationCards.module.css'
import styles from './VerificationsPage.module.css'

/**
 * Verifications & E-Tags (SRD 6): the verification results the mobile app and
 * CHL produced — methods, E-Tag results, outcomes, vehicles and where each
 * result came from — with each verification's details. A monitoring view: it
 * never runs a scan, and never shows raw RFID values.
 */
export function VerificationsPage() {
  const user = useCurrentUser()
  const areas = useAreas()
  const scopes = useMemo(() => scopeOptions(user, areas.data), [user, areas.data])
  const [first] = scopes
  if (!first) {
    return (
      <StatePanel
        kind="empty"
        message="No areas are assigned to your account in CHL yet, so there are no verifications to show. Ask your administrator to assign your areas."
      />
    )
  }
  return (
    <VerificationsContent scopes={scopes} fallbackScope={first} areasPending={areas.isPending} />
  )
}

function VerificationsContent({
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
  const page = useVerificationsView()

  const query = useVerificationsMonitoring(filters, { enabled: !filter.waiting })
  const monitoring = query.data
  const records = useMemo(() => monitoring?.records ?? [], [monitoring])
  const subtitle = `${scope.name} · ${periodLabel(filters.range, filters)}`
  const open = records.find((record) => record.reference === page.reference) ?? null

  const { openRecord, showVehicle: onVehicle, showRecords: listRecords } = page
  // The tabs sit below the summary cards: bring them into view when a card lists records.
  const showRecords = useCallback(
    (only: Partial<RegisterFilters>) => {
      listRecords(only)
      document.getElementById(tabsId)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    },
    [listRecords, tabsId],
  )
  const onOpen = useCallback(
    (entry: VerificationEntry) => openRecord(entry.reference),
    [openRecord],
  )
  const onShowPlate = useCallback((plate: string) => listRecords({ query: plate }), [listRecords])

  const count = (test: (record: VerificationEntry) => boolean) =>
    records.reduce((sum, record) => sum + (test(record) ? 1 : 0), 0)
  const plates = new Set(records.map((record) => record.plate)).size
  // Every outcome CHL returns has its row, recorded in this period or not.
  const known: readonly string[] = OUTCOME_ORDER
  const outcomeCount =
    OUTCOME_ORDER.length +
    new Set(records.flatMap((record) => record.result ?? []).filter((r) => !known.includes(r))).size

  return (
    <div className={styles.page}>
      <div>
        <PageHero
          title="Verifications & E-Tags"
          lede="Verification results from the mobile app and CHL: methods, E-Tag results, outcomes and where each result came from."
          section="Enforcement"
          icons="verifications"
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
          latestReceivedAt={monitoring?.latestReceivedAt}
        />
      </div>

      {filter.waiting || query.isPending ? (
        <StatePanel kind="loading" message="Loading verifications…" />
      ) : !monitoring ? (
        <StatePanel kind="error" error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          {query.isError && (
            <p className={styles.stale} role="status">
              The latest figures could not be loaded; these are from the last successful check.
            </p>
          )}
          <HeadlineFigures
            items={[
              {
                label: 'Verification records',
                value: records.length,
                icon: 'overview/kpi-scan.svg',
                note: 'All recorded attempts in scope',
                to: page.linkTo('records'),
              },
              {
                label: 'Verification unavailable',
                value: count((record) => record.result === 'verification_unavailable'),
                icon: 'verifications/kpi-unavailable.svg',
                note: 'Not equivalent to No Active Trip',
                to: page.linkTo('records', { outcome: 'verification_unavailable' }),
              },
              {
                label: 'Cached / offline-origin',
                value: count(
                  (record) =>
                    record.provenance === 'cached_result' || record.provenance === 'offline_origin',
                ),
                icon: 'verifications/kpi-offline.svg',
                note: 'Recorded source, not current device state',
                to: page.linkTo('sync'),
              },
              {
                label: 'Pending synchronization',
                value: count((record) => syncStateOf(record) === 'upload_pending'),
                icon: 'verifications/kpi-pending.svg',
                note: 'Stored records with pending upload status',
                to: page.linkTo('records', { sync: 'upload_pending' }),
              },
            ]}
          />

          <div className={cards.summaryRow}>
            <MethodsCard records={records} onFilter={showRecords} />
            <EtagResultsCard records={records} onFilter={showRecords} />
            <ProvenanceCard
              records={records}
              onFilter={showRecords}
              review={{ label: 'Review source & synchronization', to: page.linkTo('sync') }}
            />
          </div>

          <section className={styles.views} aria-label="Verification views">
            <div id={tabsId} className={styles.tabsAnchor}>
              <SegmentedTabs<VerificationsView>
                idBase={tabsId}
                label="Verification views"
                tabs={[
                  { id: 'records', label: 'Verification records', count: records.length },
                  { id: 'vehicles', label: 'Vehicle identity', count: plates },
                  { id: 'outcomes', label: 'Verification outcomes', count: outcomeCount },
                  { id: 'sync', label: 'Source & synchronization' },
                ]}
                value={page.view}
                onChange={page.setView}
              />
            </div>
            <div id={panelId(tabsId)} role="tabpanel" aria-labelledby={tabId(tabsId, page.view)}>
              {page.view === 'records' && (
                <RecordsPanel
                  records={records}
                  filters={page.filters}
                  onFiltersChange={page.setFilters}
                  subtitle={subtitle}
                  onOpen={onOpen}
                  onVehicle={onVehicle}
                />
              )}
              {page.view === 'vehicles' && (
                <VehiclesPanel
                  key={page.plate}
                  records={records}
                  subtitle={`Each plate verified · ${subtitle}`}
                  initialPlate={page.plate}
                  onShowRecords={onShowPlate}
                  onOpen={onOpen}
                />
              )}
              {page.view === 'outcomes' && (
                <OutcomesPanel records={records} subtitle={subtitle} onFilter={showRecords} />
              )}
              {page.view === 'sync' && (
                <SyncPanel
                  records={records}
                  subtitle={subtitle}
                  onFilter={showRecords}
                  onOpen={onOpen}
                />
              )}
            </div>
          </section>

          {open && (
            <VerificationDetailsDialog
              entry={open}
              onClose={() => page.openRecord(null)}
              onVehicle={onVehicle}
            />
          )}
          {page.reference && !open && (
            <p className={styles.stale} role="status">
              Verification {page.reference} is not in this area and period. Choose another area or
              period to find it.
            </p>
          )}

          <aside className={cards.note}>
            <img src={assetUrl('verifications/note-info.svg')} alt="" width={16} height={16} />
            <div>
              <p className={cards.noteTitle}>Keep the outcome and the cause distinct.</p>
              <p className={cards.noteText}>
                A network failure is not “No Active Trip.” An unsuccessful RFID scan is not proof of
                a missing E-Tag. Vehicle, trip, case and payment links require explicit references;
                raw RFID identifiers are withheld from operational views.
              </p>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}
