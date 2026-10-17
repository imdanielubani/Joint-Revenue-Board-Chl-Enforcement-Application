import type { ReactNode } from 'react'
import { assetUrl } from '@/shared/lib/asset-url'
import type { SortableColumn, SortState } from '@/shared/lib/use-record-register'
import styles from './DataTable.module.css'

export interface Column<T> extends SortableColumn<T> {
  header: string
  render(row: T): ReactNode
  align?: 'start' | 'center' | 'end'
  /** The column's narrowest width, in px, so long tables scroll rather than squash. */
  minWidth?: number
}

interface DataTableProps<T> {
  /** The table's accessible name. */
  label: string
  columns: readonly Column<T>[]
  rows: readonly T[]
  rowKey(row: T): string
  sort: SortState | null
  onSort(key: string): void
  /** Shown in place of the rows when there are none. */
  emptyMessage: string
}

/** A record table: a grey header row, sortable columns and 71px rows; scrolls sideways when narrow. */
export function DataTable<T>({
  label,
  columns,
  rows,
  rowKey,
  sort,
  onSort,
  emptyMessage,
}: DataTableProps<T>) {
  return (
    <div className={styles.scroll}>
      <table className={styles.table} aria-label={label}>
        <thead>
          <tr>
            {columns.map((column) => {
              const sorted = sort?.key === column.key ? sort.direction : undefined
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={styles[column.align ?? 'start']}
                  style={column.minWidth ? { minWidth: column.minWidth } : undefined}
                  aria-sort={sorted ?? (column.sortValue ? 'none' : undefined)}
                >
                  {column.sortValue ? (
                    <button
                      type="button"
                      className={styles.sortButton}
                      onClick={() => onSort(column.key)}
                    >
                      {column.header}
                      <img
                        className={
                          sorted === 'ascending'
                            ? `${styles.sortIcon} ${styles.sortAscending}`
                            : sorted
                              ? `${styles.sortIcon} ${styles.sortActive}`
                              : styles.sortIcon
                        }
                        src={assetUrl('overview/sort.svg')}
                        alt=""
                        width={12}
                        height={12}
                      />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className={styles.empty} colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td key={column.key} className={styles[column.align ?? 'start']}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
