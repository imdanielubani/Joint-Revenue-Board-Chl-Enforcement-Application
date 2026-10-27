import { useMemo } from 'react'
import { fieldReportLabel, loadLabel } from '@/features/command-centre/command-centre-display'
import { FIELD_REPORT_TYPES, type FeedItem } from '@/features/command-centre/command-centre.schemas'
import { Stack } from '@/features/geography/components/RecordCells'
import cells from '@/features/geography/components/RecordColumns.module.css'
import { sourceLabel } from '@/features/overview/overview-display'
import { formatShortDateTime } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import type { Column } from '@/shared/ui/DataTable'
import { LabeledSelect } from '@/shared/ui/LabeledSelect'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import { RowActions } from '@/shared/ui/RowActions'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import styles from './FieldRegisters.module.css'

const NOT_SUPPLIED = 'Not supplied'

/** What a register search looks through. */
function searchTextOf(item: FeedItem): string {
  return [
    item.id,
    item.report?.summary ?? '',
    item.report ? fieldReportLabel(item.report.type) : '',
    item.load ? loadLabel(item.load) : '',
    item.plate ?? '',
    item.agent.id,
    item.agent.name,
    item.location.name,
    item.location.area,
    item.location.code,
  ].join(' ')
}

/** "Loaded" in green, "Empty" in grey, as the Command centre shows them. */
export function LoadLabel({ load }: { load: string }) {
  return (
    <StatusLabel tone={load === 'loaded' ? 'success' : 'neutral'}>{loadLabel(load)}</StatusLabel>
  )
}

/** The columns both registers share: plate, agent, location, and when it was recorded and received. */
const plateColumn: Column<FeedItem> = {
  key: 'plate',
  header: 'Plate',
  render: (row) =>
    row.plate ? (
      <span className={cells.plate}>{row.plate}</span>
    ) : (
      <span className={cells.sub}>{NOT_SUPPLIED}</span>
    ),
  sortValue: (row) => row.plate ?? '',
}

const sharedColumns: Column<FeedItem>[] = [
  {
    key: 'agent',
    header: 'Agent',
    render: (row) => <Stack main={row.agent.name} sub={row.agent.id} />,
    sortValue: (row) => row.agent.name,
  },
  {
    key: 'location',
    header: 'Location',
    render: (row) => (
      <Stack
        main={row.location.name}
        sub={[row.location.area, row.location.code].filter(Boolean).join(' · ')}
      />
    ),
    sortValue: (row) => row.location.name,
  },
  {
    key: 'recorded',
    header: 'Recorded (WAT)',
    render: (row) => formatShortDateTime(row.recordedAt),
    sortValue: (row) => Date.parse(row.recordedAt),
  },
  {
    key: 'received',
    header: 'Received by CHL',
    render: (row) =>
      row.receivedAt ? (
        <Stack
          main={formatShortDateTime(row.receivedAt)}
          sub={row.source ? sourceLabel(row.source) : undefined}
        />
      ) : (
        <span className={cells.sub}>{NOT_SUPPLIED}</span>
      ),
    sortValue: (row) => (row.receivedAt ? Date.parse(row.receivedAt) : 0),
  },
]

interface RegisterProps {
  items: readonly FeedItem[]
  subtitle: string
  /** "live" or "offline"; null for both. */
  source: string | null
  onSourceChange(value: string | null): void
  /** Opens the record in its popup. */
  onOpen(item: FeedItem): void
}

/** The row's actions: the record's popup. */
function actionsColumn(label: string, onOpen: (item: FeedItem) => void): Column<FeedItem> {
  return {
    key: 'actions',
    header: 'Actions',
    align: 'end',
    render: (row) => (
      <RowActions
        label={`Actions for ${row.id}`}
        actions={[{ label, onSelect: () => onOpen(row) }]}
      />
    ),
  }
}

/** How it reached CHL, for the "Received" filter: live, offline, or as CHL says. */
function sourceOptions(items: readonly FeedItem[]) {
  return [...new Set(['live', 'offline', ...items.flatMap((item) => item.source ?? [])])].map(
    (value) => ({ value, label: sourceLabel(value) }),
  )
}

/** The field reports: vehicle, driver and situation reports and general notifications. */
export function ReportsRegister({
  items,
  subtitle,
  source,
  onSourceChange,
  type,
  onTypeChange,
  onOpen,
}: RegisterProps & { type: string | null; onTypeChange(value: string | null): void }) {
  const columns = useMemo<Column<FeedItem>[]>(
    () => [
      {
        key: 'report',
        header: 'Report',
        render: (row) => (
          <Stack
            main={row.report?.summary ?? NOT_SUPPLIED}
            sub={row.report ? fieldReportLabel(row.report.type) : undefined}
          />
        ),
        sortValue: (row) => (row.report ? fieldReportLabel(row.report.type) : ''),
      },
      plateColumn,
      ...sharedColumns,
      actionsColumn('View report', onOpen),
    ],
    [onOpen],
  )
  return (
    <DashboardCard
      title="Field report register"
      subtitle={subtitle}
      icon="overview/card-recent.svg"
      bodyClassName={styles.body}
    >
      <div className={styles.selects}>
        <LabeledSelect
          label="Report type"
          value={type}
          options={[
            ...new Set([
              ...FIELD_REPORT_TYPES,
              ...items.flatMap((item) => item.report?.type ?? []),
            ]),
          ].map((value) => ({ value, label: fieldReportLabel(value) }))}
          onChange={onTypeChange}
        />
        <LabeledSelect
          label="Received"
          value={source}
          options={sourceOptions(items)}
          onChange={onSourceChange}
        />
      </div>
      <RegisterTable
        key={`${type ?? ''}|${source ?? ''}`}
        label="Field reports"
        rows={items.filter(
          (item) => (!type || item.report?.type === type) && (!source || item.source === source),
        )}
        columns={columns}
        rowKey={(row) => row.id}
        searchText={searchTextOf}
      />
    </DashboardCard>
  )
}

/** The loaded / empty confirmations agents recorded. */
export function LoadsRegister({
  items,
  subtitle,
  source,
  onSourceChange,
  load,
  onLoadChange,
  onOpen,
}: RegisterProps & { load: string | null; onLoadChange(value: string | null): void }) {
  const columns = useMemo<Column<FeedItem>[]>(
    () => [
      plateColumn,
      {
        key: 'load',
        header: 'Confirmed',
        render: (row) => <LoadLabel load={row.load ?? 'unknown'} />,
        sortValue: (row) => loadLabel(row.load),
      },
      ...sharedColumns,
      actionsColumn('View confirmation', onOpen),
    ],
    [onOpen],
  )
  return (
    <DashboardCard
      title="Loaded / empty register"
      subtitle={subtitle}
      icon="overview/card-payment.svg"
      bodyClassName={styles.body}
    >
      <div className={styles.selects}>
        <LabeledSelect
          label="Confirmed"
          value={load}
          options={[
            ...new Set(['loaded', 'empty', ...items.flatMap((item) => item.load ?? [])]),
          ].map((value) => ({ value, label: loadLabel(value) }))}
          onChange={onLoadChange}
        />
        <LabeledSelect
          label="Received"
          value={source}
          options={sourceOptions(items)}
          onChange={onSourceChange}
        />
      </div>
      <RegisterTable
        key={`${load ?? ''}|${source ?? ''}`}
        label="Loaded / empty confirmations"
        rows={items.filter(
          (item) => (!load || item.load === load) && (!source || item.source === source),
        )}
        columns={columns}
        rowKey={(row) => row.id}
        searchText={searchTextOf}
      />
    </DashboardCard>
  )
}
