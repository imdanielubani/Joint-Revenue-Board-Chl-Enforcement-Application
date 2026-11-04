import { useMemo } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { useModuleLink } from '@/features/auth/use-module-link'
import { formatNumber, formatShortDateTime } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import type { Column } from '@/shared/ui/DataTable'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import type { TripRelated } from '@/features/trips/components/TripRelatedDialog'
import { RowActions, type RowCommand } from '@/shared/ui/RowActions'
import { assignedScopeText, organizationLabel, SCOPE_NOT_EXPOSED } from '../agents-display'
import type { AgentMetrics, AgentSummary } from '../agents.schemas'
import styles from './AgentCards.module.css'

type ModuleLink = ReturnType<typeof useModuleLink>

function columns(
  link: ModuleLink,
  agentLink: (agentId: string) => string,
  onViewDetails: (agentId: string) => void,
  onRelated: (related: TripRelated) => void,
): Column<AgentSummary>[] {
  // The figures cannot be sorted: ordering agents by them would rank agents, which
  // this module does not do (agent scoring is a future extension).
  const figure = (key: keyof AgentMetrics & string, header: string): Column<AgentSummary> => ({
    key,
    header,
    align: 'end',
    render: (row) => formatNumber(Number(row.metrics[key])),
  })
  return [
    {
      key: 'agent',
      header: 'Agent',
      render: (row) => (
        <span className={styles.stack}>
          <Link className={styles.open} to={agentLink(row.id)}>
            {row.name}
          </Link>
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
        // Each opens in a popup on this page, for users who may open that module.
        const agent = {
          id: row.id,
          name: row.name,
          organization: organizationLabel(row.organization),
        }
        const actions: RowCommand[] = [
          { label: 'View details', onSelect: () => onViewDetails(row.id) },
          ...(link('verifications', paths.verifications)
            ? [
                {
                  label: 'View verifications',
                  onSelect: () => onRelated({ kind: 'agentVerifications', agent }),
                },
              ]
            : []),
          ...(link('violations', paths.violations)
            ? [
                {
                  label: 'View violations',
                  onSelect: () => onRelated({ kind: 'agentViolations', agent }),
                },
              ]
            : []),
        ]
        return <RowActions label={`Actions for ${row.name}`} actions={actions} />
      },
    },
  ]
}

const searchText = (row: AgentSummary) =>
  `${row.name} ${row.id} ${organizationLabel(row.organization)} ${assignedScopeText(row) ?? ''}`

/**
 * "Agent register": every agent in view — identity, the scope CHL assigns
 * them and what they recorded in the period. Listed by agent ID, never ranked;
 * a name opens the agent's own page; "View details", "View verifications" and
 * "View violations" open popups on the page.
 */
export function AgentRegisterCard({
  agents,
  scopeName,
  agentLink,
  onViewDetails,
  onRelated,
}: {
  agents: readonly AgentSummary[]
  /** "National", "Lagos state". */
  scopeName: string
  /** The agent's own page. */
  agentLink(agentId: string): string
  /** Opens the agent's details in a popup. */
  onViewDetails(agentId: string): void
  /** Opens the agent's verifications or violations in a popup on the page. */
  onRelated(related: TripRelated): void
}) {
  const link = useModuleLink()
  const tableColumns = useMemo(
    () => columns(link, agentLink, onViewDetails, onRelated),
    [link, agentLink, onViewDetails, onRelated],
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
