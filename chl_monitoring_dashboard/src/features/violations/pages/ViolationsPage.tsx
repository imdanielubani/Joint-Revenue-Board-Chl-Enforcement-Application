import { useCallback, useId, useMemo, useState } from 'react'
import { useAgents } from '@/features/agents/agents.queries'
import { useCurrentUser } from '@/features/auth/session-context'
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
import { CaseDialog } from '../components/CaseDialog'
import { RelatedDialog, type Related, type RelatedKind } from '../components/RelatedDialog'
import cards from '../components/ViolationCards.module.css'
import {
  CategoriesPanel,
  HistoryPanel,
  RegisterPanel,
  StatusesPanel,
  UnresolvedPanel,
} from '../components/ViolationPanels'
import { isClosed, isUnresolved } from '../violations-display'
import { useViolationsMonitoring } from '../violations.queries'
import type { ViolationCase } from '../violations.schemas'
import { useViolationsView, type ViolationsView } from '../use-violations-view'
import styles from './ViolationsPage.module.css'

/**
 * Violations & cases (SRD 8): a monitoring view of the violations received by
 * CHL — the register, categories, status views, unresolved cases, and closure
 * and cancellation history. Read-only: no case is closed, cancelled or edited here.
 */
export function ViolationsPage() {
  const user = useCurrentUser()
  const areas = useAreas()
  const scopes = useMemo(() => scopeOptions(user, areas.data), [user, areas.data])
  const [first] = scopes
  if (!first) {
    return (
      <StatePanel
        kind="empty"
        message="No areas are assigned to your account in CHL yet, so there are no violations to show. Ask your administrator to assign your areas."
      />
    )
  }
  return <ViolationsContent scopes={scopes} fallbackScope={first} areasPending={areas.isPending} />
}

