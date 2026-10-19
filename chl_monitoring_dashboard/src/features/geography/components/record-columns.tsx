import { paths } from '@/config/paths'
import type { useModuleLink } from '@/features/auth/use-module-link'
import {
  actionStatusLabel,
  actionStatusTone,
  followUpLabel,
  methodTag,
  outcomeLabel,
  outcomeStyle,
  sourceLabel,
  syncStatusLabel,
} from '@/features/overview/overview-display'
import type { AgentRow, RepeatVehicle } from '@/features/overview/overview.schemas'
import { formatNumber, formatShortDateTime } from '@/shared/lib/format'
import type { Column } from '@/shared/ui/DataTable'
import { RowActions, type RowAction } from '@/shared/ui/RowActions'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import type {
  EnforcementPoint,
  EvidenceRecord,
  NoticeRecord,
  VerificationRecord,
  ViolationRecord,
} from '../geography.schemas'
import { gpsText } from '../record-details'
import { OpenButton, Stack } from './RecordCells'
import styles from './RecordColumns.module.css'

/**
 * The columns of the underlying-records registers, one set per kind of record,
 * shared by geographical monitoring and the agents page.
 */

type ModuleLink = ReturnType<typeof useModuleLink>

const actionsOf = (actions: { label: string; to: string | undefined }[]) =>
  actions.filter((action): action is RowAction => action.to !== undefined)

/* ------------------------------------------------------------ Columns per tab */

interface ColumnOptions {
  /** False where every record is the same agent's, on the agent's own page. */
  withAgent?: boolean
}

/** The recording agent: their name, with their ID under it. */
function agentColumn<T extends { agent: { id: string; name: string } }>(): Column<T> {
  return {
    key: 'agent',
    header: 'Agent',
    render: (row) => <Stack main={row.agent.name} sub={row.agent.id} />,
    sortValue: (row) => row.agent.name,
  }
}

