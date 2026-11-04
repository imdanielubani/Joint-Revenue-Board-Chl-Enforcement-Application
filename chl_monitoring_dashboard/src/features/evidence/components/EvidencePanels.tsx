import { useMemo } from 'react'
import { paths } from '@/config/paths'
import { useModuleLink } from '@/features/auth/use-module-link'
import { Stack } from '@/features/geography/components/RecordCells'
import cells from '@/features/geography/components/RecordColumns.module.css'
import { formatShortDateTime } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import type { Column } from '@/shared/ui/DataTable'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import type { TripRelated } from '@/features/trips/components/TripRelatedDialog'
import { RowActions, type RowCommand } from '@/shared/ui/RowActions'
import {
  GROUP_LABELS,
  photographsText,
  photosIn,
  placeText,
  searchTextOf,
  viewsText,
  type EvidenceGroup,
} from '../evidence-display'
import type { EnforcementNote, EvidenceEntry } from '../evidence.schemas'
import styles from './EvidenceCards.module.css'

type ModuleLink = ReturnType<typeof useModuleLink>

/** The records a row leads to, each opening in a popup on the page, where the user may open its module. */
const relatedFor = (
  link: ModuleLink,
  entry: EvidenceEntry,
  onRelated: (related: TripRelated) => void,
): RowCommand[] =>
  [
    {
      label: 'Open the case',
      module: link('violations', paths.violations),
      related: { kind: 'case', violationId: entry.violation.id } as const,
    },
    {
      label: 'View verification',
      module: link('verifications', paths.verifications),
      related: { kind: 'verification', reference: entry.verificationReference } as const,
    },
    {
      label: 'View agent',
      module: link('agents', paths.agents),
      related: { kind: 'agent', agent: entry.agent } as const,
    },
  ].flatMap((item) =>
    item.module ? [{ label: item.label, onSelect: () => onRelated(item.related) }] : [],
  )

/**
 * A register of evidence records: all of them, or those holding vehicle or
 * E-Tag evidence, with that evidence's photographs. References are plain
 * text; a record's evidence opens from its row's actions.
 */
export function EvidencePanel({
  records,
  group,
  title,
  subtitle,
  onOpen,
  onRelated,
}: {
  records: readonly EvidenceEntry[]
  /** The kind of evidence listed; null for every record and photograph. */
  group: EvidenceGroup | null
  title: string
  subtitle: string
  onOpen(entry: EvidenceEntry): void
  /** Opens the record's case, verification or agent in a popup on the page. */
  onRelated(related: TripRelated): void
}) {
  const link = useModuleLink()
  const rows = useMemo(
    () => (group ? records.filter((entry) => photosIn(entry, group).length > 0) : records),
    [records, group],
  )
  const columns = useMemo<Column<EvidenceEntry>[]>(() => {
    const photosOf = (entry: EvidenceEntry) => (group ? photosIn(entry, group) : entry.photographs)
    return [
      {
        key: 'evidence',
        header: 'Evidence',
        render: (row) => <span className={cells.plate}>{row.id}</span>,
        sortValue: (row) => row.id,
      },
      {
        key: 'violation',
        header: 'Violation reference',
        render: (row) => <Stack main={row.violation.id} sub={row.violation.category} />,
        sortValue: (row) => row.violation.id,
      },
      {
        key: 'plate',
        header: 'Plate',
        render: (row) => <span className={cells.plate}>{row.plate}</span>,
        sortValue: (row) => row.plate,
      },
      {
        key: 'photographs',
        header: group ? GROUP_LABELS[group] : 'Photographs',
        render: (row) => {
          const photos = photosOf(row)
          return <Stack main={photographsText(photos.length)} sub={viewsText(photos)} />
        },
        sortValue: (row) => photosOf(row).length,
      },
      {
        key: 'agent',
        header: 'Agent',
        render: (row) => <Stack main={row.agent.name} sub={row.agent.id} />,
        sortValue: (row) => row.agent.name,
      },
      {
        key: 'captured',
        header: 'Captured (WAT)',
        render: (row) => (
          <Stack
            main={row.photographs[0] ? formatShortDateTime(row.photographs[0].capturedAt) : '—'}
            sub={placeText(row.location)}
          />
        ),
        sortValue: (row) => (row.photographs[0] ? Date.parse(row.photographs[0].capturedAt) : 0),
      },
      {
        key: 'notes',
        header: 'Enforcement notes',
        render: (row) =>
          row.notes.length > 0 ? (
            `${row.notes.length} ${row.notes.length === 1 ? 'note' : 'notes'}`
          ) : (
            <span className={cells.sub}>None submitted</span>
          ),
        sortValue: (row) => row.notes.length,
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'end',
        render: (row) => {
          const view: RowCommand = { label: 'View evidence', onSelect: () => onOpen(row) }
          return (
            <RowActions
              label={`Actions for ${row.id}`}
              actions={[view, ...relatedFor(link, row, onRelated)]}
            />
          )
        },
      },
    ]
  }, [group, link, onOpen, onRelated])

  return (
    <DashboardCard
      title={title}
      subtitle={subtitle}
      icon="verifications/card-register.svg"
      bodyClassName={styles.panelBody}
    >
      <RegisterTable
        label={title}
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        searchText={searchTextOf}
      />
    </DashboardCard>
  )
}

