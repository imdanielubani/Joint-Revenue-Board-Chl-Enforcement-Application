import { useMemo } from 'react'
import { fieldReportLabel, loadLabel } from '@/features/command-centre/command-centre-display'
import type { FeedItem } from '@/features/command-centre/command-centre.schemas'
import { Stack } from '@/features/geography/components/RecordCells'
import cells from '@/features/geography/components/RecordColumns.module.css'
import { sourceLabel } from '@/features/overview/overview-display'
import { formatShortDateTime } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import type { Column } from '@/shared/ui/DataTable'
import { RegisterTable } from '@/shared/ui/RegisterTable'
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
}

/** The field reports: vehicle, driver and situation reports and general notifications. */
export function ReportsRegister({ items, subtitle }: RegisterProps) {
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
    ],
    [],
  )
  return (
    <DashboardCard
      title="Field report register"
      subtitle={subtitle}
      icon="overview/card-recent.svg"
      bodyClassName={styles.body}
    >
      <RegisterTable
        label="Field reports"
        rows={items}
        columns={columns}
        rowKey={(row) => row.id}
        searchText={searchTextOf}
      />
    </DashboardCard>
  )
}

/** The loaded / empty confirmations agents recorded. */
export function LoadsRegister({ items, subtitle }: RegisterProps) {
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
    ],
    [],
  )
  return (
    <DashboardCard
      title="Loaded / empty register"
      subtitle={subtitle}
      icon="overview/card-payment.svg"
      bodyClassName={styles.body}
    >
      <RegisterTable
        label="Loaded / empty confirmations"
        rows={items}
        columns={columns}
        rowKey={(row) => row.id}
        searchText={searchTextOf}
      />
    </DashboardCard>
  )
}
