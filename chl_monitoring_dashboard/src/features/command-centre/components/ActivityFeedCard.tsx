import { useId } from 'react'
import { sourceLabel } from '@/features/overview/overview-display'
import { formatClock, formatShortDateTime } from '@/shared/lib/format'
import { lagosDay } from '@/shared/lib/dates'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import { SegmentedTabs } from '@/shared/ui/SegmentedTabs'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import { panelId, tabId } from '@/shared/ui/tab-ids'
import {
  FEED_VIEWS,
  feedKindColor,
  feedKindLabel,
  feedStatus,
  feedTitle,
  inView,
  VIEW_LABELS,
  type FeedView,
} from '../command-centre-display'
import type { FeedItem } from '../command-centre.schemas'
import styles from './ActivityFeedCard.module.css'

interface ActivityFeedCardProps {
  feed: readonly FeedItem[]
  /** Entries in the window; the feed itself lists only the latest. */
  total: number
  view: FeedView
  onViewChange(view: FeedView): void
  selectedId: string | null
  onSelect(id: string): void
}

/** "Operational activity feed": field activity as CHL receives it, newest first. */
export function ActivityFeedCard({
  feed,
  total,
  view,
  onViewChange,
  selectedId,
  onSelect,
}: ActivityFeedCardProps) {
  const idBase = useId()
  const items = feed.filter((item) => inView(item, view))
  const today = lagosDay()
  const shortTime = (value: Date) =>
    lagosDay(value) === today ? formatClock(value) : formatShortDateTime(value)

  return (
    <DashboardCard
      title="Operational activity feed"
      subtitle="Field activity in the order CHL received it · latest first"
      icon="overview/card-activity.svg"
      bodyClassName={styles.body}
      footer={
        <p className={styles.footer}>
          {total > feed.length
            ? `Showing the latest ${feed.length} of ${total} entries in this window.`
            : `${total} ${total === 1 ? 'entry' : 'entries'} in this window.`}{' '}
          Checked every 30 seconds.
        </p>
      }
    >
      <SegmentedTabs<FeedView>
        idBase={idBase}
        label="Activity to show"
        tabs={FEED_VIEWS.map((id) => ({
          id,
          label: VIEW_LABELS[id],
          count: feed.filter((item) => inView(item, id)).length,
        }))}
        value={view}
        onChange={onViewChange}
        className={styles.tabs}
      />
      <div
        id={panelId(idBase)}
        role="tabpanel"
        aria-labelledby={tabId(idBase, view)}
        className={styles.panel}
      >
        {items.length === 0 ? (
          <p className={styles.empty}>No activity of this kind was received in this window.</p>
        ) : (
          <ul className={styles.feed}>
            {items.map((item) => {
              const status = feedStatus(item)
              const recorded = new Date(item.recordedAt)
              // The feed runs in the order CHL received entries, so that time leads.
              const received = item.receivedAt ? new Date(item.receivedAt) : recorded
              const selected = item.id === selectedId
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={selected ? `${styles.entry} ${styles.selected}` : styles.entry}
                    aria-pressed={selected}
                    onClick={() => onSelect(item.id)}
                  >
                    <span className={styles.time}>
                      <time dateTime={received.toISOString()}>{shortTime(received)}</time>
                      {item.source === 'offline' && (
                        <span className={styles.offline}>
                          {sourceLabel(item.source)} · recorded{' '}
                          <time dateTime={item.recordedAt}>{shortTime(recorded)}</time>
                        </span>
                      )}
                    </span>
                    <span
                      className={styles.marker}
                      style={{ background: feedKindColor(item.kind) }}
                      aria-hidden="true"
                    />
                    <span className={styles.main}>
                      <span className={styles.kind}>{feedKindLabel(item.kind)}</span>
                      <span className={styles.title}>{feedTitle(item)}</span>
                      <span className={styles.meta}>
                        {[item.plate, item.agent.name, item.location.name]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    {status && (
                      <span className={styles.status}>
                        <StatusLabel tone={status.tone}>{status.label}</StatusLabel>
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </DashboardCard>
  )
}
