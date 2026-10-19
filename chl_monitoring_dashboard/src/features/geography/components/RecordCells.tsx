import styles from './RecordColumns.module.css'

/** The first cell of a row: the record's reference or name, opening its details on the page. */
export function OpenButton({ children, onClick }: { children: string; onClick(): void }) {
  return (
    <button type="button" className={styles.open} onClick={onClick}>
      {children}
    </button>
  )
}

/** A cell's main value with a smaller line under it. */
export function Stack({ main, sub }: { main: string; sub?: string | undefined }) {
  return (
    <span className={styles.stack}>
      <span>{main}</span>
      {sub && <span className={styles.sub}>{sub}</span>}
    </span>
  )
}
