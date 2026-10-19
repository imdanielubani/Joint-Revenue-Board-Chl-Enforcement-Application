import { plural } from '@/features/overview/overview-display'
import { assetUrl } from '@/shared/lib/asset-url'
import { formatNumber, formatShortDateTime } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import type { AgentLocation } from '../agents.schemas'
import styles from './AgentCards.module.css'

/**
 * "Locations recorded": the enforcement points where the agent recorded
 * activity in the period, busiest first, with when they last recorded there.
 */
export function AgentLocationsCard({ locations }: { locations: readonly AgentLocation[] }) {
  const shown = [...locations].sort(
    (a, b) => b.verifications - a.verifications || a.name.localeCompare(b.name),
  )
  return (
    <DashboardCard
      title="Locations recorded"
      subtitle="Enforcement points with the agent’s activity"
      icon="overview/card-location.svg"
      bodyClassName={styles.body}
      footer={
        <p className={styles.footer}>
          From the agent’s records: where they were recorded, not live positions.
        </p>
      }
    >
      {shown.length === 0 ? (
        <p className={styles.empty}>No activity recorded in this period.</p>
      ) : (
        <ul className={styles.places}>
          {shown.map((location) => (
            <li key={location.id} className={styles.place}>
              <span className={styles.placeIcon}>
                <img src={assetUrl('overview/location-pin.svg')} alt="" width={16} height={16} />
              </span>
              <span className={styles.placeText}>
                <span className={styles.placeName}>{location.name}</span>
                <span className={styles.sub}>
                  {[location.area, location.code].filter(Boolean).join(' · ')}
                </span>
                <span className={styles.sub}>
                  {location.lastRecordedAt
                    ? `Last recorded ${formatShortDateTime(location.lastRecordedAt)} WAT`
                    : 'Nothing recorded yet'}
                </span>
              </span>
              <span className={styles.placeFigures}>
                <strong>{formatNumber(location.verifications)}</strong>
                <span>{location.verifications === 1 ? 'verification' : 'verifications'}</span>
                <span>{plural(location.violations, 'violation')}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  )
}
