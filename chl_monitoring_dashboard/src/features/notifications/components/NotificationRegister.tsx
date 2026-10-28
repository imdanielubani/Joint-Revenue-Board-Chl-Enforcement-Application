import { useMemo } from 'react'
import { sosTypeLabel } from '@/features/command-centre/command-centre-display'
import { SOS_TYPES } from '@/features/command-centre/command-centre.schemas'
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
  isSos,
  readPill,
  sosTypeText,
  searchTextOf,
  typeLabel,
} from '../notifications-display'
import type { TripRelated } from '@/features/trips/components/TripRelatedDialog'
import type { Notification } from '../notifications.schemas'
import { useNotificationRelated } from '../use-notification-related'
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
  sosType,
  onSosTypeChange,
  onOpen,
  onRelated,
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
  /** An SOS type, filtering the SOS listed; null for all. */
  sosType: string | null
  onSosTypeChange(value: string | null): void
  /** Opens the notification in its popup. */
  onOpen(notification: Notification): void
  /** Opens a record it leads to in a popup on the page. */
  onRelated(related: TripRelated): void
}) {
  const relatedOf = useNotificationRelated()
  const columns = useMemo<Column<Notification>[]>(
    () => [
      {
        key: 'notification',
        header: 'Notification',
        render: (row) =>
          isSos(row) ? (
            <span className={styles.sos}>
              <span className={styles.sosTitle}>{row.title}</span>
              <span className={styles.sosType}>
                <StatusLabel tone="danger">{typeLabel(row.type)}</StatusLabel>
                {sosTypeText(row)}
              </span>
            </span>
          ) : (
            <Stack main={row.title} sub={typeLabel(row.type)} />
          ),
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
            actions={[
              { label: 'View notification', onSelect: () => onOpen(row) },
              ...relatedOf(row).map((entry) => ({
                label: entry.label,
                onSelect: () => onRelated(entry.related),
              })),
            ]}
          />
        ),
      },
    ],
    [showCategory, onOpen, onRelated, relatedOf],
  )
  const types = [...new Set(notifications.map((item) => item.type))]
    .map((value) => ({ value, label: typeLabel(value) }))
    .sort((a, b) => a.label.localeCompare(b.label))
  const rows = notifications.filter(
    (item) =>
      (!status || (status === 'unread') === !item.read) &&
      (!type || item.type === type) &&
      (!sosType || item.entry?.sos?.type === sosType),
  )
  const sosTypes = [
    ...new Set([...SOS_TYPES, ...notifications.flatMap((item) => item.entry?.sos?.type ?? [])]),
  ].map((value) => ({ value, label: sosTypeLabel(value) }))
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
        {type === 'sos' && (
          <LabeledSelect
            label="SOS type"
            value={sosType}
            options={sosTypes}
            onChange={onSosTypeChange}
          />
        )}
      </div>
      <RegisterTable
        key={`${status ?? ''}|${type ?? ''}|${sosType ?? ''}`}
        label={label}
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        searchText={searchTextOf}
      />
    </DashboardCard>
  )
}
