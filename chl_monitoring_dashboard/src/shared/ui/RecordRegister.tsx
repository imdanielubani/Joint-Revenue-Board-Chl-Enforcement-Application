import type { ReactNode } from 'react'
import { assetUrl } from '@/shared/lib/asset-url'
import styles from './RecordRegister.module.css'

interface RecordRegisterProps {
  /** Every record in the register, before any search. */
  total: number
  query: string
  onQueryChange(query: string): void
  page: number
  pageCount: number
  onPageChange(page: number): void
  /** The rows on this page, as positions among the matching records. */
  first: number
  last: number
  matchCount: number
  /** The table. */
  children: ReactNode
}

/**
 * A read-only record register: its title and count, a search box, the table,
 * and the page controls.
 */
export function RecordRegister({
  total,
  query,
  onQueryChange,
  page,
  pageCount,
  onPageChange,
  first,
  last,
  matchCount,
  children,
}: RecordRegisterProps) {
  return (
    <div className={styles.register}>
      <div className={styles.top}>
        <div className={styles.titleGroup}>
          <span className={styles.titleIcon}>
            <img src={assetUrl('overview/register.svg')} alt="" width={16} height={16} />
          </span>
          <div>
            <p className={styles.title}>
              Record register <span className={styles.total}>/ {total}</span>
            </p>
            <p className={styles.subtitle}>Read-only records</p>
          </div>
        </div>
        <label className={styles.search}>
          <img src={assetUrl('overview/search.svg')} alt="" width={16} height={16} />
          <span className="visually-hidden">Search records</span>
          <input
            type="search"
            placeholder="Search records…"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
      </div>

      <div className={styles.table}>{children}</div>

      <div className={styles.pager}>
        <p className={styles.showing} aria-live="polite">
          {matchCount === 0
            ? 'No matching records'
            : `Showing ${first}–${last} of ${matchCount} records`}
        </p>
        <button
          type="button"
          className={styles.pageButton}
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          ‹
        </button>
        <p className={styles.page}>
          Page {page} / {pageCount}
        </p>
        <button
          type="button"
          className={styles.pageButton}
          aria-label="Next page"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          ›
        </button>
      </div>
    </div>
  )
}