interface NoteRow {
  note: EnforcementNote
  entry: EvidenceEntry
}

const noteSearchText = (row: NoteRow) => `${row.note.text} ${searchTextOf(row.entry)}`

/** "Enforcement Notes": the notes agents submitted with their evidence. */
export function NotesPanel({
  records,
  subtitle,
  onOpen,
  onRelated,
}: {
  records: readonly EvidenceEntry[]
  subtitle: string
  onOpen(entry: EvidenceEntry): void
  /** Opens the note's case, verification or agent in a popup on the page. */
  onRelated(related: TripRelated): void
}) {
  const link = useModuleLink()
  const rows = useMemo(
    () => records.flatMap((entry) => entry.notes.map((note) => ({ note, entry }))),
    [records],
  )
  const columns = useMemo<Column<NoteRow>[]>(
    () => [
      {
        key: 'note',
        header: 'Note',
        render: (row) => <span className={styles.noteCell}>{row.note.text}</span>,
      },
      {
        key: 'violation',
        header: 'Violation reference',
        render: (row) => <Stack main={row.entry.violation.id} sub={row.entry.violation.category} />,
        sortValue: (row) => row.entry.violation.id,
      },
      {
        key: 'plate',
        header: 'Plate',
        render: (row) => <span className={cells.plate}>{row.entry.plate}</span>,
        sortValue: (row) => row.entry.plate,
      },
      {
        key: 'agent',
        header: 'Agent',
        render: (row) => <Stack main={row.note.agent.name} sub={row.note.agent.id} />,
        sortValue: (row) => row.note.agent.name,
      },
      {
        key: 'submitted',
        header: 'Submitted (WAT)',
        render: (row) => (
          <Stack
            main={formatShortDateTime(row.note.submittedAt)}
            sub={placeText(row.entry.location)}
          />
        ),
        sortValue: (row) => Date.parse(row.note.submittedAt),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'end',
        render: (row) => {
          const view: RowCommand = { label: 'View evidence', onSelect: () => onOpen(row.entry) }
          return (
            <RowActions
              label={`Actions for the note on ${row.entry.violation.id}`}
              actions={[view, ...relatedFor(link, row.entry, onRelated)]}
            />
          )
        },
      },
    ],
    [link, onOpen, onRelated],
  )
  return (
    <DashboardCard
      title="Enforcement Notes"
      subtitle={subtitle}
      icon="overview/card-recent.svg"
      bodyClassName={styles.panelBody}
    >
      <RegisterTable
        label="Enforcement notes"
        rows={rows}
        columns={columns}
        rowKey={(row) => row.note.id}
        searchText={noteSearchText}
      />
    </DashboardCard>
  )
}
