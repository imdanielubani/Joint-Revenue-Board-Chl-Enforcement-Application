import { useCallback, useId, useMemo, useState } from 'react'
import { useAgents } from '@/features/agents/agents.queries'
import { useCurrentUser } from '@/features/auth/session-context'
import { useAreas } from '@/features/geography/areas.queries'
import { scopeOptions, type ScopeOption } from '@/features/geography/scope-options'
import { OverviewFilterBar } from '@/features/overview/components/OverviewHeader'
import { periodLabel } from '@/features/overview/overview-period'
import { useOverviewFilters } from '@/features/overview/use-overview-filters'
import { TripRelatedDialog, type TripRelated } from '@/features/trips/components/TripRelatedDialog'
import { assetUrl } from '@/shared/lib/asset-url'
import { formatNaira } from '@/shared/lib/format'
import { HeadlineFigures } from '@/shared/ui/HeadlineFigures'
import { PageHero, RefreshButton } from '@/shared/ui/PageHero'
import { SegmentedTabs } from '@/shared/ui/SegmentedTabs'
import { StatePanel } from '@/shared/ui/StatePanel'
import { panelId, tabId } from '@/shared/ui/tab-ids'
import { NoticeDialog } from '../components/NoticeDialog'
import cards from '../components/PaymentCards.module.css'
import {
  CompliancePanel,
  RegisterPanel,
  StatusPanel,
  TransactionsPanel,
  type NoticeRelatedKind,
} from '../components/PaymentPanels'
import { usePaymentsMonitoring } from '../payments.queries'
import type { DemandNotice } from '../payments.schemas'
import { usePaymentsView, type PaymentsView } from '../use-payments-view'
import styles from './PaymentsPage.module.css'

/**
 * Payments & compliance (SRD 10): the demand notices CHL generated, their
 * payment status, then tabs for the register, post-payment compliance and
 * related transactions. Read-only: no tariff, invoice or payment is changed here.
 */
export function PaymentsPage() {
  const user = useCurrentUser()
  const areas = useAreas()
  const scopes = useMemo(() => scopeOptions(user, areas.data), [user, areas.data])
  const [first] = scopes
  if (!first) {
    return (
      <StatePanel
        kind="empty"
        message="No areas are assigned to your account in CHL yet, so there are no demand notices to show. Ask your administrator to assign your areas."
      />
    )
  }
  return <PaymentsContent scopes={scopes} fallbackScope={first} areasPending={areas.isPending} />
}

/** The total payable of these notices, as CHL supplied the amounts. */
const payable = (notices: readonly DemandNotice[]) =>
  notices.reduce((sum, notice) => sum + (notice.amounts.total ?? 0), 0)

