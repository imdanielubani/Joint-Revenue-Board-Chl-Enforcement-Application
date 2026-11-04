import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { assetUrl } from '@/shared/lib/asset-url'
import { formatNumber } from '@/shared/lib/format'
import { motionAllowed } from '@/shared/lib/motion'
import styles from './HeadlineFigures.module.css'

export interface HeadlineFigure {
  label: string
  value: number
  /** A 16px icon in public/assets/. */
  icon: string
  /** The line under the figure, saying what it counts. */
  note: string
  /** Where the note leads, when the user may open it. */
  to?: string | undefined
}

/** How long the figures take to count up when they first appear. */
export const COUNT_UP_MS = 500

/** Quick at first, settling as it reaches the figure. */
const easeOut = (t: number) => 1 - (1 - t) ** 3

/**
 * A figure. When the figures first appear it counts up to its value; a later
 * change only fades in (no counting through values mid-session). Screen readers
 * always get the real value, and with reduced motion it is simply there.
 */
function FigureValue({ value, countUp }: { value: number; countUp: boolean }) {
  // Decided once, when it appears.
  const [animate] = useState(() => countUp && motionAllowed())
  const [progress, setProgress] = useState(animate ? 0 : 1)

  useEffect(() => {
    if (!animate) return
    const start = performance.now()
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / COUNT_UP_MS)
      setProgress(t)
      if (t < 1) frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [animate])

  if (progress >= 1) return <>{formatNumber(value)}</>
  return (
    <>
      <span aria-hidden="true">{formatNumber(Math.round(value * easeOut(progress)))}</span>
      <span className="visually-hidden">{formatNumber(value)}</span>
    </>
  )
}

/** A page's headline figures, four to a row, each with a note that can link onwards. */
export function HeadlineFigures({ items }: { items: readonly HeadlineFigure[] }) {
  // Only the figures there when the row first appears count up.
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(true), COUNT_UP_MS)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <ul className={styles.grid} aria-label="Headline figures">
      {items.map((kpi) => (
        <li key={kpi.label} className={styles.kpi}>
          <div className={styles.panel}>
            <div className={styles.top}>
              <p className={styles.label}>{kpi.label}</p>
              <span className={styles.iconBox}>
                <img src={assetUrl(kpi.icon)} alt="" width={16} height={16} />
              </span>
            </div>
            <p key={kpi.value} className={styles.value}>
              <FigureValue value={kpi.value} countUp={!settled} />
            </p>
          </div>
          {kpi.to ? (
            <Link className={`${styles.note} ${styles.noteLink}`} to={kpi.to}>
              <span>{kpi.note}</span>
              <img src={assetUrl('overview/kpi-arrow.svg')} alt="" width={16} height={16} />
            </Link>
          ) : (
            <p className={styles.note}>
              <span>{kpi.note}</span>
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}
