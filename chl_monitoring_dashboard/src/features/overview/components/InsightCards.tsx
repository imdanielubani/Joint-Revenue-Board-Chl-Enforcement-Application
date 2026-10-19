import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { assetUrl } from '@/shared/lib/asset-url'
import { arcPath } from '@/shared/lib/chart-scale'
import { formatNumber, formatPercent } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import {
  etagResultColor,
  etagResultLabel,
  methodLabel,
  methodStyle,
  methodTag,
  plural,
  share,
} from '../overview-display'
import type { Overview } from '../overview.schemas'
import { useModuleLink } from '@/features/auth/use-module-link'
import styles from './InsightCards.module.css'

/** A link when there is somewhere to go, otherwise the same content without one. */
function MaybeLink({
  to,
  className,
  children,
}: {
  to: string | undefined
  className: string | undefined
  children: ReactNode
}) {
  return to ? (
    <Link className={`${className} ${styles.linked}`} to={to}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  )
}

/* ---------------------------------------------------------------- Methods */

const DONUT_SIZE = 112
const DONUT_STROKE = 14
const DONUT_RADIUS = (DONUT_SIZE - DONUT_STROKE) / 2
/** The space between segments, along the ring. */
const DONUT_GAP = 4
const DONUT_CENTER = DONUT_SIZE / 2

/** "Verification method": how attempts were captured, as a ring and four tiles. */
export function MethodCard({
  methods,
  etagResults,
}: {
  methods: Overview['methods']
  etagResults: Overview['etagResults']
}) {
  const link = useModuleLink()
  const total = methods.reduce((sum, item) => sum + item.count, 0)
  const top = methods.reduce<Overview['methods'][number] | null>(
    (best, item) => (item.count > (best?.count ?? 0) ? item : best),
    null,
  )

  // Each method's arc, clockwise from twelve o'clock. Round ends reach half the
  // stroke past an arc's ends, so each arc is trimmed by that plus half the gap.
  // Arcs are drawn as paths rather than dashed circles, which Figma exports drop.
  const used = methods.filter((item) => item.count > 0)
  const trim = (DONUT_STROKE / 2 + DONUT_GAP / 2) / DONUT_RADIUS
  const arcs = used.map((item, index) => {
    const before = used.slice(0, index).reduce((sum, other) => sum + other.count, 0)
    const start = (before / total) * 2 * Math.PI + trim
    const end = Math.max(start + 0.01, ((before + item.count) / total) * 2 * Math.PI - trim)
    return {
      method: item.method,
      path: arcPath(DONUT_CENTER, DONUT_CENTER, DONUT_RADIUS, start, end),
    }
  })

  return (
    <DashboardCard
      title="Verification method"
      subtitle="How verification attempts are captured"
      icon="overview/card-method.svg"
      bodyClassName={styles.methodBody}
      footer={{
        label: 'Explore verifications',
        to: link('verifications', paths.verifications),
      }}
    >
      <div className={styles.methodTop}>
        <div className={styles.donut}>
          <svg
            width={DONUT_SIZE}
            height={DONUT_SIZE}
            viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
            aria-hidden="true"
          >
            <circle
              cx={DONUT_CENTER}
              cy={DONUT_CENTER}
              r={DONUT_RADIUS}
              fill="none"
              stroke="var(--card-track)"
              strokeWidth={DONUT_STROKE}
            />
            {used.length === 1 && used[0] ? (
              // A single method fills the whole ring.
              <circle
                cx={DONUT_CENTER}
                cy={DONUT_CENTER}
                r={DONUT_RADIUS}
                fill="none"
                stroke={methodStyle(used[0].method).color}
                strokeWidth={DONUT_STROKE}
              />
            ) : (
              arcs.map((arc) => (
                <path
                  key={arc.method}
                  d={arc.path}
                  fill="none"
                  stroke={methodStyle(arc.method).color}
                  strokeWidth={DONUT_STROKE}
                  strokeLinecap="round"
                />
              ))
            )}
          </svg>
          <p className={styles.donutCenter}>
            <span className={styles.donutValue}>{formatNumber(total)}</span>
            <span className={styles.donutLabel}>attempts</span>
          </p>
        </div>
        <div className={styles.mostUsed}>
          <p className={styles.overline}>Most used method</p>
          <p className={styles.mostUsedName}>{top ? methodTag(top.method) : '—'}</p>
          <p className={styles.mostUsedShare}>
            {top ? (
              <>
                <strong>{formatPercent(top.count, total)}</strong> of recorded attempts
              </>
            ) : (
              'No attempts recorded'
            )}
          </p>
          <span className={styles.chip}>Observed method distribution</span>
        </div>
      </div>

      <ul className={styles.tiles}>
        {methods.map(({ method, count }) => {
          const { icon, color } = methodStyle(method)
          return (
            <li key={method}>
              <MaybeLink
                className={styles.tile}
                to={link('verifications', `${paths.verifications}?method=${method}`)}
              >
                <span className={styles.tileHead}>
                  {icon && <img src={assetUrl(icon)} alt="" width={14} height={14} />}
                  <span className={styles.tileName}>{methodLabel(method)}</span>
                  <img
                    className={styles.tileArrow}
                    src={assetUrl('overview/tile-arrow.svg')}
                    alt=""
                    width={12}
                    height={12}
                  />
                </span>
                <span className={styles.tileFigures}>
                  <span className={styles.tileValue}>{formatNumber(count)}</span>
                  <span className={styles.tileShare}>{formatPercent(count, total)}</span>
                </span>
                <span className={styles.track}>
                  <span
                    className={styles.fill}
                    style={{
                      width: `${share(count, total)}%`,
                      background: color,
                    }}
                  />
                </span>
              </MaybeLink>
            </li>
          )
        })}
      </ul>

      <EtagResults results={etagResults} />
    </DashboardCard>
  )
}

