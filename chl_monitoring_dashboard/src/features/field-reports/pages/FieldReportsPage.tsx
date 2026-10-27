import { useCallback, useId, useMemo, useState } from 'react'
import { useAgents } from '@/features/agents/agents.queries'
import { fieldReportLabel } from '@/features/command-centre/command-centre-display'
import { FIELD_REPORT_TYPES } from '@/features/command-centre/command-centre.schemas'
import { useCurrentUser } from '@/features/auth/session-context'
import { useAreas } from '@/features/geography/areas.queries'
import { scopeOptions, type ScopeOption } from '@/features/geography/scope-options'
import { OverviewFilterBar } from '@/features/overview/components/OverviewHeader'
import { periodLabel } from '@/features/overview/overview-period'
import { useOverviewFilters } from '@/features/overview/use-overview-filters'
import { TripRelatedDialog, type TripRelated } from '@/features/trips/components/TripRelatedDialog'
import { HeadlineFigures } from '@/shared/ui/HeadlineFigures'
import { PageHero, RefreshButton } from '@/shared/ui/PageHero'
import { SegmentedTabs } from '@/shared/ui/SegmentedTabs'
import { StatePanel } from '@/shared/ui/StatePanel'
import { panelId, tabId } from '@/shared/ui/tab-ids'
import { BreakdownCard } from '../components/BreakdownCard'
import { FieldRecordDialog } from '../components/FieldRecordDialog'
import { LoadsRegister, ReportsRegister } from '../components/FieldRegisters'
import { useFieldReports } from '../field-reports.queries'
import { useFieldReportsView, type FieldReportsView } from '../use-field-reports-view'
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
  const tabsId = useId()
  const viewsId = useId()
  const agentList = useAgents()
  const filter = useOverviewFilters({ scopes, fallbackScope, areasPending, agents: agentList.data })
  const { scope, filters } = filter
  const page = useFieldReportsView()
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
  const subtitle = `${scope.name} · ${periodLabel(filters.range, filters)}`
  const types = [
    ...new Set([...FIELD_REPORT_TYPES, ...reports.flatMap((r) => r.report?.type ?? [])]),
  ]

  const { showInRegister, openRecord } = page
  // A record a report leads to, open in its own popup in place of the report.
  const [related, setRelated] = useState<TripRelated | null>(null)
  const onOpen = useCallback(
    (item: { id: string }) => {
      setRelated(null)
      openRecord(item.id)
    },
    [openRecord],
  )
  const onRelated = useCallback(
    (next: TripRelated) => {
      openRecord(null)
      setRelated(next)
    },
    [openRecord],
  )
  const open = [...reports, ...loads].find((item) => item.id === page.recordId) ?? null
  /** Lists these records in the register below, and brings it into view. */
  const showBelow = (view: FieldReportsView, value: string) => {
    showInRegister(view, value)
    requestAnimationFrame(() =>
      document.getElementById(viewsId)?.scrollIntoView?.({ behavior: 'smooth' }),
    )
  }

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

          <div className={styles.breakdowns}>
            <BreakdownCard
              title="Reports by type"
              subtitle={`Vehicle, driver and situation reports and general notifications · ${subtitle}`}
              icon="overview/card-recent.svg"
              of="field reports"
              items={types.map((type) => ({
                value: type,
                label: fieldReportLabel(type),
                tone: 'info',
                count: reports.filter((item) => item.report?.type === type).length,
              }))}
              onShow={(value) => showBelow('reports', value)}
            />
            <BreakdownCard
              title="Loaded / empty"
              subtitle={`Haulage-loaded or empty status agents reported · ${subtitle}`}
              icon="overview/card-payment.svg"
              of="loaded / empty confirmations"
              items={[
                { value: 'loaded', label: 'Loaded', tone: 'success', count: counts.loaded },
                { value: 'empty', label: 'Empty', tone: 'neutral', count: counts.empty },
              ]}
              onShow={(value) => showBelow('loads', value)}
            />
          </div>

          <section id={viewsId} className={styles.views} aria-label="Field report views">
            <SegmentedTabs<FieldReportsView>
              idBase={tabsId}
              label="Field report views"
              tabs={[
                { id: 'reports', label: 'Reports', count: reports.length },
                { id: 'loads', label: 'Loaded / empty', count: loads.length },
              ]}
              value={page.view}
              onChange={page.setView}
            />
            <div id={panelId(tabsId)} role="tabpanel" aria-labelledby={tabId(tabsId, page.view)}>
              {page.view === 'reports' ? (
                <ReportsRegister
                  items={reports}
                  type={page.type}
                  onTypeChange={page.setType}
                  source={page.source}
                  onSourceChange={page.setSource}
                  onOpen={onOpen}
                  onRelated={onRelated}
                  subtitle={`Vehicle, driver and situation reports and general notifications, latest received first · ${subtitle}`}
                />
              ) : (
                <LoadsRegister
                  items={loads}
                  load={page.load}
                  onLoadChange={page.setLoad}
                  source={page.source}
                  onSourceChange={page.setSource}
                  onOpen={onOpen}
                  onRelated={onRelated}
                  subtitle={`Haulage-loaded or empty status agents reported, latest received first · ${subtitle}`}
                />
              )}
            </div>
          </section>

          {open && (
            <FieldRecordDialog
              key={open.id}
              item={open}
              onRelated={onRelated}
              onClose={() => openRecord(null)}
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
          {page.recordId && !open && (
            <p className={styles.stale} role="status">
              That report is not in this area and period. Choose another area or period to find it.
            </p>
          )}
        </>
      )}
    </div>
  )
}
