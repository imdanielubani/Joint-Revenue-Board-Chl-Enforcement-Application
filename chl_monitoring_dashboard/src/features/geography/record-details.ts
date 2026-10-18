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
import { formatDateTime, formatDelay, formatNumber } from '@/shared/lib/format'
import type { StatusTone } from '@/shared/ui/StatusLabel'
import type {
  EnforcementPoint,
  EvidenceRecord,
  NoticeRecord,
  VerificationRecord,
  ViolationRecord,
} from './geography.schemas'

type ModuleLink = ReturnType<typeof useModuleLink>

/** One underlying record, opened on the page: what it is, everything known about it, where to go next. */
export interface RecordDetails {
  /** Unique across kinds, so the panel resets when another record opens. */
  key: string
  kind: string
  title: string
  status?: { tone: StatusTone; label: string; icon?: string } | undefined
  facts: { term: string; value: string }[]
  /** Into the modules, only where the user's role allows. */
  links: { label: string; to: string }[]
}

/** The scope's records, for what a record is linked to. */
export interface RecordsContext {
  link: ModuleLink
  verifications: readonly VerificationRecord[]
  violations: readonly ViolationRecord[]
  notices: readonly NoticeRecord[]
  evidence: readonly EvidenceRecord[]
}

/** "6.58712, 3.37968"; a recorded position, five decimal places (about a metre). */
export const gpsText = (position: { lat: number; lng: number } | null) =>
  position ? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}` : 'Not captured'

const place = (location: { name: string; area: string; code: string }) =>
  [location.name, location.area, location.code].filter(Boolean).join(' · ')

const links = (entries: { label: string; to: string | undefined }[]) =>
  entries.flatMap((entry) => (entry.to ? [{ label: entry.label, to: entry.to }] : []))

export function verificationDetails(row: VerificationRecord, ctx: RecordsContext): RecordDetails {
  const violation = ctx.violations.find((entry) => entry.verificationReference === row.reference)
  return {
    key: `verification:${row.id}`,
    kind: 'Verification',
    title: row.reference,
    status: row.result
      ? { ...outcomeStyle(row.result), label: outcomeLabel(row.result) }
      : undefined,
    facts: [
      { term: 'Vehicle plate', value: row.plate },
      { term: 'Method', value: row.method ? methodTag(row.method) : 'Not supplied' },
      { term: 'Agent', value: `${row.agent.name} · ${row.agent.id}` },
      { term: 'Location', value: place(row.location) },
      { term: 'Recorded', value: formatDateTime(row.recordedAt) },
      {
        term: 'Received by CHL',
        value: row.receivedAt
          ? `${formatDateTime(row.receivedAt)} (${formatDelay(row.recordedAt, row.receivedAt)})`
          : 'Not supplied',
      },
      {
        term: 'Checked',
        value:
          [
            row.source ? sourceLabel(row.source) : null,
            row.syncStatus ? syncStatusLabel(row.syncStatus) : null,
          ]
            .filter(Boolean)
            .join(' · ') || 'Not supplied',
      },
      { term: 'Recorded GPS', value: gpsText(row.position) },
      {
        term: 'Violation',
        value: violation ? `${violation.id} · ${violation.category}` : 'None issued',
      },
    ],
    links: links([
      {
        label: 'Open in verifications',
        to: ctx.link('verifications', `${paths.verifications}?ref=${row.reference}`),
      },
      {
        label: 'Vehicle history',
        to: ctx.link('verifications', `${paths.verifications}?plate=${row.plate}`),
      },
      {
        label: 'Open the case',
        to: violation
          ? ctx.link('violations', `${paths.violations}?case=${violation.id}`)
          : undefined,
      },
    ]),
  }
}

export function violationDetails(row: ViolationRecord, ctx: RecordsContext): RecordDetails {
  const notice = ctx.notices.find((entry) => entry.violationId === row.id)
  const evidence = ctx.evidence.find((entry) => entry.violationId === row.id)
  return {
    key: `violation:${row.id}`,
    kind: 'Violation',
    title: row.id,
    status: { tone: actionStatusTone(row.status), label: actionStatusLabel(row.status) },
    facts: [
      { term: 'Vehicle plate', value: row.plate },
      { term: 'Category', value: row.category },
      { term: 'Agent', value: `${row.agent.name} · ${row.agent.id}` },
      { term: 'Location', value: place(row.location) },
      { term: 'Recorded', value: formatDateTime(row.recordedAt) },
      { term: 'Recorded GPS', value: gpsText(row.position) },
      { term: 'Verification', value: row.verificationReference },
      {
        term: 'Demand notice',
        value: notice
          ? `${notice.id} · ${notice.status === 'received' ? 'payment received' : 'payment pending'}`
          : 'None issued',
      },
      {
        term: 'Evidence',
        value: evidence
          ? `${evidence.photographs} photographs${evidence.status === 'pending' ? ' · still uploading' : ''}`
          : 'None supplied',
      },
    ],
    links: links([
      { label: 'Open the case', to: ctx.link('violations', `${paths.violations}?case=${row.id}`) },
      {
        label: 'Open the payment',
        to: notice ? ctx.link('payments', `${paths.payments}?notice=${notice.id}`) : undefined,
      },
      {
        label: 'View photographs',
        to: evidence ? ctx.link('evidence', `${paths.evidence}?record=${row.id}`) : undefined,
      },
    ]),
  }
}

export function noticeDetails(row: NoticeRecord, ctx: RecordsContext): RecordDetails {
  return {
    key: `notice:${row.id}`,
    kind: 'Demand notice',
    title: row.id,
    status:
      row.status === 'received'
        ? { tone: 'success', label: 'Payment Received' }
        : { tone: 'amber', label: 'Payment Pending' },
    facts: [
      { term: 'Vehicle plate', value: row.plate },
      { term: 'Violation', value: row.violationId },
      {
        term: 'Trip activation',
        value: row.tripActivated
          ? 'Recorded by CHL after payment'
          : 'Not recorded — payment alone does not activate a trip',
      },
      { term: 'Location', value: place(row.location) },
      { term: 'Violation recorded', value: formatDateTime(row.recordedAt) },
      { term: 'Payment updated', value: 'Not supplied by CHL' },
    ],
    links: links([
      { label: 'Open the payment', to: ctx.link('payments', `${paths.payments}?notice=${row.id}`) },
      {
        label: 'Open the case',
        to: ctx.link('violations', `${paths.violations}?case=${row.violationId}`),
      },
    ]),
  }
}

export function evidenceDetails(row: EvidenceRecord, ctx: RecordsContext): RecordDetails {
  return {
    key: `evidence:${row.id}`,
    kind: 'Evidence',
    title: row.id,
    status:
      row.status === 'received'
        ? { tone: 'success', label: 'Received' }
        : { tone: 'amber', label: 'Still uploading' },
    facts: [
      { term: 'Vehicle plate', value: row.plate },
      { term: 'Violation', value: row.violationId },
      { term: 'Photographs', value: formatNumber(row.photographs) },
      { term: 'Location', value: place(row.location) },
      { term: 'Recorded', value: formatDateTime(row.recordedAt) },
      { term: 'Recorded GPS', value: gpsText(row.position) },
    ],
    links: links([
      {
        label: 'View photographs',
        to: ctx.link('evidence', `${paths.evidence}?record=${row.violationId}`),
      },
      {
        label: 'Open the case',
        to: ctx.link('violations', `${paths.violations}?case=${row.violationId}`),
      },
    ]),
  }
}

export function agentDetails(row: AgentRow, ctx: RecordsContext): RecordDetails {
  return {
    key: `agent:${row.agentId}`,
    kind: 'Agent',
    title: row.name,
    facts: [
      { term: 'Agent ID', value: row.agentId },
      { term: 'Organization', value: row.organization },
      { term: 'Verifications', value: formatNumber(row.verifications) },
      { term: 'Violations issued', value: formatNumber(row.violationsIssued) },
      { term: 'Unresolved', value: formatNumber(row.unresolved) },
      { term: 'Escalated', value: formatNumber(row.escalated) },
      { term: 'Repeat alerts', value: formatNumber(row.repeatAlerts) },
      { term: 'Recorded in', value: row.locations },
    ],
    links: links([
      { label: 'Open the agent', to: ctx.link('agents', `${paths.agents}?agent=${row.agentId}`) },
    ]),
  }
}

export function repeatDetails(row: RepeatVehicle, ctx: RecordsContext): RecordDetails {
  return {
    key: `repeat:${row.plate}`,
    kind: 'Repeat-vehicle alert',
    title: row.plate,
    status: {
      tone: row.followUp === 'none' ? 'amber' : 'neutral',
      label: followUpLabel(row.followUp),
    },
    facts: [
      { term: 'Qualifying reports', value: formatNumber(row.reports) },
      { term: 'Agents reporting', value: formatNumber(row.agents) },
      { term: 'Area', value: row.area },
    ],
    links: links([
      {
        label: 'View vehicle reports',
        to: ctx.link('violations', `${paths.violations}?plate=${row.plate}`),
      },
    ]),
  }
}

export function locationDetails(row: EnforcementPoint, ctx: RecordsContext): RecordDetails {
  return {
    key: `location:${row.id}`,
    kind: 'Enforcement location',
    title: row.name,
    facts: [
      { term: 'Area', value: row.area },
      { term: 'Code', value: row.code },
      { term: 'Recorded position', value: gpsText(row.position) },
      { term: 'Verifications', value: formatNumber(row.verifications) },
      { term: 'Violations', value: formatNumber(row.violations) },
      { term: 'Agents', value: formatNumber(row.agents) },
      {
        term: 'Last recorded',
        value: row.lastRecordedAt ? formatDateTime(row.lastRecordedAt) : 'Nothing recorded yet',
      },
    ],
    links: links([
      {
        label: 'Open its verifications',
        to: ctx.link('verifications', `${paths.verifications}?scope=${row.id}`),
      },
    ]),
  }
}
