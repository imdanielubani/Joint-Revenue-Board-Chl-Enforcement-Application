import { useId, useMemo, useState } from 'react'
import { paths } from '@/config/paths'
import { formatNumber } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import type { Column } from '@/shared/ui/DataTable'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import { RowActions, type RowAction } from '@/shared/ui/RowActions'
import { SegmentedTabs, type SegmentedTab } from '@/shared/ui/SegmentedTabs'
import { panelId, tabId } from '@/shared/ui/tab-ids'
import type { AgentRow, LocationRow, Overview } from '../overview.schemas'
import { useModuleLink } from '@/features/auth/use-module-link'
import styles from './PerformanceCard.module.css'

type View = 'agents' | 'locations' | 'corporate'

interface OrganizationRow {
  organization: string
  agents: number
  verifications: number
  violationsIssued: number
  unresolved: number
  escalated: number
  repeatAlerts: number
}

const NOTES: Record<View, string> = {
  agents:
    'Agents are matched by recorded agent ID, never by name alone. Related repeat alerts are linked through cases issued by that agent, not assumed reporter identities.',
  locations:
    'Locations are matched by their recorded code. Activity is what agents recorded there, not live positions.',
  corporate:
    'Organizations are as recorded in CHL. Each row adds up the same enforcement metrics across that organization’s agents.',
}

interface Props {
  agents: Overview['agents']
  locations: Overview['locations']
  /** False for users who cover single enforcement points: they see agents only. */
  showLocations: boolean
}

/** "Enforcement performance & corporate monitoring": the same metrics by agent, location or organization. */
export function PerformanceCard({ agents, locations, showLocations }: Props) {
  const idBase = useId()
  const [view, setView] = useState<View>('agents')
  const current = showLocations ? view : 'agents'

  const tabs: SegmentedTab<View>[] = [
    { id: 'agents', label: 'By agent', count: agents.length },
    ...(showLocations
      ? ([
          { id: 'locations', label: 'By location', count: locations.length },
          { id: 'corporate', label: 'Corporate summary' },
        ] as const)
      : []),
  ]

  return (
    <DashboardCard
      title="Enforcement performance & corporate monitoring"
      subtitle="The same enforcement metrics across permitted agents and locations — no scores, revenue targets or forecasts"
      icon="overview/card-performance.svg"
      bodyClassName={styles.body}
    >
      <SegmentedTabs<View>
        idBase={idBase}
        label="Group the metrics"
        tabs={tabs}
        value={current}
        onChange={setView}
      />
      <div
        id={panelId(idBase)}
        role="tabpanel"
        aria-labelledby={tabId(idBase, current)}
        className={styles.panel}
      >
        {current === 'agents' && <AgentRegister rows={agents} />}
        {current === 'locations' && <LocationRegister rows={locations} />}
        {current === 'corporate' && <CorporateRegister agents={agents} />}
      </div>
      <p className={styles.note}>{NOTES[current]}</p>
    </DashboardCard>
  )
}

const count = (value: number) => formatNumber(value)

/** The columns every grouping shares, after its first one. */
function metricColumns<
  T extends {
    verifications: number
    violationsIssued: number
    unresolved: number
    escalated: number
    repeatAlerts: number
  },
>(): Column<T>[] {
  return [
    {
      key: 'verifications',
      header: 'Verifications',
      align: 'center',
      render: (row) => count(row.verifications),
      sortValue: (row) => row.verifications,
    },
    {
      key: 'violationsIssued',
      header: 'Violations issued',
      align: 'center',
      render: (row) => count(row.violationsIssued),
      sortValue: (row) => row.violationsIssued,
    },
    {
      key: 'unresolved',
      header: 'Unresolved',
      align: 'center',
      render: (row) => count(row.unresolved),
      sortValue: (row) => row.unresolved,
    },
    {
      key: 'escalated',
      header: 'Escalated',
      align: 'center',
      render: (row) => count(row.escalated),
      sortValue: (row) => row.escalated,
    },
    {
      key: 'repeatAlerts',
      header: 'Repeat alerts',
      align: 'center',
      render: (row) => count(row.repeatAlerts),
      sortValue: (row) => row.repeatAlerts,
    },
  ]
}

const agentSearch = (row: AgentRow) =>
  `${row.name} ${row.agentId} ${row.organization} ${row.locations}`

