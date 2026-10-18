import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { assetUrl } from '@/shared/lib/asset-url'
import { niceTicks, pointX } from '@/shared/lib/chart-scale'
import { formatDay } from '@/shared/lib/dates'
import { formatNumber } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import type { Overview } from '../overview.schemas'
import { useModuleLink } from '../use-module-link'
import styles from './VerificationActivityCard.module.css'

/** The plot's drawing size; the SVG stretches to the card's width, the height is fixed. */
const WIDTH = 1000
const HEIGHT = 380
/** The tooltip's size, to keep it beside the point it describes. */
const TOOLTIP_WIDTH = 176
const TOOLTIP_HEIGHT = 96

interface Props {
  daily: Overview['dailyVerifications']
  previous: Overview['previousDailyVerifications']
  total: number
  attempts: Overview['attempts']
}

/** "Verification activity": daily verification attempts over the period, as a line. */
export function VerificationActivityCard({ daily, previous, total, attempts }: Props) {
  const link = useModuleLink()
  const recordsLink = link('verifications', paths.verifications)
  const gradientId = useId()
  const [picked, setPicked] = useState<number | null>(null)

  const count = daily.length
  // The latest day is shown until the user points at another.
  const active = count === 0 ? null : Math.min(picked ?? count - 1, count - 1)
  const ticks = niceTicks(Math.max(0, ...daily.map((d) => d.count), ...(previous ?? [])))
  const top = ticks.at(-1) ?? 1

  const x = (index: number) => pointX(index, count) * WIDTH
  const y = (value: number) => HEIGHT - (value / top) * HEIGHT
  const line = (values: number[]) =>
    values.map((value, index) => `${index === 0 ? 'M' : 'L'}${x(index)},${y(value)}`).join(' ')
  const values = daily.map((d) => d.count)
  const area = count > 0 ? `${line(values)} L${x(count - 1)},${HEIGHT} L${x(0)},${HEIGHT} Z` : ''
  const bandWidth = count > 1 ? WIDTH / (count - 1) : WIDTH / 6

  const pickAt = (event: PointerEvent<HTMLDivElement>) => {
    if (count === 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    setPicked(count === 1 ? 0 : Math.round(fraction * (count - 1)))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (active === null) return
    const next =
      event.key === 'ArrowRight'
        ? Math.min(count - 1, active + 1)
        : event.key === 'ArrowLeft'
          ? Math.max(0, active - 1)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? count - 1
              : null
    if (next === null) return
    event.preventDefault()
    setPicked(next)
  }

  const activeDay = active === null ? null : daily[active]
  const activeLeft = active === null ? 0 : pointX(active, count) * 100
  const labelDays = [...new Set([0, Math.floor((count - 1) / 2), count - 1])].flatMap((index) => {
    const day = daily[index]
    return day ? [day.date] : []
  })

  return (
    <DashboardCard
      title="Verification activity"
      subtitle="Daily verification attempts"
      icon="overview/card-activity.svg"
      bodyClassName={styles.body}
    >
      <div className={styles.summary}>
        <div>
          <p className={styles.total}>{formatNumber(total)}</p>
          <p className={styles.totalLabel}>verification outcomes</p>
        </div>
        <dl
          className={styles.attempts}
          title="An attempt that could not complete is Verification Unavailable: CHL could not be reached or could not answer. It is not a failed check."
        >
          <div>
            <dt>
              <span className={styles.attemptDot} aria-hidden="true" />
              Completed
            </dt>
            <dd>{formatNumber(attempts.completed)}</dd>
          </div>
          <div>
            <dt>
              <span
                className={`${styles.attemptDot} ${styles.attemptDotUnavailable}`}
                aria-hidden="true"
              />
              Could not complete
            </dt>
            <dd>{formatNumber(attempts.notCompleted)}</dd>
          </div>
        </dl>
        {recordsLink && (
          <Link className={styles.viewRecords} to={recordsLink}>
            View records
            <img src={assetUrl('overview/arrow-up-right.svg')} alt="" width={14} height={14} />
          </Link>
        )}
      </div>

      <div className={styles.legendRow}>
        <span className={styles.chip}>Daily activity</span>
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={styles.swatch} aria-hidden="true" />
            This period
          </span>
          <span
            className={
              previous ? styles.legendItem : `${styles.legendItem} ${styles.legendUnavailable}`
            }
          >
            <span className={`${styles.swatch} ${styles.swatchPrevious}`} aria-hidden="true" />
            {previous ? 'Last period' : 'Last period unavailable'}
          </span>
        </div>
      </div>

      <div className={styles.chart}>
        <div className={styles.yAxis} aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick} style={{ bottom: `${(tick / top) * 100}%` }}>
              {formatNumber(tick)}
            </span>
          ))}
        </div>

        <div className={styles.plotColumn}>
          <div
            className={styles.plot}
            role="group"
            aria-label="Daily verification attempts. Use the left and right arrow keys to read each day."
            tabIndex={count > 0 ? 0 : -1}
            onPointerMove={pickAt}
            onPointerDown={pickAt}
            onKeyDown={onKeyDown}
          >
            <svg
              className={styles.svg}
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#27bd80" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#27bd80" stopOpacity="0" />
                </linearGradient>
              </defs>
              {ticks.map((tick) => (
                <line
                  key={tick}
                  className={styles.gridLine}
                  x1={0}
                  x2={WIDTH}
                  y1={y(tick)}
                  y2={y(tick)}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
                <line
                  key={fraction}
                  className={styles.dayLine}
                  x1={fraction * WIDTH}
                  x2={fraction * WIDTH}
                  y1={0}
                  y2={HEIGHT}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {active !== null && (
                <>
                  <rect
                    className={styles.band}
                    x={Math.max(0, x(active) - bandWidth / 2)}
                    y={0}
                    width={
                      Math.min(WIDTH, x(active) + bandWidth / 2) -
                      Math.max(0, x(active) - bandWidth / 2)
                    }
                    height={HEIGHT}
                  />
                  <line
                    className={styles.activeLine}
                    x1={x(active)}
                    x2={x(active)}
                    y1={0}
                    y2={HEIGHT}
                    vectorEffect="non-scaling-stroke"
                  />
                </>
              )}
              {previous && previous.length > 0 && (
                <path
                  className={styles.previousLine}
                  d={line(previous.slice(0, count))}
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {count > 0 && (
                <>
                  <path d={area} fill={`url(#${gradientId})`} />
                  <path
                    className={styles.line}
                    d={line(values)}
                    vectorEffect="non-scaling-stroke"
                  />
                </>
              )}
            </svg>

            {activeDay && (
              <>
                <span
                  className={styles.dot}
                  style={{ left: `${activeLeft}%`, top: y(activeDay.count) }}
                  aria-hidden="true"
                />
                <div
                  className={styles.tooltip}
                  style={{
                    // Beside the point, never over it: to its left on the right half of the
                    // chart, to its right otherwise; low down when the point is high.
                    left:
                      activeLeft > 55
                        ? `max(0px, calc(${activeLeft}% - ${TOOLTIP_WIDTH + 14}px))`
                        : `min(calc(100% - ${TOOLTIP_WIDTH}px), calc(${activeLeft}% + 14px))`,
                    top: y(activeDay.count) < HEIGHT / 2 ? HEIGHT - TOOLTIP_HEIGHT - 8 : 4,
                  }}
                  aria-live="polite"
                >
                  <p className={styles.tooltipTitle}>Verifications</p>
                  <p className={styles.tooltipRow}>
                    <span className={styles.tooltipValue}>{formatNumber(activeDay.count)}</span>
                    <span className={styles.tooltipDate}>{formatDay(activeDay.date)}</span>
                  </p>
                  <p className={styles.tooltipNote}>Recorded verification attempts</p>
                </div>
              </>
            )}
          </div>

          <div className={styles.xAxis} aria-hidden="true">
            {labelDays.map((date) => (
              <span key={date}>{formatDay(date)}</span>
            ))}
          </div>
        </div>
      </div>

      <table className="visually-hidden">
        <caption>Daily verification attempts</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Verifications</th>
          </tr>
        </thead>
        <tbody>
          {daily.map((day) => (
            <tr key={day.date}>
              <td>{formatDay(day.date)}</td>
              <td>{day.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DashboardCard>
  )
}
