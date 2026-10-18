import { useId, useMemo, useState } from 'react'
import { paths } from '@/config/paths'
import { useModuleLink } from '@/features/auth/use-module-link'
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
import type { AgentRow, Overview, RepeatVehicle } from '@/features/overview/overview.schemas'
import { formatNumber, formatShortDateTime } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import type { Column } from '@/shared/ui/DataTable'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import { RowActions, type RowAction } from '@/shared/ui/RowActions'
import { SegmentedTabs } from '@/shared/ui/SegmentedTabs'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import { panelId, tabId } from '@/shared/ui/tab-ids'
import type {
  EnforcementPoint,
  EvidenceRecord,
  NoticeRecord,
  VerificationRecord,
  ViolationRecord,
} from '../geography.schemas'
import {
  agentDetails,
  evidenceDetails,
  gpsText,
  locationDetails,
  noticeDetails,
  repeatDetails,
  verificationDetails,
  violationDetails,
  type RecordDetails,
  type RecordsContext,
} from '../record-details'
import { RecordDetailsPanel } from './RecordDetailsPanel'
import styles from './UnderlyingRecordsCard.module.css'

type RecordView =
  | 'verifications'
  | 'agents'
  | 'violations'
  | 'unresolved'
  | 'escalated'
  | 'repeat'
  | 'payments'
  | 'evidence'
  | 'locations'

type ModuleLink = ReturnType<typeof useModuleLink>

/** The first cell of a row: the record's reference or name, opening its details on the page. */
function OpenButton({ children, onClick }: { children: string; onClick(): void }) {
  return (
    <button type="button" className={styles.open} onClick={onClick}>
      {children}
    </button>
  )
}

const actionsOf = (actions: { label: string; to: string | undefined }[]) =>
  actions.filter((action): action is RowAction => action.to !== undefined)

function Stack({ main, sub }: { main: string; sub?: string | undefined }) {
  return (
    <span className={styles.stack}>
      <span>{main}</span>
      {sub && <span className={styles.sub}>{sub}</span>}
    </span>
  )
}

/* ------------------------------------------------------------ Columns per tab */

function verificationColumns(
  link: ModuleLink,
  onOpen: (row: VerificationRecord) => void,
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
      key: 'method',
      header: 'Method',
      render: (row) =>
        row.method ? methodTag(row.method) : <span className={styles.sub}>Not supplied</span>,
      sortValue: (row) => (row.method ? methodTag(row.method) : ''),
    },
    {
      key: 'outcome',
      header: 'Outcome',
      render: (row) =>
        row.result ? (
          <StatusLabel {...outcomeStyle(row.result)}>{outcomeLabel(row.result)}</StatusLabel>
        ) : (
          <span className={styles.sub}>Not supplied</span>
        ),
      sortValue: (row) => (row.result ? outcomeLabel(row.result) : ''),
    },
    {
      key: 'agent',
      header: 'Agent',
      render: (row) => <Stack main={row.agent.name} sub={row.agent.id} />,
      sortValue: (row) => row.agent.name,
    },
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
          { label: 'View agent', to: link('agents', `${paths.agents}?agent=${row.agent.id}`) },
        ])
        return actions.length > 0 ? (
          <RowActions label={`Actions for ${row.reference}`} actions={actions} />
        ) : null
      },
    },
  ]
}

function agentColumns(link: ModuleLink, onOpen: (row: AgentRow) => void): Column<AgentRow>[] {
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
          { label: 'View agent', to: link('agents', `${paths.agents}?agent=${row.agentId}`) },
        ])
        return actions.length > 0 ? (
          <RowActions label={`Actions for ${row.name}`} actions={actions} />
        ) : null
      },
    },
  ]
}