function PaymentsContent({
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
  const page = usePaymentsView()

  const query = usePaymentsMonitoring(filters, { enabled: !filter.waiting })
  const monitoring = query.data
  const notices = useMemo(() => monitoring?.notices ?? [], [monitoring])
  const subtitle = `${scope.name} · ${periodLabel(filters.range, filters)}`
  const open = notices.find((notice) => notice.id === page.noticeId) ?? null

  const { openNotice, showInRegister } = page
  /** Lists these notices in the register below, and brings it into view. */
  const showBelow = (status: string) => {
    showInRegister(status)
    requestAnimationFrame(() =>
      document.getElementById(viewsId)?.scrollIntoView?.({ behavior: 'smooth' }),
    )
  }
  // A notice's case or verification, open in its own popup in place of the notice.
  const [related, setRelated] = useState<TripRelated | null>(null)
  const onOpen = useCallback(
    (notice: DemandNotice, kind?: NoticeRelatedKind) => {
      if (kind) {
        setRelated(
          kind === 'case'
            ? { kind: 'case', violationId: notice.violation.id }
            : { kind: 'verification', reference: notice.verificationReference },
        )
        openNotice(null)
      } else {
        setRelated(null)
        openNotice(notice.id)
      }
    },
    [openNotice],
  )

  const counts = useMemo(() => {
    const pending = notices.filter((notice) => notice.status === 'pending')
    const received = notices.filter((notice) => notice.status === 'received')
    return {
      pending: pending.length,
      pendingPayable: payable(pending),
      received: received.length,
      receivedPayable: payable(received),
      activated: received.filter((notice) => notice.compliance?.tripActivated).length,
      transactions: notices.reduce((sum, notice) => sum + notice.transactions.length, 0),
    }
  }, [notices])

  return (
    <div className={styles.page}>
      <div>
        <PageHero
          title="Payments & compliance"
          lede="A monitoring view of the demand notices CHL generated, their payment status and the compliance recorded after payment. Read-only: no tariff, invoice or payment is changed here."
          section="Monitoring"
          icons="payments"
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
        <StatePanel kind="loading" message="Loading demand notices…" />
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
                label: 'Demand notices',
                value: notices.length,
                icon: 'overview/kpi-doc.svg',
                note: 'Generated by CHL in this period',
                to: page.linkTo('register'),
              },
              {
                label: 'Payment pending',
                value: counts.pending,
                icon: 'overview/kpi-unresolved.svg',
                note: `${formatNaira(counts.pendingPayable)} awaiting payment`,
                to: page.linkTo('register', { status: 'pending' }),
              },
              {
                label: 'Payment received',
                value: counts.received,
                icon: 'overview/kpi-check.svg',
                note: `${formatNaira(counts.receivedPayable)} received`,
                to: page.linkTo('register', { status: 'received' }),
              },
              {
                label: 'Trip activated after payment',
                value: counts.activated,
                icon: 'overview/kpi-scan.svg',
                note: `Of ${counts.received} paid · a separate status`,
                to: page.linkTo('compliance'),
              },
            ]}
          />

          <StatusPanel
            notices={notices}
            subtitle={`Payment Pending and Payment Received, as reported by CHL · ${subtitle}`}
            onShow={showBelow}
          />

          <section id={viewsId} className={styles.views} aria-label="Payment views">
            <SegmentedTabs<PaymentsView>
              idBase={tabsId}
              label="Payment views"
              tabs={[
                { id: 'register', label: 'Demand Notice Register', count: notices.length },
                { id: 'compliance', label: 'Post-Payment Compliance', count: counts.received },
                { id: 'transactions', label: 'Related Transactions', count: counts.transactions },
              ]}
              value={page.view}
              onChange={page.setView}
            />
            <div id={panelId(tabsId)} role="tabpanel" aria-labelledby={tabId(tabsId, page.view)}>
              {page.view === 'register' && (
                <RegisterPanel
                  notices={notices}
                  subtitle={`Notices and invoices generated by CHL, and their violations · ${subtitle}`}
                  onOpen={onOpen}
                  status={page.status}
                  method={page.method}
                  plate={page.plate}
                  onStatusChange={page.setStatus}
                  onMethodChange={page.setMethod}
                />
              )}
              {page.view === 'compliance' && (
                <CompliancePanel
                  notices={notices}
                  subtitle={`Trip activation, tagging-process initiation and the compliance outcome after payment · ${subtitle}`}
                  onOpen={onOpen}
                />
              )}
              {page.view === 'transactions' && (
                <TransactionsPanel
                  notices={notices}
                  subtitle={`Transaction references linked to the notices, and their times · ${subtitle}`}
                  onOpen={onOpen}
                />
              )}
            </div>
          </section>

          {open && (
            <NoticeDialog
              key={open.id}
              notice={open}
              onClose={() => page.openNotice(null)}
              onRelated={(kind) => onOpen(open, kind)}
            />
          )}
          {related && (
            <TripRelatedDialog
              key={related.kind === 'case' ? related.violationId : related.kind}
              related={related}
              filters={filters}
              periodText={periodLabel(filters.range, filters)}
              onClose={() => setRelated(null)}
            />
          )}
          {page.noticeId && !open && (
            <p className={styles.stale} role="status">
              Demand notice {page.noticeId} is not in this area and period. Choose another area or
              period to find it.
            </p>
          )}

          <aside className={cards.pageNote}>
            <img src={assetUrl('verifications/note-info.svg')} alt="" width={16} height={16} />
            <div>
              <p className={cards.pageNoteTitle}>A monitoring module, not payment processing.</p>
              <p className={cards.pageNoteText}>
                Demand notices, amounts and payment statuses are shown as CHL reports them. There is
                no tariff editing, invoice generation, manual payment confirmation, refund or
                reconciliation here. Payment received and trip activated stay separate statuses: a
                paid notice does not mean a trip was activated.
              </p>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}
