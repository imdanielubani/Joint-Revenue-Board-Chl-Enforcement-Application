import { useMemo } from 'react'
import { paths } from '@/config/paths'
import { formatDelay, formatShortDateTime } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import type { Column } from '@/shared/ui/DataTable'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import { RowActions, type RowAction } from '@/shared/ui/RowActions'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import {
  actionStatusLabel,
  actionStatusTone,
  methodTag,
  outcomeLabel,
  outcomeStyle,
  sourceLabel,
  syncStatusLabel,
} from '../overview-display'
import type { ActivityRecord } from '../overview.schemas'
import { useModuleLink } from '../use-module-link'
import styles from './RecentActivityCard.module.css'

const searchText = (row: ActivityRecord) =>
  [
    row.plate,
    row.reference,
    row.method ? methodTag(row.method) : '',
    row.result ? outcomeLabel(row.result) : '',
    row.agent.name,
    row.agent.id,
    actionStatusLabel(row.actionStatus),
    row.location.name,
    row.location.area,
    row.location.code,
    row.source ? sourceLabel(row.source) : '',
    row.syncStatus ? syncStatusLabel(row.syncStatus) : '',
  ].join(' ')

/**
 * Under the time: whether CHL answered live or the phone checked offline, when
 * an offline record reached CHL, and its synchronization status.
 */
function RecordSync({ record }: { record: ActivityRecord }) {
  const { source, syncStatus, receivedAt, recordedAt } = record
  if (!source && !syncStatus) return null
  const offline = source === 'offline'
  return (
    <span className={styles.sync}>
      {source && (
        <span className={offline ? styles.offline : undefined}>{sourceLabel(source)}</span>
      )}
      {offline && receivedAt && <span>received {formatDelay(recordedAt, receivedAt)}</span>}
      {syncStatus && (
        <span className={syncStatus === 'synced' ? undefined : styles.syncPending}>
          {syncStatusLabel(syncStatus)}
        </span>
      )}
    </span>
  )
}

/** "Recent activity": the latest timed records, as a searchable register. */
export function RecentActivityCard({ records }: { records: readonly ActivityRecord[] }) {
  const link = useModuleLink()

  const columns = useMemo<Column<ActivityRecord>[]>(
    () => [
      {
        key: 'plate',
        header: 'Vehicle Plate',
        render: (row) => (
          <span className={styles.stack}>
            <span className={styles.plate}>{row.plate}</span>
            <span className={styles.sub}>{row.reference}</span>
          </span>
        ),
        sortValue: (row) => row.plate,
      },
      {
        key: 'method',
        header: 'Verification method',
        render: (row) =>
          row.method ? (
            <span className={styles.tag}>{methodTag(row.method)}</span>
          ) : (
            <span className={styles.missing}>Not supplied</span>
          ),
        sortValue: (row) => (row.method ? methodTag(row.method) : ''),
      },
      {
        key: 'result',
        header: 'Verification result',
        render: (row) =>
          row.result ? (
            <StatusLabel {...outcomeStyle(row.result)}>{outcomeLabel(row.result)}</StatusLabel>
          ) : (
            <span className={styles.missing}>Not supplied</span>
          ),
        sortValue: (row) => (row.result ? outcomeLabel(row.result) : ''),
      },
      {
        key: 'agent',
        header: 'Agent',
        render: (row) => (
          <span className={styles.stack}>
            <span className={styles.agent}>{row.agent.name}</span>
            <span className={styles.sub}>{row.agent.id}</span>
          </span>
        ),
        sortValue: (row) => row.agent.name,
      },
      {
        key: 'recordedAt',
        header: 'Date and time (WAT)',
        render: (row) => (
          <span className={styles.stack}>
            <time dateTime={row.recordedAt}>{formatShortDateTime(row.recordedAt)}</time>
            <RecordSync record={row} />
          </span>
        ),
        sortValue: (row) => new Date(row.recordedAt).getTime(),
      },
      {
        key: 'actionStatus',
        header: 'Action status',
        render: (row) => (
          <StatusLabel tone={actionStatusTone(row.actionStatus)}>
            {actionStatusLabel(row.actionStatus)}
          </StatusLabel>
        ),
        sortValue: (row) => actionStatusLabel(row.actionStatus),
      },
      {
        key: 'location',
        header: 'Location',
        render: (row) => (
          <span className={styles.stack}>
            <span>{row.location.name}</span>
            <span className={styles.sub}>
              {row.location.area} · {row.location.code}
            </span>
          </span>
        ),
        sortValue: (row) => row.location.name,
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'end',
        render: (row) => {
          const actions = [
            {
              label: 'View verification',
              to: link('verifications', `${paths.verifications}?ref=${row.reference}`),
            },
            {
              label: 'View vehicle history',
              to: link('verifications', `${paths.verifications}?plate=${row.plate}`),
            },
            {
              label: 'View agent',
              to: link('agents', `${paths.agents}?agent=${row.agent.id}`),
            },
          ].filter((action): action is RowAction => action.to !== undefined)
          return actions.length > 0 ? (
            <RowActions label={`Actions for ${row.plate}, ${row.reference}`} actions={actions} />
          ) : null
        },
      },
    ],
    [link],
  )

  return (
    <DashboardCard
      title="Recent activity"
      subtitle="Latest timed records · verification method and result appear only where supplied"
      icon="overview/card-recent.svg"
      bodyClassName={styles.body}
    >
      <RegisterTable
        label="Recent activity"
        rows={records}
        columns={columns}
        rowKey={(row) => row.id}
        searchText={searchText}
      />
    </DashboardCard>
  )
}
