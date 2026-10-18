import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { useModuleLink } from '@/features/auth/use-module-link'
import { sourceLabel, syncStatusLabel } from '@/features/overview/overview-display'
import { assetUrl } from '@/shared/lib/asset-url'
import { formatDateTime, formatDelay } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import { feedKindLabel, feedStatus, feedTitle } from '../command-centre-display'
import type { FeedItem } from '../command-centre.schemas'
import styles from './IncidentContextCard.module.css'

/** "Incident context": the selected feed entry, as CHL recorded it, with links to its records. */
export function IncidentContextCard({ item }: { item: FeedItem | null }) {
  return (
    <DashboardCard
      title="Incident context"
      subtitle="The selected entry, as CHL recorded it"
      icon="overview/card-cases.svg"
      bodyClassName={styles.body}
    >
      {item ? (
        <IncidentDetails item={item} />
      ) : (
        <p className={styles.empty}>Choose an entry in the feed to see its details.</p>
      )}
    </DashboardCard>
  )
}

function IncidentDetails({ item }: { item: FeedItem }) {
  const link = useModuleLink()
  const status = feedStatus(item)
  const offline = item.source === 'offline'

  // Only records the user may open are linked.
  const links: { label: string; to: string | undefined }[] = []
  if (item.kind === 'sos') {
    links.push({
      label: 'Open the agent',
      to: link('agents', `${paths.agents}?agent=${encodeURIComponent(item.agent.id)}`),
    })
  }
  if (item.kind === 'verification') {
    links.push({
      label: 'Open in verifications',
      to: link(
        'verifications',
        `${paths.verifications}?plate=${encodeURIComponent(item.plate ?? '')}`,
      ),
    })
  }
  if (item.violation) {
    links.push({
      label: 'Open the case',
      to: link('violations', `${paths.violations}?case=${item.violation.id}`),
    })
  }
  if (item.payment) {
    links.push({
      label: 'Open the payment',
      to: link('payments', `${paths.payments}?notice=${item.payment.noticeId}`),
    })
  }
  if (item.evidenceCount > 0) {
    const reference = item.violation?.id ?? item.id
    links.push({
      label: `View ${item.evidenceCount} photograph${item.evidenceCount === 1 ? '' : 's'}`,
      to: link('evidence', `${paths.evidence}?record=${encodeURIComponent(reference)}`),
    })
  }

  const open = links.flatMap((entry) => (entry.to ? [{ label: entry.label, to: entry.to }] : []))

  return (
    <>
      <div className={styles.head}>
        <p className={styles.kind}>{feedKindLabel(item.kind)}</p>
        <p className={styles.title}>{feedTitle(item)}</p>
        {status && (
          <StatusLabel tone={status.tone} {...(status.icon ? { icon: status.icon } : {})}>
            {status.label}
          </StatusLabel>
        )}
      </div>

      {item.report && <p className={styles.summary}>{item.report.summary}</p>}
      {item.sos && (
        <p className={styles.summary}>{item.sos.message ?? 'No message was sent with the SOS.'}</p>
      )}

      <dl className={styles.facts}>
        {item.plate && <Fact term="Vehicle">{item.plate}</Fact>}
        <Fact term="Agent">
          {item.agent.name} · {item.agent.id}
        </Fact>
        <Fact term="Location">
          {item.location.name}
          <span className={styles.muted}>
            {[item.location.area, item.location.code].filter(Boolean).join(' · ')}
            {item.kind === 'sos' && ' · where it was sent, not a live position'}
          </span>
        </Fact>
        {item.violation && (
          <Fact term="Violation">
            {item.violation.id}
            <span className={styles.muted}>{item.violation.category}</span>
          </Fact>
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
        {item.evidenceCount > 0 && (
          <Fact term="Evidence">
            {item.evidenceCount} photograph{item.evidenceCount === 1 ? '' : 's'}
          </Fact>
        )}
        {item.note && <Fact term="Agent note">{item.note}</Fact>}
      </dl>

      {open.length > 0 && (
        <ul className={styles.links}>
          {open.map((entry) => (
            <li key={entry.label}>
              <Link className={styles.link} to={entry.to}>
                {entry.label}
                <img src={assetUrl('overview/arrow-up-right.svg')} alt="" width={14} height={14} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
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
