import { useId, useMemo, useState } from 'react'
import { paths } from '@/config/paths'
import { useModuleLink } from '@/features/auth/use-module-link'
import { verificationColumns } from '@/features/geography/components/record-columns'
import { Stack } from '@/features/geography/components/RecordCells'
import { methodLabel, outcomeLabel } from '@/features/overview/overview-display'
import { ETAG_RESULTS, VERIFICATION_METHODS } from '@/features/overview/overview.schemas'
import { assetUrl } from '@/shared/lib/asset-url'
import { formatNumber } from '@/shared/lib/format'
import { useRecordRegister } from '@/shared/lib/use-record-register'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import { DataTable, type Column } from '@/shared/ui/DataTable'
import { RecordRegister } from '@/shared/ui/RecordRegister'
import { RowActions, type RowAction, type RowCommand } from '@/shared/ui/RowActions'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import {
  actionPill,
  attemptPill,
  etagPill,
  OUTCOME_ORDER,
  placeText,
  PROVENANCE_LABELS,
  provenancePill,
  syncPill,
  SYNC_LABELS,
  SYNC_STATES,
  type Pill,
} from '../verifications-display'
import {
  applyFilters,
  hasColumnFilters,
  NOT_SUPPLIED,
  type RegisterFilters,
} from '../verifications-filters'
import { ATTEMPT_STATUSES, PROVENANCES, type VerificationEntry } from '../verifications.schemas'
import styles from './VerificationCards.module.css'

type ModuleLink = ReturnType<typeof useModuleLink>

export function PillLabel({ pill }: { pill: Pill }) {
  return (
    <StatusLabel tone={pill.tone} {...(pill.icon ? { icon: pill.icon } : {})}>
      {pill.label}
    </StatusLabel>
  )
}

interface ColumnHandlers {
  link: ModuleLink
  onOpen(entry: VerificationEntry): void
  onVehicle(plate: string): void
}

/** The register's columns, as the design lists them; the actions stay last. */
function columnsFor({ link, onOpen, onVehicle }: ColumnHandlers): Column<VerificationEntry>[] {
  // The columns other modules show for a verification, exactly as they show them.
  // This register's rows are all entries, so the row a shared cell opens is one.
  const shared = verificationColumns(link, (row) => onOpen(row as VerificationEntry))
  const column = (key: string): Column<VerificationEntry> => {
    const found = shared.find((entry) => entry.key === key)
    if (!found) throw new Error(`No shared verification column "${key}"`)
    return found
  }
  return [
    column('reference'),
    column('plate'),
    // The cells as other modules draw them, under the design's headings.
    { ...column('method'), header: 'Method' },
    { ...column('outcome'), header: 'Outcome' },
    {
      key: 'etag',
      header: 'E-Tag',
      render: (row) => <PillLabel pill={etagPill(row.etag)} />,
      sortValue: (row) => etagPill(row.etag).label,
    },
    column('agent'),
    column('recorded'),
    {
      key: 'location',
      header: 'Location',
      render: (row) => (
        <Stack
          main={row.location.name}
          sub={[row.location.area, row.location.code].filter(Boolean).join(' · ')}
        />
      ),
      sortValue: (row) => placeText(row.location),
    },
    {
      key: 'source',
      header: 'Source',
      render: (row) => <PillLabel pill={provenancePill(row.provenance)} />,
      sortValue: (row) => provenancePill(row.provenance).label,
    },
    {
      key: 'sync',
      header: 'Sync',
      render: (row) => <PillLabel pill={syncPill(row)} />,
      sortValue: (row) => syncPill(row).label,
    },
    {
      key: 'attempt',
      header: 'Attempt status',
      render: (row) => <PillLabel pill={attemptPill(row.attempt)} />,
      sortValue: (row) => attemptPill(row.attempt).label,
    },
    {
      key: 'action',
      header: 'Action taken',
      render: (row) => <PillLabel pill={actionPill(row.actionTaken)} />,
      sortValue: (row) => actionPill(row.actionTaken).label,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'end',
      render: (row) => {
        const commands: RowCommand[] = [
          { label: 'View details', onSelect: () => onOpen(row) },
          { label: 'Vehicle identity', onSelect: () => onVehicle(row.plate) },
        ]
        const links = [
          {
            label: 'Open the case',
            to: row.violation
              ? link('violations', `${paths.violations}?case=${row.violation.id}`)
              : undefined,
          },
          {
            label: 'Open the payment',
            to: row.payment
              ? link('payments', `${paths.payments}?notice=${row.payment.id}`)
              : undefined,
          },
          { label: 'View agent', to: link('agents', paths.agent(row.agent.id)) },
        ].filter((action): action is RowAction => action.to !== undefined)
        return (
          <RowActions label={`Actions for ${row.reference}`} actions={[...commands, ...links]} />
        )
      },
    },
  ]
}

interface FilterSelectProps {
  label: string
  value: string | null
  options: readonly { value: string; label: string }[]
  onChange(value: string | null): void
}

/** A filter box as the design draws it: a small label over the choice. */
function LabeledSelect({ label, value, options, onChange }: FilterSelectProps) {
  const id = useId()
  return (
    <div
      className={value === null ? styles.selectBox : `${styles.selectBox} ${styles.selectActive}`}
    >
      <label className={styles.selectLabel} htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <img
        className={styles.selectChevron}
        src={assetUrl('verifications/select-chevron.svg')}
        alt=""
        width={12}
        height={12}
      />
    </div>
  )
}