function violationColumns(
  link: ModuleLink,
  onOpen: (row: ViolationRecord) => void,
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
    {
      key: 'agent',
      header: 'Agent',
      render: (row) => <Stack main={row.agent.name} sub={row.agent.id} />,
      sortValue: (row) => row.agent.name,
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

function repeatColumns(
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

function noticeColumns(
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

function evidenceColumns(
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

function locationColumns(onOpen: (row: EnforcementPoint) => void): Column<EnforcementPoint>[] {
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

/* ------------------------------------------------------------ The card */

/**
 * "Underlying records": the records behind every figure on the page, for the
 * same scope and period as the map, one register per kind.
 */
export function UnderlyingRecordsCard({
  scopeName,
  overview,
  records,
  locations,
}: {
  scopeName: string
  overview: Overview
  records: {
    verifications: readonly VerificationRecord[]
    violations: readonly ViolationRecord[]
    notices: readonly NoticeRecord[]
    evidence: readonly EvidenceRecord[]
  }
  locations: readonly EnforcementPoint[]
}) {
  const link = useModuleLink()
  const idBase = useId()
  const [view, setViewState] = useState<RecordView>('verifications')
  // The record opened on the page; another tab closes it.
  const [details, setDetails] = useState<RecordDetails | null>(null)
  const setView = (next: RecordView) => {
    setViewState(next)
    setDetails(null)
  }

  const open = useMemo(() => new Set(overview.cases.items.map((item) => item.id)), [overview])
  const unresolved = useMemo(
    () => records.violations.filter((violation) => open.has(violation.id)),
    [records.violations, open],
  )
  const escalated = useMemo(
    () => unresolved.filter((violation) => violation.status === 'escalated'),
    [unresolved],
  )
  const columns = useMemo(() => {
    const ctx: RecordsContext = { link, ...records }
    return {
      verifications: verificationColumns(link, (row) => setDetails(verificationDetails(row, ctx))),
      agents: agentColumns(link, (row) => setDetails(agentDetails(row, ctx))),
      violations: violationColumns(link, (row) => setDetails(violationDetails(row, ctx))),
      repeat: repeatColumns(link, (row) => setDetails(repeatDetails(row, ctx))),
      notices: noticeColumns(link, (row) => setDetails(noticeDetails(row, ctx))),
      evidence: evidenceColumns(link, (row) => setDetails(evidenceDetails(row, ctx))),
      locations: locationColumns((row) => setDetails(locationDetails(row, ctx))),
    }
  }, [link, records])

  const tabs: { id: RecordView; label: string; count: number }[] = [
    { id: 'verifications', label: 'Verifications', count: records.verifications.length },
    { id: 'agents', label: 'Agents', count: overview.agents.length },
    { id: 'violations', label: 'Violations', count: records.violations.length },
    { id: 'unresolved', label: 'Unresolved', count: unresolved.length },
    { id: 'escalated', label: 'Escalated', count: escalated.length },
    { id: 'repeat', label: 'Repeat alerts', count: overview.repeatVehicles.items.length },
    { id: 'payments', label: 'Payments', count: records.notices.length },
    { id: 'evidence', label: 'Evidence', count: records.evidence.length },
    { id: 'locations', label: 'Locations', count: locations.length },
  ]
  const label = tabs.find((tab) => tab.id === view)?.label ?? 'Records'

  return (
    <DashboardCard
      title="Underlying records"
      subtitle={`${scopeName} · the same scope and period as the map`}
      icon="overview/card-recent.svg"
      bodyClassName={styles.body}
    >
      <SegmentedTabs<RecordView>
        idBase={idBase}
        label="Records to show"
        tabs={tabs}
        value={view}
        onChange={setView}
        className={styles.tabs}
      />
      <div
        id={panelId(idBase)}
        role="tabpanel"
        aria-labelledby={tabId(idBase, view)}
        className={styles.panel}
      >
        {details && (
          <RecordDetailsPanel
            key={details.key}
            details={details}
            onClose={() => setDetails(null)}
          />
        )}
        {view === 'verifications' && (
          <RegisterTable
            key={view}
            label={label}
            rows={records.verifications}
            columns={columns.verifications}
            rowKey={(row) => row.id}
            searchText={(row) =>
              `${row.reference} ${row.plate} ${row.agent.name} ${row.agent.id} ${row.location.name} ${row.location.area} ${row.result ? outcomeLabel(row.result) : ''}`
            }
          />
        )}
        {view === 'agents' && (
          <RegisterTable
            key={view}
            label={label}
            rows={overview.agents}
            columns={columns.agents}
            rowKey={(row) => row.agentId}
            searchText={(row) => `${row.name} ${row.agentId} ${row.organization} ${row.locations}`}
          />
        )}
        {(view === 'violations' || view === 'unresolved' || view === 'escalated') && (
          <RegisterTable
            key={view}
            label={label}
            rows={
              view === 'violations'
                ? records.violations
                : view === 'unresolved'
                  ? unresolved
                  : escalated
            }
            columns={columns.violations}
            rowKey={(row) => row.id}
            searchText={(row) =>
              `${row.id} ${row.plate} ${row.category} ${row.agent.name} ${row.location.name} ${row.location.area} ${row.noticeId ?? ''}`
            }
          />
        )}
        {view === 'repeat' && (
          <RegisterTable
            key={view}
            label={label}
            rows={overview.repeatVehicles.items}
            columns={columns.repeat}
            rowKey={(row) => row.plate}
            searchText={(row) => `${row.plate} ${row.area}`}
          />
        )}
        {view === 'payments' && (
          <RegisterTable
            key={view}
            label={label}
            rows={records.notices}
            columns={columns.notices}
            rowKey={(row) => row.id}
            searchText={(row) =>
              `${row.id} ${row.plate} ${row.violationId} ${row.location.name} ${row.location.area}`
            }
          />
        )}
        {view === 'evidence' && (
          <RegisterTable
            key={view}
            label={label}
            rows={records.evidence}
            columns={columns.evidence}
            rowKey={(row) => row.id}
            searchText={(row) =>
              `${row.id} ${row.plate} ${row.violationId} ${row.location.name} ${row.location.area}`
            }
          />
        )}
        {view === 'locations' && (
          <RegisterTable
            key={view}
            label={label}
            rows={locations}
            columns={columns.locations}
            rowKey={(row) => row.id}
            searchText={(row) => `${row.name} ${row.area} ${row.code}`}
          />
        )}
      </div>
    </DashboardCard>
  )
}
