import { useId, useMemo, useState } from 'react'
import { useModuleLink } from '@/features/auth/use-module-link'
import {
  evidenceColumns,
  noticeColumns,
  verificationColumns,
  violationColumns,
} from '@/features/geography/components/record-columns'
import { RecordDetailsPanel } from '@/features/geography/components/RecordDetailsPanel'
import {
  evidenceDetails,
  noticeDetails,
  verificationDetails,
  violationDetails,
  type RecordDetails,
  type RecordsContext,
} from '@/features/geography/record-details'
import {
  actionStatusLabel,
  actionStatusTone,
  outcomeLabel,
  outcomeStyle,
} from '@/features/overview/overview-display'
import { VERIFICATION_OUTCOMES } from '@/features/overview/overview.schemas'
import { assetUrl } from '@/shared/lib/asset-url'
import { formatNumber } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import { SegmentedTabs } from '@/shared/ui/SegmentedTabs'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import { panelId, tabId } from '@/shared/ui/tab-ids'
import type { AgentActivity } from '../agents.schemas'
import styles from './AgentCards.module.css'

/** The agent's records, for what each record is linked to. */
function useRecordsContext(activity: AgentActivity): RecordsContext {
  const link = useModuleLink()
  return useMemo(() => ({ link, ...activity.records }), [link, activity.records])
}

/* ------------------------------------------------------------ Verification activity */

/**
 * "Verification activity": the agent's verification records and what each
 * found. Every result stays distinct; choosing one lists only its records.
 */
export function VerificationActivityCard({ activity }: { activity: AgentActivity }) {
  const ctx = useRecordsContext(activity)
  const [result, setResult] = useState<string | null>(null)
  const [details, setDetails] = useState<RecordDetails | null>(null)
  const { outcomes, verifications: total } = activity.agent.metrics

  // Every known result, then any CHL adds later, each with its count.
  const counts = new Map(outcomes.map((entry) => [entry.outcome, entry.count]))
  const known = VERIFICATION_OUTCOMES as readonly string[]
  const results = [
    ...VERIFICATION_OUTCOMES.map((outcome) => ({ outcome, count: counts.get(outcome) ?? 0 })),
    ...outcomes.filter((entry) => !known.includes(entry.outcome)),
  ]
  const rows = useMemo(
    () =>
      result === null
        ? activity.records.verifications
        : activity.records.verifications.filter((record) => record.result === result),
    [activity.records.verifications, result],
  )
  const columns = useMemo(
    () =>
      verificationColumns(ctx.link, (row) => setDetails(verificationDetails(row, ctx)), {
        withAgent: false,
      }),
    [ctx],
  )
  const choose = (next: string | null) => {
    setResult(next)
    setDetails(null)
  }

  return (
    <DashboardCard
      title="Verification activity"
      subtitle="The agent’s verification records and their results"
      icon="overview/card-method.svg"
      bodyClassName={styles.body}
    >
      <div className={styles.resultFilters} role="group" aria-label="Verification results">
        <button
          type="button"
          className={styles.resultChip}
          aria-pressed={result === null}
          onClick={() => choose(null)}
        >
          All results
          <span className={styles.chipCount}>{formatNumber(total)}</span>
        </button>
        {results.map((entry) => {
          const style = outcomeStyle(entry.outcome)
          return (
            <button
              key={entry.outcome}
              type="button"
              className={styles.resultChip}
              aria-pressed={result === entry.outcome}
              disabled={entry.count === 0}
              onClick={() => choose(entry.outcome)}
            >
              {style.icon && <img src={assetUrl(style.icon)} alt="" width={13} height={13} />}
              {outcomeLabel(entry.outcome)}
              <span className={styles.chipCount}>{formatNumber(entry.count)}</span>
            </button>
          )
        })}
      </div>

      {details && (
        <RecordDetailsPanel key={details.key} details={details} onClose={() => setDetails(null)} />
      )}
      <RegisterTable
        key={result ?? 'all'}
        label="Verification records"
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        searchText={(row) =>
          `${row.reference} ${row.plate} ${row.location.name} ${row.location.area} ${row.result ? outcomeLabel(row.result) : ''}`
        }
      />
      <p className={styles.small}>
        Counts are verification outcomes, not unique trips or vehicles.
      </p>
    </DashboardCard>
  )
}

