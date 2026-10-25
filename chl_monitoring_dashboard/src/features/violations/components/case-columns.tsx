import { useMemo } from 'react'
import { Stack } from '@/features/geography/components/RecordCells'
import cells from '@/features/geography/components/RecordColumns.module.css'
import { actionStatusLabel, followUpLabel } from '@/features/overview/overview-display'
import { formatNumber, formatShortDateTime } from '@/shared/lib/format'
import type { Column } from '@/shared/ui/DataTable'
import { RowActions, type RowCommand } from '@/shared/ui/RowActions'
import {
  actionLabel,
  closurePill,
  pendingFollowUp,
  placeText,
  statusPill,
} from '../violations-display'
import type { ViolationCase } from '../violations.schemas'
import { useCanSeeRelated, type RelatedKind } from '../related-records'
import { PillLabel } from './PillLabel'

export interface CaseOpenProps {
  /** Opens the case, or with `related`, its evidence, verification or agent. */
  onOpen(item: ViolationCase, related?: RelatedKind): void
}

const notSupplied = (text = 'Not supplied') => <span className={cells.sub}>{text}</span>

/** The register's columns; the last ones depend on the view. */
function caseColumns(
  kind: 'register' | 'unresolved' | 'history',
  onOpen: CaseOpenProps['onOpen'],
  canSee: (kind: RelatedKind) => boolean,
): Column<ViolationCase>[] {
  const lead: Column<ViolationCase>[] = [
    {
      key: 'violation',
      header: 'Violation',
      render: (row) => <span className={cells.plate}>{row.id}</span>,
      sortValue: (row) => row.id,
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => row.category,
      sortValue: (row) => row.category,
    },
    {
      key: 'plate',
      header: 'Plate',
      render: (row) => <span className={cells.plate}>{row.plate}</span>,
      sortValue: (row) => row.plate,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <PillLabel pill={statusPill(row.status)} />,
      sortValue: (row) => actionStatusLabel(row.status),
    },
  ]
  const recorded: Column<ViolationCase> = {
    key: 'recorded',
    header: 'Recorded (WAT)',
    render: (row) => (
      <Stack main={formatShortDateTime(row.recordedAt)} sub={placeText(row.location)} />
    ),
    sortValue: (row) => Date.parse(row.recordedAt),
  }
  const agent: Column<ViolationCase> = {
    key: 'agent',
    header: 'Agent',
    render: (row) => <Stack main={row.agent.name} sub={row.agent.id} />,
    sortValue: (row) => row.agent.name,
  }
  const actions: Column<ViolationCase> = {
    key: 'actions',
    header: 'Actions',
    align: 'end',
    render: (row) => {
      // The case and its related records open as popups on this page, for roles that may see them.
      const related: { label: string; kind: RelatedKind; offered: boolean }[] = [
        { label: 'View evidence', kind: 'evidence', offered: row.evidence !== null },
        { label: 'View verification', kind: 'verification', offered: true },
        { label: 'View agent', kind: 'agent', offered: true },
        { label: 'Open the payment', kind: 'payment', offered: row.notice !== null },
      ]
      const commands: RowCommand[] = [
        { label: 'View case', onSelect: () => onOpen(row) },
        ...related
          .filter((entry) => entry.offered && canSee(entry.kind))
          .map((entry) => ({ label: entry.label, onSelect: () => onOpen(row, entry.kind) })),
      ]
      return <RowActions label={`Actions for ${row.id}`} actions={commands} />
    },
  }

  if (kind === 'unresolved') {
    return [
      ...lead,
      agent,
      recorded,
      {
        key: 'followUp',
        header: 'Pending follow-up',
        render: (row) => pendingFollowUp(row),
        sortValue: (row) => pendingFollowUp(row),
      },
      {
        key: 'lastAction',
        header: 'Last recorded action',
        render: (row) => {
          const last = row.actions[row.actions.length - 1]
          return last ? (
            <Stack main={actionLabel(last.action)} sub={formatShortDateTime(last.at)} />
          ) : (
            notSupplied()
          )
        },
        sortValue: (row) => Date.parse(row.actions[row.actions.length - 1]?.at ?? '') || 0,
      },
      {
        key: 'repeat',
        header: 'Repeat-vehicle alert',
        render: (row) =>
          row.repeatAlert ? (
            <Stack
              main={`${formatNumber(row.repeatAlert.reports)} reports`}
              sub={followUpLabel(row.repeatAlert.followUp)}
            />
          ) : (
            notSupplied('None')
          ),
        sortValue: (row) => row.repeatAlert?.reports ?? 0,
      },
      actions,
    ]
  }
  if (kind === 'history') {
    return [
      ...lead.filter((column) => column.key !== 'status'),
      {
        key: 'outcome',
        header: 'Closed or cancelled',
        render: (row) =>
          row.closure ? <PillLabel pill={closurePill(row.closure.outcome)} /> : null,
        sortValue: (row) => row.closure?.outcome ?? '',
      },
      {
        key: 'closedAt',
        header: 'When (WAT)',
        render: (row) => (row.closure ? formatShortDateTime(row.closure.at) : notSupplied()),
        sortValue: (row) => (row.closure ? Date.parse(row.closure.at) : 0),
      },
      {
        key: 'actor',
        header: 'Responsible actor',
        render: (row) =>
          row.closure?.actor ? (
            <Stack main={row.closure.actor.name} sub={row.closure.actor.role} />
          ) : (
            notSupplied('Not supplied by CHL')
          ),
        sortValue: (row) => row.closure?.actor?.name ?? '',
      },
      {
        key: 'reason',
        header: 'Reason',
        render: (row) => row.closure?.reason ?? notSupplied(),
        sortValue: (row) => row.closure?.reason ?? '',
      },
      {
        key: 'audit',
        header: 'Audit reference',
        render: (row) => row.closure?.auditReference ?? notSupplied('Not available'),
        sortValue: (row) => row.closure?.auditReference ?? '',
      },
      actions,
    ]
  }
  return [
    ...lead,
    agent,
    recorded,
    {
      key: 'notice',
      header: 'Demand notice',
      render: (row) =>
        row.notice ? (
          <Stack
            main={row.notice.id}
            sub={row.notice.status === 'received' ? 'Payment received' : 'Payment pending'}
          />
        ) : (
          notSupplied('None issued')
        ),
      sortValue: (row) => row.notice?.id ?? '',
    },
    {
      key: 'evidence',
      header: 'Evidence',
      render: (row) =>
        row.evidence ? (
          <Stack
            main={`${row.evidence.photographs} photographs`}
            sub={`${row.notes.length} ${row.notes.length === 1 ? 'note' : 'notes'}`}
          />
        ) : (
          notSupplied('None')
        ),
      sortValue: (row) => row.evidence?.photographs ?? 0,
    },
    actions,
  ]
}

/** The register's columns and row actions, for a view or for a popup listing cases. */
export function useCaseColumns(
  kind: 'register' | 'unresolved' | 'history',
  onOpen: CaseOpenProps['onOpen'],
) {
  const canSee = useCanSeeRelated()
  return useMemo(() => caseColumns(kind, onOpen, canSee), [kind, onOpen, canSee])
}
