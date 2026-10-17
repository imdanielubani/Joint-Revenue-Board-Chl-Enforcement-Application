import { useRecordRegister } from '@/shared/lib/use-record-register'
import { DataTable, type Column } from './DataTable'
import { RecordRegister } from './RecordRegister'

interface RegisterTableProps<T> {
  /** The table's accessible name. */
  label: string
  rows: readonly T[]
  columns: readonly Column<T>[]
  rowKey(row: T): string
  /** The text a search is matched against; must be stable (defined outside the component). */
  searchText(row: T): string
  pageSize?: number
}

/** A record register with its table: search, sortable columns and pages, over the rows given. */
export function RegisterTable<T>({
  label,
  rows,
  columns,
  rowKey,
  searchText,
  pageSize,
}: RegisterTableProps<T>) {
  const register = useRecordRegister({ rows, columns, searchText, pageSize })
  return (
    <RecordRegister
      total={rows.length}
      query={register.query}
      onQueryChange={register.setQuery}
      page={register.page}
      pageCount={register.pageCount}
      onPageChange={register.setPage}
      first={register.first}
      last={register.last}
      matchCount={register.matchCount}
    >
      <DataTable
        label={label}
        columns={columns}
        rows={register.pageRows}
        rowKey={rowKey}
        sort={register.sort}
        onSort={register.toggleSort}
        emptyMessage={
          rows.length === 0 ? 'No records for this period.' : 'No records match your search.'
        }
      />
    </RecordRegister>
  )
}