/* ------------------------------------------------------------ Enforcement activity */

type EnforcementView = 'violations' | 'notices' | 'evidence'

/**
 * "Enforcement activity": the violations the agent issued with their action
 * status, the demand notices that followed and the evidence they submitted.
 */
export function EnforcementActivityCard({ activity }: { activity: AgentActivity }) {
  const ctx = useRecordsContext(activity)
  const idBase = useId()
  const [view, setViewState] = useState<EnforcementView>('violations')
  const [details, setDetails] = useState<RecordDetails | null>(null)
  const setView = (next: EnforcementView) => {
    setViewState(next)
    setDetails(null)
  }
  const { violations, notices, evidence } = activity.records

  const columns = useMemo(
    () => ({
      violations: violationColumns(ctx.link, (row) => setDetails(violationDetails(row, ctx)), {
        withAgent: false,
      }),
      notices: noticeColumns(ctx.link, (row) => setDetails(noticeDetails(row, ctx))),
      evidence: evidenceColumns(ctx.link, (row) => setDetails(evidenceDetails(row, ctx))),
    }),
    [ctx],
  )
  // How many of the agent's violations are at each action status, in the order first seen.
  const statuses = useMemo(() => {
    const counts = new Map<string, number>()
    for (const violation of violations) {
      counts.set(violation.status, (counts.get(violation.status) ?? 0) + 1)
    }
    return [...counts]
  }, [violations])

  return (
    <DashboardCard
      title="Enforcement activity"
      subtitle="Violations issued, demand notices and evidence submitted, with action status"
      icon="overview/card-violations.svg"
      bodyClassName={styles.body}
    >
      <SegmentedTabs<EnforcementView>
        idBase={idBase}
        label="Enforcement records to show"
        tabs={[
          { id: 'violations', label: 'Violations issued', count: violations.length },
          { id: 'notices', label: 'Demand notices', count: notices.length },
          { id: 'evidence', label: 'Evidence submitted', count: evidence.length },
        ]}
        value={view}
        onChange={setView}
        className={styles.tabs}
      />
      <div
        id={panelId(idBase)}
        role="tabpanel"
        aria-labelledby={tabId(idBase, view)}
        className={styles.body}
      >
        {view === 'violations' && statuses.length > 0 && (
          <p className={styles.statusSummary}>
            <span className={styles.small}>Action status</span>
            {statuses.map(([status, count]) => (
              <StatusLabel key={status} tone={actionStatusTone(status)}>
                {`${actionStatusLabel(status)} · ${count}`}
              </StatusLabel>
            ))}
          </p>
        )}
        {details && (
          <RecordDetailsPanel
            key={details.key}
            details={details}
            onClose={() => setDetails(null)}
          />
        )}
        {view === 'violations' && (
          <RegisterTable
            key={view}
            label="Violations issued"
            rows={violations}
            columns={columns.violations}
            rowKey={(row) => row.id}
            searchText={(row) =>
              `${row.id} ${row.plate} ${row.category} ${row.location.name} ${row.location.area} ${row.noticeId ?? ''}`
            }
          />
        )}
        {view === 'notices' && (
          <RegisterTable
            key={view}
            label="Demand notices"
            rows={notices}
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
            label="Evidence submitted"
            rows={evidence}
            columns={columns.evidence}
            rowKey={(row) => row.id}
            searchText={(row) =>
              `${row.id} ${row.plate} ${row.violationId} ${row.location.name} ${row.location.area}`
            }
          />
        )}
      </div>
      <p className={styles.small}>
        Payment received and trip activated are distinct outcomes; evidence still uploading from a
        device is marked as such.
      </p>
    </DashboardCard>
  )
}