function AgentRegister({ rows }: { rows: readonly AgentRow[] }) {
  const link = useModuleLink()
  const columns = useMemo<Column<AgentRow>[]>(
    () => [
      {
        key: 'agent',
        header: 'Agent',
        render: (row) => (
          <span className={styles.who}>
            <span className={styles.whoName}>{row.name}</span>
            <span className={styles.whoId}>{row.agentId}</span>
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
      ...metricColumns<AgentRow>(),
      {
        key: 'locations',
        header: 'Locations',
        align: 'center',
        render: (row) => row.locations,
        sortValue: (row) => row.locations,
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'end',
        render: (row) => {
          const actions = [
            { label: 'View agent', to: link('agents', `${paths.agents}?agent=${row.agentId}`) },
            {
              label: 'View violations issued',
              to: link('violations', `${paths.violations}?agent=${row.agentId}`),
            },
          ].filter((action): action is RowAction => action.to !== undefined)
          return actions.length > 0 ? (
            <RowActions label={`Actions for ${row.name}`} actions={actions} />
          ) : null
        },
      },
    ],
    [link],
  )
  return (
    <RegisterTable
      label="Enforcement metrics by agent"
      rows={rows}
      columns={columns}
      rowKey={(row) => row.agentId}
      searchText={agentSearch}
    />
  )
}

const locationSearch = (row: LocationRow) => `${row.name} ${row.code} ${row.area}`

function LocationRegister({ rows }: { rows: readonly LocationRow[] }) {
  const link = useModuleLink()
  const columns = useMemo<Column<LocationRow>[]>(
    () => [
      {
        key: 'location',
        header: 'Location',
        render: (row) => (
          <span className={styles.who}>
            <span className={styles.whoName}>{row.name}</span>
            <span className={styles.whoId}>{row.code}</span>
          </span>
        ),
        sortValue: (row) => row.name,
      },
      { key: 'area', header: 'Area', render: (row) => row.area, sortValue: (row) => row.area },
      {
        key: 'agents',
        header: 'Agents',
        align: 'center',
        render: (row) => count(row.agents),
        sortValue: (row) => row.agents,
      },
      ...metricColumns<LocationRow>(),
      {
        key: 'actions',
        header: 'Actions',
        align: 'end',
        render: (row) => {
          const to = link('geography', `${paths.geography}?scope=${row.id}`)
          return to ? (
            <RowActions
              label={`Actions for ${row.name}`}
              actions={[{ label: 'Open on map', to }]}
            />
          ) : null
        },
      },
    ],
    [link],
  )
  return (
    <RegisterTable
      label="Enforcement metrics by location"
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      searchText={locationSearch}
    />
  )
}

const organizationSearch = (row: OrganizationRow) => row.organization

/** Adds up the agents' metrics for each organization. */
function byOrganization(agents: readonly AgentRow[]): OrganizationRow[] {
  const rows = new Map<string, OrganizationRow>()
  for (const agent of agents) {
    const row = rows.get(agent.organization) ?? {
      organization: agent.organization,
      agents: 0,
      verifications: 0,
      violationsIssued: 0,
      unresolved: 0,
      escalated: 0,
      repeatAlerts: 0,
    }
    row.agents += 1
    row.verifications += agent.verifications
    row.violationsIssued += agent.violationsIssued
    row.unresolved += agent.unresolved
    row.escalated += agent.escalated
    row.repeatAlerts += agent.repeatAlerts
    rows.set(agent.organization, row)
  }
  return [...rows.values()]
}

const ORGANIZATION_COLUMNS: Column<OrganizationRow>[] = [
  {
    key: 'organization',
    header: 'Organization',
    render: (row) => <span className={styles.whoName}>{row.organization}</span>,
    sortValue: (row) => row.organization,
  },
  {
    key: 'agents',
    header: 'Agents',
    align: 'center',
    render: (row) => count(row.agents),
    sortValue: (row) => row.agents,
  },
  ...metricColumns<OrganizationRow>(),
]

function CorporateRegister({ agents }: { agents: readonly AgentRow[] }) {
  const rows = useMemo(() => byOrganization(agents), [agents])
  return (
    <RegisterTable
      label="Enforcement metrics by organization"
      rows={rows}
      columns={ORGANIZATION_COLUMNS}
      rowKey={(row) => row.organization}
      searchText={organizationSearch}
    />
  )
}
