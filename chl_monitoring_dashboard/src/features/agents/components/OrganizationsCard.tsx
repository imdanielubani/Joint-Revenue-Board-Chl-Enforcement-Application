import { useMemo } from 'react'
import { plural } from '@/features/overview/overview-display'
import { formatNumber } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import type { Column } from '@/shared/ui/DataTable'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import { organizationLabel, organizationsOf, type OrganizationSummary } from '../agents-display'
import type { AgentSummary } from '../agents.schemas'
import styles from './AgentCards.module.css'

type Figure = Exclude<keyof OrganizationSummary, 'name'>

function columns(
  selected: string | null,
  onSelect: (organization: string) => void,
): Column<OrganizationSummary>[] {
  const figure = (key: Figure, header: string): Column<OrganizationSummary> => ({
    key,
    header,
    align: 'end',
    render: (row) => formatNumber(row[key]),
    sortValue: (row) => row[key],
  })
  return [
    {
      key: 'name',
      header: 'Vendor / organization',
      render: ({ name }) =>
        name === null ? (
          <span className={styles.sub}>{organizationLabel(null)}</span>
        ) : (
          <span className={styles.nameRow}>
            <button
              type="button"
              className={styles.open}
              aria-pressed={name === selected}
              onClick={() => onSelect(name)}
            >
              {name}
            </button>
            {name === selected && <span className={styles.selectedChip}>Filtered</span>}
          </span>
        ),
      sortValue: (row) => row.name ?? '',
    },
    figure('agents', 'Agents'),
    figure('active', 'With activity'),
    figure('verifications', 'Verifications'),
    figure('violationsIssued', 'Violations'),
    figure('unresolved', 'Unresolved'),
    figure('escalated', 'Escalated'),
  ]
}

const searchText = (row: OrganizationSummary) => organizationLabel(row.name)

/**
 * "Organizations": the agents in view grouped by vendor or organization, with
 * the same recorded figures. Choosing one narrows the page to its agents.
 */
export function OrganizationsCard({
  agents,
  selected,
  onSelect,
}: {
  agents: readonly AgentSummary[]
  /** The organization the page is narrowed to, if any. */
  selected: string | null
  onSelect(organization: string): void
}) {
  const rows = useMemo(() => organizationsOf(agents), [agents])
  const tableColumns = useMemo(() => columns(selected, onSelect), [selected, onSelect])

  return (
    <DashboardCard
      title="Organizations"
      subtitle={`${plural(rows.filter((row) => row.name !== null).length, 'vendor or organization', 'vendors or organizations')} recorded for these agents`}
      icon="agents/card-organization.svg"
      bodyClassName={styles.body}
      footer={
        <p className={styles.footer}>
          As CHL records each agent’s vendor or organization. Figures are the agents’ recorded
          activity added up; no organization scores or targets.
        </p>
      }
    >
      {rows.length === 0 ? (
        <p className={styles.empty}>No agents in view.</p>
      ) : (
        <RegisterTable
          label="Organizations"
          rows={rows}
          columns={tableColumns}
          rowKey={(row) => row.name ?? 'none'}
          searchText={searchText}
        />
      )}
    </DashboardCard>
  )
}
