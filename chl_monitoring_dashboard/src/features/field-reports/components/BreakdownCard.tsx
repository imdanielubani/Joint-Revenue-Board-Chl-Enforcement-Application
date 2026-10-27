import tiles from '@/features/payments/components/PaymentCards.module.css'
import { share } from '@/features/overview/overview-display'
import { assetUrl } from '@/shared/lib/asset-url'
import { formatNumber, formatPercent } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import { StatusLabel, type StatusTone } from '@/shared/ui/StatusLabel'

export interface BreakdownTile {
  /** The filter value the tile lists in the register. */
  value: string
  label: string
  tone: StatusTone
  count: number
}

const FILL: Record<StatusTone, string> = {
  success: 'var(--status-success-text)',
  warning: 'var(--status-warning-text)',
  amber: 'var(--status-amber-text)',
  danger: 'var(--status-danger-text)',
  info: 'var(--card-title)',
  neutral: 'var(--status-neutral-dot)',
}

/**
 * A breakdown in the Payment Status card's tiles: each kind's count and share
 * of the whole, a tile listing its records in the register below.
 */
export function BreakdownCard({
  title,
  subtitle,
  icon,
  of,
  items,
  onShow,
}: {
  title: string
  subtitle: string
  icon: string
  /** What the shares are of: "field reports". */
  of: string
  items: readonly BreakdownTile[]
  onShow(value: string): void
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0)
  return (
    <DashboardCard title={title} subtitle={subtitle} icon={icon} bodyClassName={tiles.statusBody}>
      <ul className={tiles.statusTiles}>
        {items.map((item) => (
          <li key={item.value}>
            <button
              type="button"
              className={tiles.statusTile}
              disabled={item.count === 0}
              onClick={() => onShow(item.value)}
              aria-label={`View ${item.label} records`}
            >
              <span className={tiles.statusTileHead}>
                <StatusLabel tone={item.tone}>{item.label}</StatusLabel>
                <img
                  className={tiles.statusTileArrow}
                  src={assetUrl('overview/tile-arrow.svg')}
                  alt=""
                  width={12}
                  height={12}
                />
              </span>
              <span className={tiles.statusTileValue}>{formatNumber(item.count)}</span>
              <span className={tiles.statusTileShare}>
                {formatPercent(item.count, total)} of {of}
              </span>
              <span className={tiles.statusTrack} aria-hidden="true">
                <span
                  className={tiles.statusFill}
                  style={{ width: `${share(item.count, total)}%`, background: FILL[item.tone] }}
                />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </DashboardCard>
  )
}
