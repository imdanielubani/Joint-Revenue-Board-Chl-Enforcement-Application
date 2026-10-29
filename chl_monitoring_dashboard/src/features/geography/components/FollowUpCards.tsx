import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { useModuleLink } from '@/features/auth/use-module-link'
import { CasesCard } from '@/features/overview/components/AttentionCards'
import { PaymentStatusCard } from '@/features/overview/components/InsightCards'
import { outcomeLabel, outcomeStyle, plural } from '@/features/overview/overview-display'
import {
  VERIFICATION_OUTCOMES,
  type Overview,
  type VerificationOutcome,
} from '@/features/overview/overview.schemas'
import { assetUrl } from '@/shared/lib/asset-url'
import { formatNumber, formatPercent } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import { StatusLabel, type StatusTone } from '@/shared/ui/StatusLabel'
import type { NoticeRecord } from '../geography.schemas'
import styles from './FollowUpCards.module.css'

/** How many demand notices the payment card lists before pointing to the full records. */
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

/**
 * "Enforcement follow-up": the Overview's cases card for this scope, with the
 * violations the cases come from and the repeat vehicles still waiting for
 * follow-up. A review queue, not a response workflow.
 */
export function EnforcementFollowUpCard({
  scopeId,
  overview,
}: {
  scopeId: string
  overview: Overview
}) {
  const scoped = useScopedLink(scopeId)
  const { kpis, repeatVehicles } = overview

  return (
    <CasesCard
      cases={overview.cases}
      title="Enforcement follow-up"
      subtitle="A review queue, not a response workflow"
      scope={scopeId}
      intro={
        <p className={styles.intro}>
          <strong>{formatNumber(kpis.unresolvedViolations)}</strong> unresolved of{' '}
          {plural(kpis.violationsIssued, 'violation')} issued ·{' '}
          {formatNumber(kpis.escalatedViolations)} escalated, included in the unresolved total
        </p>
      }
    >
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
        <ArrowLink to={scoped('repeat-alerts', `${paths.repeatAlerts}?follow_up=none`)}>
          Open
        </ArrowLink>
      </div>
    </CasesCard>
  )
}

/* ------------------------------------------------------------ Payment follow-up */

/**
 * "Payment follow-up": the Overview's payment card for this scope, with the
 * latest demand notices linked to its violations. Payment received and trip
 * activation are separate outcomes (SRD 10).
 */
export function PaymentFollowUpCard({
  scopeId,
  payments,
  notices,
}: {
  scopeId: string
  payments: Overview['payments']
  /** Demand notices linked to the scope's violations in the period, newest first. */
  notices: readonly NoticeRecord[]
}) {
  const scoped = useScopedLink(scopeId)

  return (
    <PaymentStatusCard
      payments={payments}
      title="Payment follow-up"
      subtitle="Linked demand notices, not revenue targets"
      scope={scopeId}
    >
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
    </PaymentStatusCard>
  )
}
