import type { EvidenceApi } from '@/features/evidence/evidence.api'
import type {
  EvidenceEntry,
  EvidenceFilters,
  EvidenceMonitoring,
  PhotoKind,
  VehiclePhotoKind,
} from '@/features/evidence/evidence.schemas'
import { lagosDay } from '@/shared/lib/dates'
import { delay } from './delay'
import { MOCK_AGENTS } from './mock-agent-list'
import { agentOf, numberOf, photographsOf, placeOf } from './mock-geography-api'
import { pointsWithin } from './mock-overview-api'
import { mockRecords, unit, type MockRecord } from './mock-records'
import { vehicleIdOf } from './mock-vehicles'

/** The vehicle photographs in the order taken; a fifth is the vehicle's other side. */
const VEHICLE_ORDER: readonly VehiclePhotoKind[] = ['front', 'rear', 'side', 'haulage_bay', 'side']

/** The E-Tag photograph a violation's category calls for, if any. */
function etagKindOf(category: string): PhotoKind | null {
  if (category === 'No E-Tag') return 'missing_tag'
  if (category === 'Fake / Invalid E-Tag' || category === 'Tampered E-Tag') return 'invalid_tag'
  if (category === 'Tag-Vehicle Mismatch') return 'other_etag'
  return null
}

/** The note an agent submitted for each kind of violation, in the sample data. */
const SAMPLE_NOTES: Record<string, string> = {
  'No Active CHL Trip':
    'Driver could not show an active trip for this movement. Vehicle stopped at the checkpoint and the driver informed.',
  'No E-Tag': 'No E-Tag found on the vehicle after checking the windscreen and cab.',
  'Fake / Invalid E-Tag':
    'The tag on the windscreen did not read as a valid CHL tag. Photographed the tag in place.',
  'Tampered E-Tag': 'The tag casing is damaged and its edges are lifted. Photographed close up.',
  'Expired Trip': 'Driver presented a trip that had already expired.',
  'Tag-Vehicle Mismatch':
    'The tag reads for a different vehicle. Plate and tag photographed together.',
  'Refusal to Comply':
    'Driver did not stop for inspection at first; the vehicle was stopped further along.',
}

const LABELS: Record<PhotoKind, string> = {
  front: 'Front of vehicle',
  rear: 'Rear of vehicle',
  side: 'Side of vehicle',
  haulage_bay: 'Haulage bay',
  missing_tag: 'Missing E-Tag',
  invalid_tag: 'Fake / invalid E-Tag',
  other_etag: 'Other E-Tag evidence',
}

/**
 * A labelled placeholder image for a sample photograph. A real backend serves
 * the captured photograph instead; these are clearly marked as samples.
 */
function samplePhotograph(kind: PhotoKind, plate: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#26453a"/><stop offset="1" stop-color="#0f2a20"/></linearGradient></defs>
<rect width="1200" height="800" fill="url(#g)"/>
<g fill="none" stroke="#9fc4b1" stroke-width="10" stroke-linejoin="round" opacity="0.8">
<rect x="500" y="290" width="200" height="140" rx="20"/><circle cx="600" cy="360" r="40"/><path d="M555 290l18-30h54l18 30"/>
</g>
<text x="600" y="520" fill="#e3f0e8" font-family="Arial, sans-serif" font-size="44" font-weight="700" text-anchor="middle">${LABELS[kind]}</text>
<text x="600" y="580" fill="#9fc4b1" font-family="Arial, sans-serif" font-size="30" text-anchor="middle">${plate} · Sample photograph</text>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const iso = (ms: number) => new Date(ms).toISOString()

function entryOf(record: MockRecord): EvidenceEntry | null {
  const violation = record.violation
  if (!violation) return null
  const number = numberOf(violation.id)
  const count = photographsOf(violation.id)
  const etag = etagKindOf(violation.category)
  const kinds: PhotoKind[] = [...(etag ? [etag] : []), ...VEHICLE_ORDER].slice(0, count)
  // Evidence still uploading: the last photograph has not arrived yet.
  const pending = record.syncStatus === 'evidence_pending'
  const photographs = kinds.map((kind, index) => ({
    id: `PH-${number}-${index + 1}`,
    kind,
    url: pending && index === kinds.length - 1 ? null : samplePhotograph(kind, record.plate),
    capturedAt: iso(record.recordedAt + (index + 1) * 40_000),
    position: record.position,
  }))
  const agent = agentOf(record)
  const hasNote = unit(number * 13 + 7) < 0.7
  return {
    id: `EV-${number}`,
    status: pending ? 'pending' : 'received',
    violation: { id: violation.id, category: violation.category, status: violation.status },
    verificationReference: record.reference,
    plate: record.plate,
    vehicleId: vehicleIdOf(record.plate),
    agent,
    location: placeOf(record),
    photographs,
    notes: hasNote
      ? [
          {
            id: `NT-${number}`,
            text: SAMPLE_NOTES[violation.category] ?? 'Evidence captured at the enforcement point.',
            submittedAt: iso(record.recordedAt + (kinds.length + 1) * 40_000),
            agent,
          },
        ]
      : [],
  }
}

/**
 * The evidence for an area, period, agent and organization: one record per
 * violation, from the same sample records every view counts.
 */
export function summarizeEvidence(
  filters: EvidenceFilters,
  now: number = Date.now(),
): EvidenceMonitoring {
  const { from, to, agentId, organization } = filters
  const points = pointsWithin(filters.scope)
  const organizationOf = new Map(MOCK_AGENTS.map((agent) => [agent.id, agent.organization]))
  const inScope = mockRecords(lagosDay(new Date(now)), now).filter((record) =>
    points.has(record.pointId),
  )
  const records = inScope
    .filter(
      (record) =>
        record.day >= from &&
        record.day <= to &&
        (!agentId || record.agentId === agentId) &&
        (!organization || organizationOf.get(record.agentId) === organization),
    )
    .sort((a, b) => b.recordedAt - a.recordedAt)
    .flatMap((record) => entryOf(record) ?? [])
  const latest = inScope.reduce<number | null>(
    (max, record) => (max === null || record.receivedAt > max ? record.receivedAt : max),
    null,
  )
  return { latestReceivedAt: latest === null ? null : iso(latest), records }
}

/** Sample data: from the sample records. */
export const mockEvidenceApi: EvidenceApi = {
  async getMonitoring(filters) {
    await delay()
    return summarizeEvidence(filters)
  },
}