/**
 * "E-Tag results" (SRD 6.3): what the tag checks found, valid tags included, as
 * one bar and a legend, in the payment card's style. Kept apart from the
 * outcomes: a valid tag can still have no active trip.
 */
function EtagResults({ results }: { results: Overview['etagResults'] }) {
  const link = useModuleLink()
  const checks = results.reduce((sum, item) => sum + item.count, 0)
  return (
    <section className={styles.etag} aria-label="E-Tag results">
      <div className={styles.etagHead}>
        <p className={styles.overline}>E-Tag results</p>
        <span className={styles.chip}>{plural(checks, 'tag check')}</span>
      </div>
      <div className={styles.etagBar} aria-hidden="true">
        {checks === 0 ? (
          <span className={styles.etagEmpty} />
        ) : (
          results
            .filter((item) => item.count > 0)
            .map((item) => (
              <span
                key={item.result}
                style={{ flexGrow: item.count, background: etagResultColor(item.result) }}
              />
            ))
        )}
      </div>
      <ul className={styles.etagLegend}>
        {results.map(({ result, count }) => (
          <li key={result}>
            <MaybeLink
              className={styles.etagItem}
              to={link('verifications', `${paths.verifications}?etag=${result}`)}
            >
              <span
                className={styles.etagDot}
                style={{ background: etagResultColor(result) }}
                aria-hidden="true"
              />
              <span className={styles.etagName}>{etagResultLabel(result)}</span>
              <strong className={styles.etagCount}>{formatNumber(count)}</strong>
              <span className={styles.etagShare}>{formatPercent(count, checks)}</span>
            </MaybeLink>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ------------------------------------------------------------- Violations */

/** "Violations by category": each category's count, against the largest. */
export function ViolationCategoriesCard({
  categories,
}: {
  categories: Overview['violationCategories']
}) {
  const link = useModuleLink()
  const total = categories.reduce((sum, item) => sum + item.count, 0)
  const largest = Math.max(0, ...categories.map((item) => item.count))

  return (
    <DashboardCard
      title="Violations by category"
      subtitle="Distribution of recorded violations"
      icon="overview/card-violations.svg"
      footer={{ label: 'View violation register', to: link('violations', paths.violations) }}
    >
      <div className={styles.violationsTop}>
        <p className={styles.bigFigure}>
          <span className={styles.bigValue}>{formatNumber(total)}</span>
          <span className={styles.bigLabel}>violations recorded</span>
        </p>
        <span className={styles.chip}>{plural(categories.length, 'category', 'categories')}</span>
      </div>
      {categories.length === 0 ? (
        <p className={styles.empty}>No violations recorded in this period.</p>
      ) : (
        <ol className={styles.categories}>
          {categories.map((item, index) => (
            <li key={item.category}>
              <MaybeLink
                className={styles.category}
                to={link(
                  'violations',
                  `${paths.violations}?category=${encodeURIComponent(item.category)}`,
                )}
              >
                <span className={styles.rank}>{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.categoryMain}>
                  <span className={styles.categoryHead}>
                    <span>{item.category}</span>
                    <strong>{formatNumber(item.count)}</strong>
                  </span>
                  <span className={styles.track}>
                    <span
                      className={`${styles.fill} ${styles.violationFill}`}
                      style={{ width: `${share(item.count, largest)}%` }}
                    />
                  </span>
                </span>
                <span className={styles.categoryShare}>{formatPercent(item.count, total)}</span>
              </MaybeLink>
            </li>
          ))}
        </ol>
      )}
    </DashboardCard>
  )
}

/* --------------------------------------------------------------- Payments */

interface PaymentStatusCardProps {
  payments: Overview['payments']
  title?: string
  subtitle?: string
  /** The area the page shows; links to the payment lists are narrowed to it. */
  scope?: string | undefined
  /** Under the received and pending figures, such as the latest notices. */
  children?: ReactNode
}

/** "Payment status": demand notices paid and pending, kept apart from trip activation. */
export function PaymentStatusCard({
  payments,
  title = 'Payment status',
  subtitle = 'Demand-notice payment follow-up',
  scope,
  children,
}: PaymentStatusCardProps) {
  const link = useModuleLink()
  const { received, pending, tripActivatedOnPaid } = payments
  const linked = received + pending
  const paidShare = Math.round(share(received, linked))

  return (
    <DashboardCard
      title={title}
      subtitle={subtitle}
      icon="overview/card-payment.svg"
      footer={
        <p className={styles.paymentNote}>
          <img src={assetUrl('overview/payment-note.svg')} alt="" width={14} height={14} />
          Payment received and trip activated are distinct outcomes.
        </p>
      }
    >
      <div className={styles.paymentTop}>
        <div>
          <p className={styles.overline}>Payment received</p>
          <p className={styles.paymentShare}>
            {paidShare}
            <span className={styles.percentSign}>%</span>
          </p>
          <p className={styles.paymentCaption}>
            {received} of {plural(linked, 'linked demand notice')}
          </p>
        </div>
        <span className={styles.paymentIcon}>
          <img src={assetUrl('overview/payment-receipt.svg')} alt="" width={28} height={28} />
        </span>
      </div>

      <div className={styles.paymentBar} aria-hidden="true">
        {linked === 0 ? (
          <span className={styles.paymentEmpty} />
        ) : (
          <>
            {received > 0 && <span className={styles.paidPart} style={{ flexGrow: received }} />}
            {pending > 0 && <span className={styles.pendingPart} style={{ flexGrow: pending }} />}
          </>
        )}
      </div>

      <ul className={styles.paymentTiles}>
        {(
          [
            ['received', 'Received', received, styles.paidDot],
            ['pending', 'Pending', pending, styles.pendingDot],
          ] as const
        ).map(([status, label, value, dot]) => (
          <li key={status}>
            <MaybeLink
              className={styles.paymentTile}
              to={link(
                'payments',
                `${paths.payments}?status=${status}${scope ? `&scope=${encodeURIComponent(scope)}` : ''}`,
              )}
            >
              <span className={`${styles.dot} ${dot}`} aria-hidden="true" />
              <span className={styles.paymentTileMain}>
                <span className={styles.paymentTileLabel}>{label}</span>
                <span className={styles.paymentTileValue}>{formatNumber(value)}</span>
              </span>
              <img src={assetUrl('overview/arrow-up-right.svg')} alt="" width={14} height={14} />
            </MaybeLink>
          </li>
        ))}
      </ul>

      {children}

      <p className={styles.tripRow}>
        <span className={styles.tripLabel}>
          <img src={assetUrl('overview/payment-trip.svg')} alt="" width={15} height={15} />
          Trip activation recorded on paid notices
        </span>
        <strong>{formatNumber(tripActivatedOnPaid)}</strong>
      </p>
    </DashboardCard>
  )
}