function ViolationsContent({
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
  const page = useViolationsView()

  const query = useViolationsMonitoring(filters, { enabled: !filter.waiting })
  const monitoring = query.data
  const cases = useMemo(() => monitoring?.cases ?? [], [monitoring])
  const subtitle = `${scope.name} · ${periodLabel(filters.range, filters)}`
  const open = cases.find((item) => item.id === page.caseId) ?? null

  const { openCase, showInRegister } = page
  // A case's evidence, verification or agent, open in its own popup in place of the case.
  const [related, setRelated] = useState<Related | null>(null)
  const onOpen = useCallback(
    (item: ViolationCase, kind?: RelatedKind) => {
      if (kind) {
        setRelated({ kind, item })
        openCase(null)
      } else {
        setRelated(null)
        openCase(item.id)
      }
    },
    [openCase],
  )

  const counts = useMemo(
    () => ({
      unresolved: cases.filter(isUnresolved).length,
      escalated: cases.filter((item) => item.status === 'escalated').length,
      paymentPending: cases.filter((item) => item.status === 'payment_pending').length,
      closed: cases.filter(isClosed).length,
      resolved: cases.filter((item) => item.closure?.outcome === 'resolved').length,
      cancelled: cases.filter((item) => item.closure?.outcome === 'cancelled').length,
      categories: new Set(cases.map((item) => item.category)).size,
      statuses: new Set(cases.map((item) => item.status)).size,
    }),
    [cases],
  )

  return (
    <div className={styles.page}>
      <div>
        <PageHero
          title="Violations & cases"
          lede="A monitoring view of the violations received by CHL. Read-only: cases are not closed, cancelled or edited here."
          section="Enforcement"
          icons="violations"
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
        <StatePanel kind="loading" message="Loading violations…" />
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
                label: 'Violations received',
                value: cases.length,
                icon: 'overview/kpi-violation.svg',
                note: 'Received by CHL in this period',
                to: page.linkTo('register'),
              },
              {
                label: 'Unresolved cases',
                value: counts.unresolved,
                icon: 'overview/kpi-unresolved.svg',
                note: `${counts.escalated} escalated within this total`,
                to: page.linkTo('unresolved'),
              },
              {
                label: 'Payment pending',
                value: counts.paymentPending,
                icon: 'overview/kpi-doc.svg',
                note: 'Demand notices awaiting payment',
                to: page.linkTo('register', { status: 'payment_pending' }),
              },
              {
                label: 'Closed or cancelled',
                value: counts.closed,
                icon: 'overview/kpi-check.svg',
                note: `${counts.resolved} closed · ${counts.cancelled} cancelled`,
                to: page.linkTo('history'),
              },
            ]}
          />

          <section className={styles.views} aria-label="Violation views">
            <SegmentedTabs<ViolationsView>
              idBase={tabsId}
              label="Violation views"
              tabs={[
                { id: 'register', label: 'Violation Register', count: cases.length },
                { id: 'categories', label: 'Violation Categories', count: counts.categories },
                { id: 'statuses', label: 'Status Views', count: counts.statuses },
                { id: 'unresolved', label: 'Unresolved Cases', count: counts.unresolved },
                { id: 'history', label: 'Closure & Cancellation History', count: counts.closed },
              ]}
              value={page.view}
              onChange={page.setView}
            />
            <div id={panelId(tabsId)} role="tabpanel" aria-labelledby={tabId(tabsId, page.view)}>
              {page.view === 'register' && (
                <RegisterPanel
                  cases={cases}
                  subtitle={`Violations received by CHL · ${subtitle}`}
                  onOpen={onOpen}
                  category={page.category}
                  status={page.status}
                  plate={page.plate}
                  onCategoryChange={page.setCategory}
                  onStatusChange={page.setStatus}
                />
              )}
              {page.view === 'categories' && (
                <CategoriesPanel
                  cases={cases}
                  subtitle={`The documented violation categories · ${scope.name}`}
                  periodText={periodLabel(filters.range, filters)}
                  onShow={(category) => showInRegister({ category })}
                />
              )}
              {page.view === 'statuses' && (
                <StatusesPanel
                  cases={cases}
                  subtitle={`Payment Pending, Resolved, Escalated, Cancelled and any other state CHL returns · ${subtitle}`}
                  onShow={(status) => showInRegister({ status })}
                />
              )}
              {page.view === 'unresolved' && (
                <UnresolvedPanel
                  cases={cases}
                  subtitle={`Outstanding violations, their recorded actions and pending follow-up · ${subtitle}`}
                  onOpen={onOpen}
                  repeatOnly={page.repeatOnly}
                />
              )}
              {page.view === 'history' && (
                <HistoryPanel
                  cases={cases}
                  subtitle={`Whether a case was closed or cancelled, by whom, with audit information where available · ${subtitle}`}
                  onOpen={onOpen}
                />
              )}
            </div>
          </section>

          {open && (
            <CaseDialog
              key={open.id}
              item={open}
              onClose={() => page.openCase(null)}
              onRelated={(kind) => onOpen(open, kind)}
            />
          )}
          {related && (
            <RelatedDialog
              key={`${related.kind}:${related.item.id}`}
              related={related}
              filters={filters}
              periodText={periodLabel(filters.range, filters)}
              onClose={() => setRelated(null)}
            />
          )}
          {page.caseId && !open && (
            <p className={styles.stale} role="status">
              Violation {page.caseId} is not in this area and period. Choose another area or period
              to find it.
            </p>
          )}

          <aside className={cards.pageNote}>
            <img src={assetUrl('verifications/note-info.svg')} alt="" width={16} height={16} />
            <div>
              <p className={cards.pageNoteTitle}>A monitoring module, not case editing.</p>
              <p className={cards.pageNoteText}>
                The SRD allows authorised administrators and other roles to close or cancel
                violations in CHL. This dashboard is read-only, so it has no close or cancel
                actions; it shows how and by whom each case was closed or cancelled.
              </p>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}
