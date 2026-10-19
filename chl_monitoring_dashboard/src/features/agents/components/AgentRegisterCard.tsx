import { useMemo } from 'react'
import { paths } from '@/config/paths'
import { useModuleLink } from '@/features/auth/use-module-link'
import { formatNumber, formatShortDateTime } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import type { Column } from '@/shared/ui/DataTable'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import { RowActions, type RowAction } from '@/shared/ui/RowActions'
import { assignedScopeText, organizationLabel, SCOPE_NOT_EXPOSED } from '../agents-display'
import type { AgentMetrics, AgentSummary } from '../agents.schemas'
import styles from './AgentCards.module.css'

type ModuleLink = ReturnType<typeof useModuleLink>

/** Adds the page's area to a module link. */
const withScope = (to: string, scope: string) =>
  `${to}${to.includes('?') ? '&' : '?'}scope=${encodeURIComponent(scope)}`

function columns(
  link: ModuleLink,
  scope: string,
  selectedId: string | null,
  onSelect: (agentId: string) => void,
): Column<AgentSummary>[] {
  const figure = (key: keyof AgentMetrics & string, header: string): Column<AgentSummary> => ({
    key,
    header,
    align: 'end',
    render: (row) => formatNumber(Number(row.metrics[key])),
    sortValue: (row) => Number(row.metrics[key]),
  })
  return [
    {
      key: 'agent',
      header: 'Agent',
      render: (row) => (
        <span className={styles.stack}>
          <span className={styles.nameRow}>
            <button
              type="button"
              className={styles.open}
              aria-pressed={row.id === selectedId}
              onClick={() => onSelect(row.id)}
            >
              {row.name}
            </button>
            {row.id === selectedId && <span className={styles.selectedChip}>Selected</span>}
          </span>
          <span className={styles.sub}>{row.id}</span>
        </span>
      ),
      sortValue: (row) => row.name,
    },
    {
      key: 'organization',
      header: 'Organization',
      render: (row) =>
        row.organization ?? <span className={styles.muted}>{organizationLabel(null)}</span>,
      sortValue: (row) => row.organization ?? '',
    },
    {
      key: 'scope',
      header: 'Assigned scope',
      render: (row) =>
        assignedScopeText(row) ?? <span className={styles.muted}>{SCOPE_NOT_EXPOSED}</span>,
      sortValue: (row) => assignedScopeText(row) ?? '',
    },
    figure('verifications', 'Verifications'),
    figure('violationsIssued', 'Violations'),
    figure('unresolved', 'Unresolved'),
    {
      key: 'last',
      header: 'Last recorded (WAT)',
      render: (row) =>
        row.lastRecordedAt ? (
          formatShortDateTime(row.lastRecordedAt)
        ) : (
          <span className={styles.sub}>Nothing recorded</span>
        ),
      sortValue: (row) => (row.lastRecordedAt ? Date.parse(row.lastRecordedAt) : 0),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'end',
      render: (row) => {
        const agent = `agent=${encodeURIComponent(row.id)}`
        const actions = [
          {
            label: 'View verifications',
            to: link('verifications', withScope(`${paths.verifications}?${agent}`, scope)),
          },
          {
            label: 'View violations',
            to: link('violations', withScope(`${paths.violations}?${agent}`, scope)),
          },
        ].filter((action): action is RowAction => action.to !== undefined)
        return actions.length > 0 ? (
          <RowActions label={`Actions for ${row.name}`} actions={actions} />
        ) : null
      },
    },
  ]
}

const searchText = (row: AgentSummary) =>
  `${row.name} ${row.id} ${organizationLabel(row.organization)} ${assignedScopeText(row) ?? ''}`

/**
 * "Agent register": every agent in view — identity, the scope CHL assigns
 * them and what they recorded in the period. Listed by agent ID, never ranked;
 * a name opens that agent's activity below.
 */
export function AgentRegisterCard({
  agents,
  scope,
  scopeName,
  selectedId,
  onSelect,
}: {
  agents: readonly AgentSummary[]
  /** The area's id, for links into the modules. */
  scope: string
  /** "National", "Lagos state". */
  scopeName: string
  selectedId: string | null
  onSelect(agentId: string): void
}) {
  const link = useModuleLink()
  const tableColumns = useMemo(
    () => columns(link, scope, selectedId, onSelect),
    [link, scope, selectedId, onSelect],
  )

  return (
    <DashboardCard
      title="Agent register"
      subtitle={`${scopeName} · identity, assigned scope and recorded activity`}
      icon="agents/card-agents.svg"
      bodyClassName={styles.body}
      footer={
        <p className={styles.footer}>
          Counts of recorded activity — no scores, rankings, attendance, shifts or payroll. Agent
          accounts are created and administered in CHL, not here.
        </p>
      }
    >
      {agents.length === 0 ? (
        <p className={styles.empty}>No agents are assigned to or active in {scopeName}.</p>
      ) : (
        <RegisterTable
          label="Agents"
          rows={agents}
          columns={tableColumns}
          rowKey={(row) => row.id}
          searchText={searchText}
        />
      )}
    </DashboardCard>
  )
}
