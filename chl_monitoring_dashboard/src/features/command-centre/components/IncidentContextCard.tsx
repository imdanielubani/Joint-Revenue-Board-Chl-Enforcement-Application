import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { useModuleLink } from '@/features/auth/use-module-link'
import { sourceLabel, syncStatusLabel } from '@/features/overview/overview-display'
import { assetUrl } from '@/shared/lib/asset-url'
import { formatDateTime, formatDelay, formatDuration } from '@/shared/lib/format'
import { useNow } from '@/shared/lib/use-now'
import { DashboardCard, type CardLink } from '@/shared/ui/DashboardCard'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import { feedKindLabel, feedStatus, feedTitle, sosDuration } from '../command-centre-display'
import type { FeedItem } from '../command-centre.schemas'
import styles from './IncidentContextCard.module.css'

/** Kinds of entry that may carry photographs, so "Not supplied" is worth saying. */
const EVIDENCE_KINDS: readonly string[] = ['verification', 'violation', 'field_report']

/**
 * "Incident context": the selected entry, as CHL recorded it. A summary block
 * (what it is, its vehicle, its status), the facts one under another, and the
 * record to open along the bottom.
 */
export function IncidentContextCard({ item }: { item: FeedItem | null }) {
  const link = useModuleLink()
  const primary = item ? primaryLink(item, link) : undefined

  return (
    <DashboardCard
      className={styles.card}
      title="Incident context"
      subtitle="The selected entry, as CHL recorded it"
      icon="command-centre/card-incident.svg"
      bodyClassName={styles.body}
      {...(primary?.to ? { footer: primary } : {})}
    >
      {item ? (
        <IncidentDetails item={item} />
      ) : (
        <p className={styles.empty}>Choose an entry in the feed to see its details.</p>
      )}
    </DashboardCard>
  )
}

type ModuleLink = ReturnType<typeof useModuleLink>

/** The record the entry belongs to; undefined `to` when the user may not open it. */
function primaryLink(item: FeedItem, link: ModuleLink): CardLink | undefined {
  if (item.violation) {
    return {
      label: 'Open the case',
      to: link('violations', `${paths.violations}?case=${item.violation.id}`),
    }
  }
  if (item.payment) {
    return {
      label: 'Open the payment',
      to: link('payments', `${paths.payments}?notice=${item.payment.noticeId}`),
    }
  }
  if (item.kind === 'verification') {
    return {
      label: 'Open in verifications',
      to: link(
        'verifications',
        `${paths.verifications}?plate=${encodeURIComponent(item.plate ?? '')}`,
      ),
    }
  }
  if (item.kind === 'sos') {
    return {
      label: 'Open the agent',
      to: link('agents', `${paths.agents}?agent=${encodeURIComponent(item.agent.id)}`),
    }
  }
  return undefined
}

