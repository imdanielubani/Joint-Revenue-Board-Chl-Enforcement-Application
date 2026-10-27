import { useMemo } from 'react'
import { Stack } from '@/features/geography/components/RecordCells'
import cells from '@/features/geography/components/RecordColumns.module.css'
import { formatShortDateTime } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import type { Column } from '@/shared/ui/DataTable'
import { LabeledSelect } from '@/shared/ui/LabeledSelect'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import { RowActions } from '@/shared/ui/RowActions'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import {
  agentText,
  categoryLabel,
  readPill,
  searchTextOf,
  typeLabel,
} from '../notifications-display'
import type { Notification } from '../notifications.schemas'
import styles from './NotificationRegister.module.css'

const NOT_SUPPLIED = 'Not supplied'

const STATUSES = [
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
]

/**
 * A register of notifications, latest first: what each says, its vehicle,
 * agent and location, when CHL received it, and whether the user has read it.
 */
export function NotificationRegister({
  title,
  subtitle,
  label,
  notifications,
  showCategory,
  status,
  type,
  onStatusChange,
  onTypeChange,
  onOpen,
}: {
  title: string
  subtitle: string
  /** The table's accessible name. */
  label: string
  notifications: readonly Notification[]
  /** Shows each notification's group, where the register mixes them. */
  showCategory: boolean
  /** "unread" or "read"; null for both. */
  status: string | null
  type: string | null
  onStatusChange(value: string | null): void
  onTypeChange(value: string | null): void
  /** Opens the notification in its popup. */
  onOpen(notification: Notification): void
}) {
  const columns = useMemo<Column<Notification>[]>(
    () => [
      {
        key: 'notification',
        header: 'Notification',
        render: (row) => <Stack main={row.title} sub={typeLabel(row.type)} />,
        sortValue: (row) => row.title,
      },
      ...(showCategory
        ? [
            {
              key: 'category',
              header: 'Group',
              render: (row: Notification) => categoryLabel(row.category),
              sortValue: (row: Notification) => categoryLabel(row.category),
            },
          ]
        : []),
      {
        key: 'plate',
        header: 'Plate',
        render: (row) =>
          row.plate ? (
            <span className={cells.plate}>{row.plate}</span>
          ) : (
            <span className={cells.sub}>{NOT_SUPPLIED}</span>
          ),
        sortValue: (row) => row.plate ?? '',
      },
      {
        key: 'agent',
        header: 'Agent',
        render: (row) => {
          const agent = agentText(row)
          return agent ? (
            <Stack main={agent.main} sub={agent.sub} />
          ) : (
            <span className={cells.sub}>{NOT_SUPPLIED}</span>
          )
        },
        sortValue: (row) => agentText(row)?.main ?? '',
      },
      {
        key: 'location',
        header: 'Location',
        render: (row) =>
          row.location ? (
            <Stack
              main={row.location.name}
              sub={[row.location.area, row.location.code].filter(Boolean).join(' · ')}
            />
          ) : (
            <span className={cells.sub}>{NOT_SUPPLIED}</span>
          ),
        sortValue: (row) => row.location?.name ?? '',
      },
      {
        key: 'received',
        header: 'Received (WAT)',
        render: (row) => formatShortDateTime(row.receivedAt),
        sortValue: (row) => Date.parse(row.receivedAt),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => {
          const pill = readPill(row.read)
          return <StatusLabel tone={pill.tone}>{pill.label}</StatusLabel>
        },
        sortValue: (row) => Number(row.read),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'end',
        render: (row) => (
          <RowActions
            label={`Actions for ${row.title}`}
            actions={[{ label: 'View notification', onSelect: () => onOpen(row) }]}
          />
        ),
      },
    ],
    [showCategory, onOpen],
  )
  const types = [...new Set(notifications.map((item) => item.type))]
    .map((value) => ({ value, label: typeLabel(value) }))
    .sort((a, b) => a.label.localeCompare(b.label))
  const rows = notifications.filter(
    (item) => (!status || (status === 'unread') === !item.read) && (!type || item.type === type),
  )
  return (
    <DashboardCard
      title={title}
      subtitle={subtitle}
      icon="overview/card-recent.svg"
      bodyClassName={styles.body}
    >
      <div className={styles.selects}>
        <LabeledSelect label="Status" value={status} options={STATUSES} onChange={onStatusChange} />
        <LabeledSelect label="Type" value={type} options={types} onChange={onTypeChange} />
      </div>
      <RegisterTable
        key={`${status ?? ''}|${type ?? ''}`}
        label={label}
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        searchText={searchTextOf}
      />
    </DashboardCard>
  )
}
