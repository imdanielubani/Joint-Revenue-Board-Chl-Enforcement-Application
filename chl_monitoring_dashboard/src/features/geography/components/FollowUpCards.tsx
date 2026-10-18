import { useId, useState } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { useModuleLink } from '@/features/auth/use-module-link'
import {
  actionStatusLabel,
  actionStatusTone,
  outcomeLabel,
  outcomeStyle,
  plural,
  share,
} from '@/features/overview/overview-display'
import {
  VERIFICATION_OUTCOMES,
  type Overview,
  type VerificationOutcome,
} from '@/features/overview/overview.schemas'
import { assetUrl } from '@/shared/lib/asset-url'
import { formatNumber, formatPercent, formatShortDateTime } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import { SegmentedTabs } from '@/shared/ui/SegmentedTabs'
import { StatusLabel, type StatusTone } from '@/shared/ui/StatusLabel'
import { panelId, tabId } from '@/shared/ui/tab-ids'
import type { NoticeRecord, ViolationRecord } from '../geography.schemas'
import styles from './FollowUpCards.module.css'

/** How many cases and notices each card lists before pointing to the full records. */
const LIST_LIMIT = 3

/** Each tone's colour in the outcome bar. */
const TONE_COLOURS: Record<StatusTone, string> = {
  success: 'var(--status-success-text)',
  warning: 'var(--status-warning-text)',
  amber: 'var(--amber)',
  danger: 'var(--status-danger-text)',
  info: 'var(--chart-line)',
  neutral: 'var(--status-neutral-dot)',
}

type Scoped = (
  module: Parameters<ReturnType<typeof useModuleLink>>[0],
  to: string,
) => string | undefined

/** Links into a module's records, narrowed to the scope; undefined when the user may not open it. */
function useScopedLink(scopeId: string): Scoped {
  const link = useModuleLink()
  return (module, to) =>
    link(module, `${to}${to.includes('?') ? '&' : '?'}scope=${encodeURIComponent(scopeId)}`)
}

function ArrowLink({ to, children }: { to: string | undefined; children: string }) {
  if (!to) return null
  return (
    <Link className={styles.inlineLink} to={to}>
      {children}
      <img src={assetUrl('overview/footer-arrow.svg')} alt="" width={14} height={14} />
    </Link>
  )
}

/* ------------------------------------------------------------ Verification outcomes */

/** "Verification outcomes": every result kept distinct, never merged into pass/fail (SRD 6.1). */
export function GeoOutcomesCard({ scopeId, overview }: { scopeId: string; overview: Overview }) {
  const scoped = useScopedLink(scopeId)
  const counts = new Map(overview.outcomes.map((entry) => [entry.outcome, entry.count]))
  // Every known outcome, then any CHL adds later, each on its own line.
  const rows = [
    ...VERIFICATION_OUTCOMES.map((outcome) => ({ outcome, count: counts.get(outcome) ?? 0 })),
    ...overview.outcomes.filter(
      (entry) => !(VERIFICATION_OUTCOMES as readonly string[]).includes(entry.outcome),
    ),
  ]
  const total = rows.reduce((sum, row) => sum + row.count, 0)
  const tile = (outcome: VerificationOutcome) => counts.get(outcome) ?? 0

  return (
    <DashboardCard
      title="Verification outcomes"
      subtitle="Every result, kept distinct"
      icon="overview/card-method.svg"
      bodyClassName={styles.body}
      footer={{
        label: 'Explore verification records',
        to: scoped('verifications', paths.verifications),
      }}
    >
      <div>
        <p className={styles.eyebrow}>Verification attempts</p>
        <p className={styles.big}>
          <strong>{formatNumber(overview.kpis.totalVerifications)}</strong>
          <span>in this scope &amp; period</span>
        </p>
      </div>
      <span className={styles.bar} aria-hidden="true">
        {rows
          .filter((row) => row.count > 0)
          .map((row) => (
            <span
              key={row.outcome}
              style={{
                flexGrow: row.count,
                background: TONE_COLOURS[outcomeStyle(row.outcome).tone],
              }}
            />
          ))}
      </span>
      <div className={styles.tiles}>
        <div className={styles.tile}>
          <p className={styles.small}>Active Trip outcomes</p>
          <p className={styles.tileFigure}>
            <strong>{formatNumber(tile('active_trip'))}</strong>
            <span>{formatPercent(tile('active_trip'), total)}</span>
          </p>
        </div>
        <div className={styles.tile}>
          <p className={styles.small}>No Active Trip outcomes</p>
          <p className={styles.tileFigure}>
            <strong>{formatNumber(tile('no_active_trip'))}</strong>
            <span>{formatPercent(tile('no_active_trip'), total)}</span>
          </p>
        </div>
      </div>
      <div>
        <p className={styles.listHead}>
          <span>Outcome breakdown</span>
          <span>Count / share</span>
        </p>
        <ul className={styles.outcomes}>
          {rows.map((row) => {
            const style = outcomeStyle(row.outcome)
            const to = scoped('verifications', `${paths.verifications}?result=${row.outcome}`)
            const content = (
              <>
                <span className={styles.outcomeName}>
                  {style.icon && <img src={assetUrl(style.icon)} alt="" width={14} height={14} />}
                  {outcomeLabel(row.outcome)}
                </span>
                <span className={styles.outcomeFigure}>
                  <strong>{formatNumber(row.count)}</strong>
                  <span>{formatPercent(row.count, total)}</span>
                </span>
              </>
            )
            return (
              <li key={row.outcome}>
                {to ? (
                  <Link className={`${styles.outcome} ${styles.linked}`} to={to}>
                    {content}
                  </Link>
                ) : (
                  <span className={styles.outcome}>{content}</span>
                )}
              </li>
            )
          })}
        </ul>
      </div>
      <p className={styles.small}>
        Counts represent verification outcomes, not unique trips or vehicles.
      </p>
    </DashboardCard>
  )
}

