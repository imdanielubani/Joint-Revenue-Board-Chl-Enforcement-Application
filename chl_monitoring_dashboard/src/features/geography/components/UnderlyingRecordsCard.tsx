import { useId, useMemo, useState } from 'react'
import { useModuleLink } from '@/features/auth/use-module-link'
import { outcomeLabel } from '@/features/overview/overview-display'
import type { Overview } from '@/features/overview/overview.schemas'
import type { TripRelated } from '@/features/trips/components/TripRelatedDialog'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import { SegmentedTabs } from '@/shared/ui/SegmentedTabs'
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
  locationDetails,
  noticeDetails,
  repeatDetails,
  verificationDetails,
  violationDetails,
  type RecordDetails,
  type RecordsContext,
} from '../record-details'
import { RecordDetailsPanel } from './RecordDetailsPanel'
import {
  agentColumns,
  evidenceColumns,
  locationColumns,
  noticeColumns,
  repeatColumns,
  verificationColumns,
  violationColumns,
} from './record-columns'
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
  onRelated,
}: {
  scopeName: string
  /** Opens a row's related record in its own module's popup on the page. */
  onRelated(related: TripRelated): void
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
      verifications: verificationColumns(link, (row) => setDetails(verificationDetails(row, ctx)), {
        onRelated,
      }),
      agents: agentColumns(link, (row) => setDetails(agentDetails(row, ctx)), { onRelated }),
      violations: violationColumns(link, (row) => setDetails(violationDetails(row, ctx)), {
        onRelated,
      }),
      repeat: repeatColumns(link, (row) => setDetails(repeatDetails(row, ctx)), { onRelated }),
      notices: noticeColumns(link, (row) => setDetails(noticeDetails(row, ctx))),
      evidence: evidenceColumns(link, (row) => setDetails(evidenceDetails(row, ctx))),
      locations: locationColumns((row) => setDetails(locationDetails(row, ctx))),
    }
  }, [link, records, onRelated])

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
