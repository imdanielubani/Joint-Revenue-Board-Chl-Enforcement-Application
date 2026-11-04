import type { CSSProperties, ReactNode } from 'react'
import styles from './Skeleton.module.css'

/**
 * A page's shape while its data loads: grey placeholders where its figures,
 * cards, tables and charts will be, so nothing jumps when the data arrives.
 * Screen readers hear only `message`; the shapes are hidden from them.
 */
export function Skeleton({ message, children }: { message: string; children: ReactNode }) {
  return (
    <div className={styles.skeleton} role="status" aria-live="polite" aria-busy="true">
      <span className="visually-hidden">{message}</span>
      <div className={styles.shapes} aria-hidden="true">
        {children}
      </div>
    </div>
  )
}

/** One grey bar: a line of text, a number or an icon's place. */
export function Bone({
  width = '100%',
  height = 10,
  round = false,
}: {
  width?: CSSProperties['width']
  height?: CSSProperties['height']
  /** A circle or pill, as an icon or a status label. */
  round?: boolean
}) {
  return (
    <span
      className={round ? `${styles.bone} ${styles.round}` : styles.bone}
      style={{ width, height }}
    />
  )
}

/** The headline figure cards: label and icon, figure, note. */
export function SkeletonFigures({ count = 4 }: { count?: number }) {
  return (
    <div className={styles.figures}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={styles.figure}>
          <div className={styles.figurePanel}>
            <div className={styles.figureTop}>
              <Bone width="55%" height={9} />
              <Bone width={28} height={28} />
            </div>
            <Bone width="35%" height={22} />
          </div>
          <div className={styles.figureNote}>
            <Bone width="70%" height={8} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** A card: its title and subtitle, then whatever its body holds (lines, by default). */
export function SkeletonCard({
  children,
  lines = 4,
  className,
}: {
  children?: ReactNode
  /** Lines of text in the body, where no `children` are given. */
  lines?: number
  className?: string
}) {
  return (
    <div className={className ? `${styles.card} ${className}` : styles.card}>
      <div className={styles.cardHeader}>
        <Bone width="38%" height={11} />
        <Bone width="58%" height={8} />
      </div>
      <div className={styles.cardBody}>
        {children ??
          Array.from({ length: lines }, (_, index) => (
            <Bone key={index} width={index % 3 === 2 ? '62%' : '100%'} height={10} />
          ))}
      </div>
    </div>
  )
}

/** A table: a header row, then `rows` rows of `columns` cells. */
export function SkeletonTable({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
  const cells = (height: number, key: string) =>
    Array.from({ length: columns }, (_, index) => (
      <Bone key={`${key}-${index}`} width={index === 0 ? '80%' : '60%'} height={height} />
    ))
  return (
    <div className={styles.table}>
      <div className={styles.tableHead} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {cells(8, 'head')}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div
          key={row}
          className={styles.tableRow}
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {cells(10, `row-${row}`)}
        </div>
      ))}
    </div>
  )
}

/** A chart's or map's area. */
export function SkeletonChart({ height = 220 }: { height?: number }) {
  return <Bone height={height} />
}
