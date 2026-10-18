import { useId, type ReactNode } from 'react'
import { assetUrl } from '@/shared/lib/asset-url'
import styles from './FilterBar.module.css'

/** The filter row under a page's banner: filters on the left, `end` (freshness) on the right. */
export function FilterBar({ children, end }: { children: ReactNode; end?: ReactNode }) {
  return (
    <div className={styles.filters}>
      <div className={styles.filterGroup}>{children}</div>
      {end}
    </div>
  )
}

/** A thin upright line between groups of filters. */
export function FilterDivider() {
  return <span className={styles.divider} aria-hidden="true" />
}

/** Small grey text beside a filter, such as the dates a period covers. */
export function FilterNote({ children }: { children: ReactNode }) {
  return <span className={styles.note}>{children}</span>
}

interface FilterSelectProps<T extends string> {
  /** The accessible name; not shown. */
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange(value: T): void
  /** Green when the filter narrows the page (a choice other than "All …"). */
  active?: boolean
}

/** A dropdown as the design draws it: bare text and a chevron, as wide as its choice. */
export function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  active = false,
}: FilterSelectProps<T>) {
  const id = useId()
  return (
    <>
      <label className="visually-hidden" htmlFor={id}>
        {label}
      </label>
      <span className={styles.selectWrap}>
        <select
          id={id}
          className={
            active ? `${styles.select} ${styles.active}` : `${styles.select} ${styles.muted}`
          }
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <img
          className={styles.chevron}
          src={assetUrl('overview/filter-chevron.svg')}
          alt=""
          width={13}
          height={13}
        />
      </span>
    </>
  )
}