const METHOD_OPTIONS = VERIFICATION_METHODS.map((value) => ({ value, label: methodLabel(value) }))
const OUTCOME_OPTIONS = OUTCOME_ORDER.map((value) => ({ value, label: outcomeLabel(value) }))
const SOURCE_OPTIONS = PROVENANCES.map((value) => ({ value, label: PROVENANCE_LABELS[value] }))
const ETAG_OPTIONS = ETAG_RESULTS.map((value) => ({ value, label: etagPill(value).label }))
const SYNC_OPTIONS = SYNC_STATES.map((value) => ({ value, label: SYNC_LABELS[value] }))
const ATTEMPT_OPTIONS = [
  ...ATTEMPT_STATUSES.map((value) => ({ value, label: attemptPill(value).label })),
  { value: NOT_SUPPLIED, label: 'Not supplied' },
]

/**
 * "Verification record register": every verification in the area and period,
 * searchable and filtered by method, outcome and recorded source (and, under
 * "More filters", by E-Tag result, sync and attempt status).
 */
export function RecordsPanel({
  records,
  filters,
  onFiltersChange,
  subtitle,
  onOpen,
  onVehicle,
}: {
  records: readonly VerificationEntry[]
  filters: RegisterFilters
  onFiltersChange(filters: RegisterFilters): void
  /** The area and period: "Lagos state · Last 14 days". */
  subtitle: string
  onOpen(entry: VerificationEntry): void
  onVehicle(plate: string): void
}) {
  const link = useModuleLink()
  const searchId = useId()
  const moreId = useId()
  const extraFilters = filters.etag !== null || filters.sync !== null || filters.attempt !== null
  const [more, setMore] = useState(extraFilters)
  const columns = useMemo(() => columnsFor({ link, onOpen, onVehicle }), [link, onOpen, onVehicle])
  const rows = useMemo(() => applyFilters(records, filters), [records, filters])
  const register = useRecordRegister({ rows, columns, searchText: noSearch })
  const update = (next: Partial<RegisterFilters>) => {
    onFiltersChange({ ...filters, ...next })
    register.setPage(1)
  }
  const plates = new Set(rows.map((row) => row.plate)).size
  const supplied = rows.filter((row) => row.attempt !== null).length

  return (
    <DashboardCard
      title="Verification record register"
      subtitle={subtitle}
      icon="verifications/card-register.svg"
      bodyClassName={styles.panelBody}
    >
      <div className={styles.searchRow}>
        <label className={styles.search} htmlFor={searchId}>
          <img src={assetUrl('verifications/search.svg')} alt="" width={15} height={15} />
          <span className="visually-hidden">Search verification records</span>
          <input
            id={searchId}
            type="search"
            placeholder="Search plate, reference, agent or location…"
            value={filters.query}
            onChange={(event) => update({ query: event.target.value })}
          />
        </label>
        <button
          type="button"
          className={styles.moreButton}
          aria-expanded={more}
          aria-controls={moreId}
          onClick={() => setMore((open) => !open)}
        >
          <img src={assetUrl('verifications/more-filters.svg')} alt="" width={14} height={14} />
          More filters
        </button>
      </div>

      <div className={styles.selects}>
        <LabeledSelect
          label="Method"
          value={filters.method}
          options={METHOD_OPTIONS}
          onChange={(method) => update({ method })}
        />
        <LabeledSelect
          label="Outcome"
          value={filters.outcome}
          options={OUTCOME_OPTIONS}
          onChange={(outcome) => update({ outcome })}
        />
        <LabeledSelect
          label="Recorded source"
          value={filters.provenance}
          options={SOURCE_OPTIONS}
          onChange={(provenance) => update({ provenance })}
        />
      </div>
      {more && (
        <div id={moreId} className={styles.selects}>
          <LabeledSelect
            label="E-Tag result"
            value={filters.etag}
            options={ETAG_OPTIONS}
            onChange={(etag) => update({ etag })}
          />
          <LabeledSelect
            label="Sync"
            value={filters.sync}
            options={SYNC_OPTIONS}
            onChange={(sync) => update({ sync })}
          />
          <LabeledSelect
            label="Attempt status"
            value={filters.attempt}
            options={ATTEMPT_OPTIONS}
            onChange={(attempt) => update({ attempt })}
          />
        </div>
      )}

      <div className={styles.countLine}>
        <p aria-live="polite">
          {formatNumber(rows.length)} matching verification{' '}
          {rows.length === 1 ? 'record' : 'records'} · {formatNumber(plates)}{' '}
          {plates === 1 ? 'plate' : 'plates'}
          {hasColumnFilters(filters) && (
            <>
              {' · '}
              <button
                type="button"
                className={styles.clearButton}
                onClick={() =>
                  update({
                    method: null,
                    outcome: null,
                    provenance: null,
                    etag: null,
                    sync: null,
                    attempt: null,
                  })
                }
              >
                Clear filters
              </button>
            </>
          )}
        </p>
        <p>
          Attempt success supplied for {formatNumber(supplied)} of {formatNumber(rows.length)}{' '}
          records
        </p>
      </div>

      <RecordRegister
        total={records.length}
        page={register.page}
        pageCount={register.pageCount}
        onPageChange={register.setPage}
        first={register.first}
        last={register.last}
        matchCount={register.matchCount}
      >
        <DataTable
          label="Verification records"
          columns={columns}
          rows={register.pageRows}
          rowKey={(row) => row.id}
          sort={register.sort}
          onSort={register.toggleSort}
          emptyMessage={
            records.length === 0
              ? 'No verifications were recorded in this area and period.'
              : 'No verification records match these filters.'
          }
        />
      </RecordRegister>
    </DashboardCard>
  )
}

/** The page searches the records itself, before the register sees them. */
const noSearch = () => ''