/* ------------------------------------------------------------ Enforcement follow-up */

type CaseView = 'unresolved' | 'escalated'

/**
 * "Enforcement follow-up": unresolved and escalated cases, and repeat vehicles
 * still waiting for follow-up. A review queue, not a response workflow.
 */
export function EnforcementFollowUpCard({
  scopeId,
  overview,
  violations,
}: {
  scopeId: string
  overview: Overview
  /** The scope's violations in the period, newest first. */
  violations: readonly ViolationRecord[]
}) {
  const scoped = useScopedLink(scopeId)
  const idBase = useId()
  const [view, setView] = useState<CaseView>('unresolved')
  // The unresolved cases are the ones the Overview counts; escalated ones are among them.
  const open = new Set(overview.cases.items.map((item) => item.id))
  const unresolved = violations.filter((violation) => open.has(violation.id))
  const listed = (
    view === 'escalated'
      ? unresolved.filter((violation) => violation.status === 'escalated')
      : unresolved
  ).slice(0, LIST_LIMIT)
  const { kpis, repeatVehicles } = overview

  return (
    <DashboardCard
      title="Enforcement follow-up"
      subtitle="A review queue, not a response workflow"
      icon="overview/card-cases.svg"
      bodyClassName={styles.body}
      footer={{ label: 'View violation register', to: scoped('violations', paths.violations) }}
    >
      <div>
        <p className={styles.eyebrow}>Unresolved cases</p>
        <p className={styles.big}>
          <strong>{formatNumber(kpis.unresolvedViolations)}</strong>
          <span>of {plural(kpis.violationsIssued, 'violation')} issued</span>
        </p>
        <p className={styles.small}>
          {formatNumber(kpis.escalatedViolations)} escalated · included in the unresolved total
        </p>
      </div>
      <SegmentedTabs<CaseView>
        idBase={idBase}
        label="Cases to show"
        tabs={[
          { id: 'unresolved', label: 'Unresolved', count: kpis.unresolvedViolations },
          { id: 'escalated', label: 'Escalated', count: kpis.escalatedViolations },
        ]}
        value={view}
        onChange={setView}
      />
      <div id={panelId(idBase)} role="tabpanel" aria-labelledby={tabId(idBase, view)}>
        {listed.length === 0 ? (
          <p className={styles.empty}>
            {view === 'escalated' ? 'No escalated cases.' : 'No unresolved cases.'}
          </p>
        ) : (
          <ul className={styles.items}>
            {listed.map((violation) => {
              const to = scoped('violations', `${paths.violations}?case=${violation.id}`)
              return (
                <li key={violation.id} className={styles.item}>
                  <span className={styles.itemHead}>
                    <span className={styles.small}>{violation.id}</span>
                    <StatusLabel tone={actionStatusTone(violation.status)}>
                      {actionStatusLabel(violation.status)}
                    </StatusLabel>
                  </span>
                  {to ? (
                    <Link className={styles.plateLink} to={to}>
                      {violation.plate}
                      <img
                        src={assetUrl('overview/arrow-up-right.svg')}
                        alt=""
                        width={14}
                        height={14}
                      />
                    </Link>
                  ) : (
                    <span className={styles.plate}>{violation.plate}</span>
                  )}
                  <span className={styles.small}>{violation.category}</span>
                  <span className={styles.small}>
                    {formatShortDateTime(violation.recordedAt)} · {violation.location.area}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
        <ArrowLink to={scoped('violations', `${paths.violations}?status=unresolved`)}>
          {`View all ${formatNumber(kpis.unresolvedViolations)} unresolved cases`}
        </ArrowLink>
      </div>
      <div className={styles.callout}>
        <img src={assetUrl('overview/kpi-bell.svg')} alt="" width={16} height={16} />
        <span className={styles.calloutText}>
          <strong>
            {repeatVehicles.withoutFollowUp === 1
              ? '1 repeat alert needs follow-up'
              : `${formatNumber(repeatVehicles.withoutFollowUp)} repeat alerts need follow-up`}
          </strong>
          <span className={styles.small}>
            No follow-up recorded · {plural(repeatVehicles.open, 'open alert')} in all
          </span>
        </span>
        <ArrowLink to={scoped('violations', `${paths.violations}?view=repeat-vehicles`)}>
          Open
        </ArrowLink>
      </div>
    </DashboardCard>
  )
}

/* ------------------------------------------------------------ Payment follow-up */

/**
 * "Payment follow-up": the demand notices linked to the scope's violations.
 * Payment received and trip activation are separate outcomes (SRD 10).
 */
export function PaymentFollowUpCard({
  scopeId,
  notices,
}: {
  scopeId: string
  /** Demand notices linked to the scope's violations in the period, newest first. */
  notices: readonly NoticeRecord[]
}) {
  const scoped = useScopedLink(scopeId)
  const received = notices.filter((notice) => notice.status === 'received').length
  const pending = notices.filter((notice) => notice.status === 'pending').length
  const activated = notices.filter((notice) => notice.tripActivated).length

  return (
    <DashboardCard
      title="Payment follow-up"
      subtitle="Linked demand notices, not revenue targets"
      icon="overview/card-payment.svg"
      bodyClassName={styles.body}
      footer={
        <p className={styles.footer}>
          Payment received does not confirm trip activation or compliance. Payment update times are
          not supplied.
        </p>
      }
    >
      <div>
        <p className={styles.eyebrow}>Linked demand notices</p>
        <p className={styles.big}>
          <strong>{formatNumber(notices.length)}</strong>
          <span>within the selected scope</span>
        </p>
      </div>
      <div className={styles.tiles}>
        <div className={styles.tile}>
          <img src={assetUrl('overview/kpi-check.svg')} alt="" width={16} height={16} />
          <p className={styles.small}>Payment received</p>
          <p className={styles.tileFigure}>
            <strong>{formatNumber(received)}</strong>
          </p>
          <p className={styles.small}>
            {Math.round(share(received, notices.length))}% of linked notices
          </p>
        </div>
        <div className={styles.tile}>
          <img src={assetUrl('overview/status-pending.svg')} alt="" width={16} height={16} />
          <p className={styles.small}>Payment pending</p>
          <p className={styles.tileFigure}>
            <strong>{formatNumber(pending)}</strong>
          </p>
          <p className={styles.small}>Awaiting recorded payment</p>
        </div>
      </div>
      <div>
        <p className={styles.listHead}>
          <span>Linked notice records</span>
          <span>Payment status</span>
        </p>
        {notices.length === 0 ? (
          <p className={styles.empty}>No demand notices in this scope and period.</p>
        ) : (
          <ul className={styles.notices}>
            {notices.slice(0, LIST_LIMIT).map((notice) => (
              <li key={notice.id} className={styles.notice}>
                <span className={styles.noticeText}>
                  <span className={styles.plate}>{notice.id}</span>
                  <span className={styles.small}>
                    {notice.plate} · {notice.violationId}
                  </span>
                </span>
                {notice.status === 'received' ? (
                  <StatusLabel tone="success">Payment Received</StatusLabel>
                ) : (
                  <StatusLabel tone="amber" icon="overview/status-pending.svg">
                    Payment Pending
                  </StatusLabel>
                )}
              </li>
            ))}
          </ul>
        )}
        <ArrowLink to={scoped('payments', paths.payments)}>Review all demand notices</ArrowLink>
      </div>
      <p className={styles.activation}>
        <span>
          <img src={assetUrl('overview/payment-trip.svg')} alt="" width={14} height={14} />
          Trip activation recorded
        </span>
        <strong>{formatNumber(activated)}</strong>
      </p>
    </DashboardCard>
  )
}
