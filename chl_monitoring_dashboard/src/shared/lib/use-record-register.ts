import { useMemo, useState } from 'react'

export type SortDirection = 'ascending' | 'descending'

export interface SortState {
  key: string
  direction: SortDirection
}

/** What the register needs to know about a column to sort by it. */
export interface SortableColumn<T> {
  key: string
  sortValue?: (row: T) => string | number
}

interface RegisterOptions<T> {
  rows: readonly T[]
  columns: readonly SortableColumn<T>[]
  /** The text a search is matched against, for one row. */
  searchText(row: T): string
  pageSize?: number
  /** The search the register opens with, such as a plate from a link. */
  initialQuery?: string
}

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

/**
 * Search, sort and pages for a record register, all on the rows already
 * loaded. A new search or sort goes back to the first page.
 */
export function useRecordRegister<T>({
  rows,
  columns,
  searchText,
  pageSize = 10,
  initialQuery = '',
}: RegisterOptions<T>) {
  const [query, setQueryState] = useState(initialQuery)
  const [sort, setSort] = useState<SortState | null>(null)
  const [page, setPage] = useState(1)

  const matching = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (words.length === 0) return rows
    return rows.filter((row) => {
      const text = searchText(row).toLowerCase()
      return words.every((word) => text.includes(word))
    })
  }, [rows, query, searchText])

  const sorted = useMemo(() => {
    const sortValue = sort && columns.find((column) => column.key === sort.key)?.sortValue
    if (!sort || !sortValue) return matching
    const factor = sort.direction === 'ascending' ? 1 : -1
    return [...matching].sort((a, b) => {
      const left = sortValue(a)
      const right = sortValue(b)
      const order =
        typeof left === 'number' && typeof right === 'number'
          ? left - right
          : collator.compare(String(left), String(right))
      return order * factor
    })
  }, [matching, sort, columns])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const current = Math.min(page, pageCount)
  const start = (current - 1) * pageSize
  const pageRows = sorted.slice(start, start + pageSize)

  return {
    query,
    setQuery(next: string) {
      setQueryState(next)
      setPage(1)
    },
    sort,
    /** Sorts by `key`: ascending first, then the other way on each further click. */
    toggleSort(key: string) {
      setSort((previous) =>
        previous?.key === key && previous.direction === 'ascending'
          ? { key, direction: 'descending' }
          : { key, direction: 'ascending' },
      )
      setPage(1)
    },
    page: current,
    pageCount,
    setPage,
    pageRows,
    /** Rows that match the search. */
    matchCount: sorted.length,
    first: sorted.length === 0 ? 0 : start + 1,
    last: start + pageRows.length,
  }
}