export function verificationColumns(
  link: ModuleLink,
  onOpen: (row: VerificationRecord) => void,
  { withAgent = true }: ColumnOptions = {},
): Column<VerificationRecord>[] {
  return [
    {
      key: 'reference',
      header: 'Reference',
      render: (row) => <OpenButton onClick={() => onOpen(row)}>{row.reference}</OpenButton>,
      sortValue: (row) => row.reference,
    },
    {
      key: 'plate',
      header: 'Plate',
      render: (row) => <span className={styles.plate}>{row.plate}</span>,
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
      key: 'outcome',
      header: 'Verification result',
      render: (row) =>
        row.result ? (
          <StatusLabel {...outcomeStyle(row.result)}>{outcomeLabel(row.result)}</StatusLabel>
        ) : (
          <span className={styles.sub}>Not supplied</span>
        ),
      sortValue: (row) => (row.result ? outcomeLabel(row.result) : ''),
    },
    ...(withAgent ? [agentColumn<VerificationRecord>()] : []),
    {
      key: 'recorded',
      header: 'Recorded (WAT)',
      render: (row) => (
        <Stack
          main={formatShortDateTime(row.recordedAt)}
          sub={[
            row.source ? sourceLabel(row.source) : null,
            row.syncStatus ? syncStatusLabel(row.syncStatus) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        />
      ),
      sortValue: (row) => Date.parse(row.recordedAt),
    },
    {
      key: 'gps',
      header: 'Recorded GPS',
      render: (row) =>
        row.position ? (
          <span className={styles.gps}>{gpsText(row.position)}</span>
        ) : (
          <span className={styles.sub}>Not captured</span>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'end',
      render: (row) => {
        const actions = actionsOf([
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
            to: withAgent ? link('agents', paths.agent(row.agent.id)) : undefined,
          },
        ])
        return actions.length > 0 ? (
          <RowActions label={`Actions for ${row.reference}`} actions={actions} />
        ) : null
      },
    },
  ]
}

export function agentColumns(
  link: ModuleLink,
  onOpen: (row: AgentRow) => void,
): Column<AgentRow>[] {
  const figure = (key: keyof AgentRow & string, header: string): Column<AgentRow> => ({
    key,
    header,
    align: 'end',
    render: (row) => formatNumber(Number(row[key])),
    sortValue: (row) => Number(row[key]),
  })
  return [
    {
      key: 'agent',
      header: 'Agent',
      render: (row) => (
        <span className={styles.stack}>
          <OpenButton onClick={() => onOpen(row)}>{row.name}</OpenButton>
          <span className={styles.sub}>{row.agentId}</span>
        </span>
      ),
      sortValue: (row) => row.name,
    },
    {
      key: 'organization',
      header: 'Organization',
      render: (row) => row.organization,
      sortValue: (row) => row.organization,
    },
    figure('verifications', 'Verifications'),
    figure('violationsIssued', 'Violations'),
    figure('unresolved', 'Unresolved'),
    figure('escalated', 'Escalated'),
    figure('repeatAlerts', 'Repeat alerts'),
    {
      key: 'locations',
      header: 'Recorded in',
      render: (row) => row.locations,
      sortValue: (row) => row.locations,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'end',
      render: (row) => {
        const actions = actionsOf([
          { label: 'View agent', to: link('agents', paths.agent(row.agentId)) },
        ])
        return actions.length > 0 ? (
          <RowActions label={`Actions for ${row.name}`} actions={actions} />
        ) : null
      },
    },
  ]
}

export function violationColumns(
  link: ModuleLink,
  onOpen: (row: ViolationRecord) => void,
  { withAgent = true }: ColumnOptions = {},
): Column<ViolationRecord>[] {
  return [
    {
      key: 'id',
      header: 'Reference',
      render: (row) => <OpenButton onClick={() => onOpen(row)}>{row.id}</OpenButton>,
      sortValue: (row) => row.id,
    },
    {
      key: 'plate',
      header: 'Plate · location',
      render: (row) => (
        <span className={styles.stack}>
          <span className={styles.plate}>{row.plate}</span>
          <span className={styles.sub}>
            {row.location.name}, {row.location.area}
          </span>
        </span>
      ),
      sortValue: (row) => row.plate,
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => row.category,
      sortValue: (row) => row.category,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <StatusLabel tone={actionStatusTone(row.status)}>
          {actionStatusLabel(row.status)}
        </StatusLabel>
      ),
      sortValue: (row) => actionStatusLabel(row.status),
    },
    ...(withAgent ? [agentColumn<ViolationRecord>()] : []),
    {
      key: 'recorded',
      header: 'Recorded (WAT)',
      render: (row) => (
        <Stack
          main={formatShortDateTime(row.recordedAt)}
          sub={row.position ? `GPS ${gpsText(row.position)}` : 'GPS not captured'}
        />
      ),
      sortValue: (row) => Date.parse(row.recordedAt),
    },
    {
      key: 'notice',
      header: 'Demand notice',
      render: (row) => row.noticeId ?? <span className={styles.sub}>None issued</span>,
      sortValue: (row) => row.noticeId ?? '',
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'end',
      render: (row) => {
        const actions = actionsOf([
          { label: 'Open the case', to: link('violations', `${paths.violations}?case=${row.id}`) },
        ])
        return actions.length > 0 ? (
          <RowActions label={`Actions for ${row.id}`} actions={actions} />
        ) : null
      },
    },
  ]
}

export function repeatColumns(
  link: ModuleLink,
  onOpen: (row: RepeatVehicle) => void,
): Column<RepeatVehicle>[] {
  return [
    {
      key: 'plate',
      header: 'Plate',
      render: (row) => <OpenButton onClick={() => onOpen(row)}>{row.plate}</OpenButton>,
      sortValue: (row) => row.plate,
    },
    {
      key: 'reports',
      header: 'Reports',
      align: 'end',
      render: (row) => formatNumber(row.reports),
      sortValue: (row) => row.reports,
    },
    {
      key: 'agents',
      header: 'Agents',
      align: 'end',
      render: (row) => formatNumber(row.agents),
      sortValue: (row) => row.agents,
    },
    { key: 'area', header: 'Area', render: (row) => row.area, sortValue: (row) => row.area },
    {
      key: 'followUp',
      header: 'Follow-up',
      render: (row) => (
        <StatusLabel tone={row.followUp === 'none' ? 'amber' : 'neutral'}>
          {followUpLabel(row.followUp)}
        </StatusLabel>
      ),
      sortValue: (row) => followUpLabel(row.followUp),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'end',
      render: (row) => {
        const actions = actionsOf([
          {
            label: 'View vehicle reports',
            to: link('violations', `${paths.violations}?plate=${row.plate}`),
          },
        ])
        return actions.length > 0 ? (
          <RowActions label={`Actions for ${row.plate}`} actions={actions} />
        ) : null
      },
    },
  ]
}

export function noticeColumns(
  link: ModuleLink,
  onOpen: (row: NoticeRecord) => void,
): Column<NoticeRecord>[] {
  return [
    {
      key: 'id',
      header: 'Demand notice',
      render: (row) => <OpenButton onClick={() => onOpen(row)}>{row.id}</OpenButton>,
      sortValue: (row) => row.id,
    },
    {
      key: 'plate',
      header: 'Plate · location',
      render: (row) => (
        <span className={styles.stack}>
          <span className={styles.plate}>{row.plate}</span>
          <span className={styles.sub}>
            {row.location.name}, {row.location.area}
          </span>
        </span>
      ),
      sortValue: (row) => row.plate,
    },
    {
      key: 'violation',
      header: 'Violation',
      render: (row) => row.violationId,
      sortValue: (row) => row.violationId,
    },
    {
      key: 'status',
      header: 'Payment status',
      render: (row) =>
        row.status === 'received' ? (
          <StatusLabel tone="success">Payment Received</StatusLabel>
        ) : (
          <StatusLabel tone="amber">Payment Pending</StatusLabel>
        ),
      sortValue: (row) => row.status,
    },
    {
      key: 'trip',
      header: 'Trip activation',
      render: (row) =>
        row.tripActivated ? 'Recorded' : <span className={styles.sub}>Not recorded</span>,
      sortValue: (row) => (row.tripActivated ? 1 : 0),
    },
    {
      key: 'recorded',
      header: 'Recorded (WAT)',
      render: (row) => formatShortDateTime(row.recordedAt),
      sortValue: (row) => Date.parse(row.recordedAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'end',
      render: (row) => {
        const actions = actionsOf([
          { label: 'Open the payment', to: link('payments', `${paths.payments}?notice=${row.id}`) },
        ])
        return actions.length > 0 ? (
          <RowActions label={`Actions for ${row.id}`} actions={actions} />
        ) : null
      },
    },
  ]
}

export function evidenceColumns(
  link: ModuleLink,
  onOpen: (row: EvidenceRecord) => void,
): Column<EvidenceRecord>[] {
  return [
    {
      key: 'id',
      header: 'Evidence',
      render: (row) => <OpenButton onClick={() => onOpen(row)}>{row.id}</OpenButton>,
      sortValue: (row) => row.id,
    },
    {
      key: 'plate',
      header: 'Plate · location',
      render: (row) => (
        <span className={styles.stack}>
          <span className={styles.plate}>{row.plate}</span>
          <span className={styles.sub}>
            {row.location.name}, {row.location.area}
          </span>
        </span>
      ),
      sortValue: (row) => row.plate,
    },
    {
      key: 'violation',
      header: 'Violation',
      render: (row) => row.violationId,
      sortValue: (row) => row.violationId,
    },
    {
      key: 'photographs',
      header: 'Photographs',
      align: 'end',
      render: (row) => formatNumber(row.photographs),
      sortValue: (row) => row.photographs,
    },
    {
      key: 'status',
      header: 'Upload',
      render: (row) =>
        row.status === 'received' ? (
          <StatusLabel tone="success">Received</StatusLabel>
        ) : (
          <StatusLabel tone="amber">Still uploading</StatusLabel>
        ),
      sortValue: (row) => row.status,
    },
    {
      key: 'recorded',
      header: 'Recorded (WAT)',
      render: (row) => (
        <Stack
          main={formatShortDateTime(row.recordedAt)}
          sub={row.position ? `GPS ${gpsText(row.position)}` : 'GPS not captured'}
        />
      ),
      sortValue: (row) => Date.parse(row.recordedAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'end',
      render: (row) => {
        const actions = actionsOf([
          {
            label: 'View photographs',
            to: link('evidence', `${paths.evidence}?record=${row.violationId}`),
          },
        ])
        return actions.length > 0 ? (
          <RowActions label={`Actions for ${row.id}`} actions={actions} />
        ) : null
      },
    },
  ]
}

export function locationColumns(
  onOpen: (row: EnforcementPoint) => void,
): Column<EnforcementPoint>[] {
  return [
    {
      key: 'name',
      header: 'Location',
      render: (row) => (
        <span className={styles.stack}>
          <OpenButton onClick={() => onOpen(row)}>{row.name}</OpenButton>
          <span className={styles.sub}>
            {row.area} · {row.code}
          </span>
        </span>
      ),
      sortValue: (row) => row.name,
    },
    {
      key: 'position',
      header: 'Recorded position',
      render: (row) =>
        row.position ? (
          <span className={styles.gps}>{gpsText(row.position)}</span>
        ) : (
          <span className={styles.sub}>Not recorded</span>
        ),
    },
    {
      key: 'verifications',
      header: 'Verifications',
      align: 'end',
      render: (row) => formatNumber(row.verifications),
      sortValue: (row) => row.verifications,
    },
    {
      key: 'violations',
      header: 'Violations',
      align: 'end',
      render: (row) => formatNumber(row.violations),
      sortValue: (row) => row.violations,
    },
    {
      key: 'agents',
      header: 'Agents',
      align: 'end',
      render: (row) => formatNumber(row.agents),
      sortValue: (row) => row.agents,
    },
    {
      key: 'last',
      header: 'Last recorded (WAT)',
      render: (row) =>
        row.lastRecordedAt ? (
          formatShortDateTime(row.lastRecordedAt)
        ) : (
          <span className={styles.sub}>Nothing yet</span>
        ),
      sortValue: (row) => (row.lastRecordedAt ? Date.parse(row.lastRecordedAt) : 0),
    },
  ]
}