function IncidentDetails({ item }: { item: FeedItem }) {
  const link = useModuleLink()
  const status = feedStatus(item)
  const title = feedTitle(item)
  const offline = item.source === 'offline'
  // The vehicle leads where there is one; otherwise what happened does.
  const headline = item.plate ?? title
  const evidenceTo =
    item.evidenceCount > 0
      ? link(
          'evidence',
          `${paths.evidence}?record=${encodeURIComponent(item.violation?.id ?? item.id)}`,
        )
      : undefined

  return (
    <>
      <div className={styles.summary}>
        <p className={styles.kind}>{feedKindLabel(item.kind)}</p>
        <p className={styles.headline}>{headline}</p>
        {headline !== title && title !== status?.label && <p className={styles.what}>{title}</p>}
        {status && (
          <span className={styles.status}>
            <StatusLabel tone={status.tone} {...(status.icon ? { icon: status.icon } : {})}>
              {status.label}
            </StatusLabel>
          </span>
        )}
      </div>

      <dl className={styles.facts}>
        {item.report && <Fact term="Report">{item.report.summary}</Fact>}
        {item.sos && (
          <Fact term="Message">{item.sos.message ?? 'No message was sent with the SOS.'}</Fact>
        )}
        {item.sos && <SosOpenFact item={item} />}
        <Fact term="Agent">
          {item.agent.id} · {item.agent.name}
        </Fact>
        <Fact term="Location">
          {item.location.name}
          <span className={styles.muted}>
            {[item.location.area, item.location.code].filter(Boolean).join(' · ')}
            {item.kind === 'sos' && ' · where it was sent, not a live position'}
          </span>
        </Fact>
        <Fact term="Recorded">{formatDateTime(item.recordedAt)}</Fact>
        <Fact term="Received by CHL">
          {item.receivedAt ? formatDateTime(item.receivedAt) : 'Not supplied'}
          {offline && item.receivedAt && (
            <span className={styles.delayed}>
              {formatDelay(item.recordedAt, item.receivedAt)} after it was recorded
            </span>
          )}
        </Fact>
        {(item.source || item.syncStatus) && (
          <Fact term="Checked">
            {[
              item.source ? sourceLabel(item.source) : null,
              item.syncStatus ? syncStatusLabel(item.syncStatus) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Fact>
        )}
        {item.violation ? (
          <Fact term="Related case">
            {item.violation.id}
            <span className={styles.muted}>{item.violation.category}</span>
          </Fact>
        ) : (
          item.kind === 'verification' && <Fact term="Related case">No violation recorded</Fact>
        )}
        {item.payment && (
          <Fact term="Demand notice">
            {item.payment.noticeId}
            <span className={styles.muted}>
              {item.payment.status === 'received'
                ? item.payment.tripActivated
                  ? 'Payment received; CHL reports the trip activated'
                  : 'Payment received; CHL has not reported the trip activated'
                : 'Awaiting payment'}
            </span>
          </Fact>
        )}
        {(item.evidenceCount > 0 || EVIDENCE_KINDS.includes(item.kind)) && (
          <Fact term="Evidence">
            {item.evidenceCount > 0 ? (
              <span className={styles.evidence}>
                {item.evidenceCount} photograph{item.evidenceCount === 1 ? '' : 's'}
                {evidenceTo && (
                  <Link className={styles.inlineLink} to={evidenceTo}>
                    View
                    <img
                      src={assetUrl('overview/arrow-up-right.svg')}
                      alt=""
                      width={12}
                      height={12}
                    />
                  </Link>
                )}
              </span>
            ) : (
              'Not supplied'
            )}
          </Fact>
        )}
        {item.note && <Fact term="Agent note">{item.note}</Fact>}
      </dl>
    </>
  )
}

/** How long the SOS has been open, counting; or when it closed, and after how long. */
function SosOpenFact({ item }: { item: FeedItem }) {
  const now = useNow()
  const duration = sosDuration(item, now)
  if (!duration) return null
  return (
    <Fact term={duration.open ? 'Open for' : 'Closed'}>
      {duration.open ? (
        <span className={styles.running}>
          {formatDuration(item.recordedAt, now)} · since {formatDateTime(item.recordedAt)}
        </span>
      ) : item.sos?.closedAt ? (
        <>
          {formatDateTime(item.sos.closedAt)}
          <span className={styles.muted}>
            After {formatDuration(item.recordedAt, item.sos.closedAt)} open
          </span>
        </>
      ) : (
        'CHL did not say when'
      )}
    </Fact>
  )
}

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className={styles.fact}>
      <dt>{term}</dt>
      <dd>{children}</dd>
    </div>
  )
}

/** What the Command centre does, and what it leaves to others (SRD 3). */
const BOUNDARIES = [
  {
    heading: 'What it does',
    tone: 'allowed',
    items: [
      { icon: 'bound-check', text: 'Shows what CHL received, with the context supplied.' },
      { icon: 'bound-check', text: 'Opens related records for review, as your role allows.' },
    ],
  },
  {
    heading: 'What it does not do',
    tone: 'limit',
    items: [
      { icon: 'bound-lock', text: 'No dispatch, messaging, remote commands or CCTV.' },
      { icon: 'bound-pin', text: 'Locations are where events were recorded, never live.' },
      { icon: 'bound-clock', text: 'Records made offline appear when they reach CHL.' },
    ],
  },
] as const

/** "Operational boundaries": what the Command centre does, and what it does not (SRD 3). */
export function OperationalBoundariesCard() {
  return (
    <DashboardCard
      title="Operational boundaries"
      icon="command-centre/card-boundaries.svg"
      bodyClassName={styles.boundariesBody}
    >
      {BOUNDARIES.map((group) => (
        <section key={group.heading} className={styles.boundaryGroup} aria-label={group.heading}>
          <h4 className={styles.boundaryHeading}>{group.heading}</h4>
          <ul className={styles.boundaries}>
            {group.items.map((entry) => (
              <li key={entry.text}>
                <span
                  className={
                    group.tone === 'allowed'
                      ? `${styles.boundaryIcon} ${styles.allowed}`
                      : styles.boundaryIcon
                  }
                >
                  <img
                    src={assetUrl(`command-centre/${entry.icon}.svg`)}
                    alt=""
                    width={14}
                    height={14}
                  />
                </span>
                {entry.text}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </DashboardCard>
  )
}
