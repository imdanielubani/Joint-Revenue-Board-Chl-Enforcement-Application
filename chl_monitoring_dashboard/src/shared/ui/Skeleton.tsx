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

/** A tab strip, as SegmentedTabs draws one. */
export function SkeletonTabs({ count }: { count: number }) {
  return (
    <div className={styles.tabs}>
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className={styles.tab}>
          <Bone width="60%" height={9} />
        </span>
      ))}
    </div>
  )
}

/** A row of filter fields, as a register's filters sit above its table. */
export function SkeletonFilters({ count }: { count: number }) {
  return (
    <div className={styles.filters} style={{ '--filters': count } as CSSProperties}>
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className={styles.filter}>
          <Bone width="40%" height={7} />
          <Bone width="70%" height={10} />
        </span>
      ))}
    </div>
  )
}

/** A list of entries, as a feed or notifications list: an icon, two lines and a time. */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className={styles.list}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={styles.listRow}>
          <Bone width={32} height={32} round />
          <span className={styles.listText}>
            <Bone width="55%" height={10} />
            <Bone width="85%" height={8} />
          </span>
          <Bone width={56} height={8} />
        </div>
      ))}
    </div>
  )
}

/** A popup's facts: term and value, side by side. */
export function SkeletonFacts({ rows = 5 }: { rows?: number }) {
  return (
    <div className={styles.facts}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={styles.fact}>
          <Bone width="45%" height={9} />
          <Bone width={index % 2 ? '55%' : '75%'} height={10} />
        </div>
      ))}
    </div>
  )
}

/** Sections side by side, as a page's rows of cards (one column on narrow screens). */
export function SkeletonColumns({
  children,
  columns = 'minmax(0, 2fr) minmax(0, 1fr)',
}: {
  children: ReactNode
  /** The grid's columns, as `grid-template-columns`. */
  columns?: string
}) {
  return (
    <div className={styles.columns} style={{ '--columns': columns } as CSSProperties}>
      {children}
    </div>
  )
}
