import { humanize } from '@/features/overview/overview-display'
import type { Open } from '@/features/overview/overview.schemas'
import {
  ETAG_PHOTO_KINDS,
  VEHICLE_PHOTO_KINDS,
  type EvidenceEntry,
  type Photograph,
  type PhotoKind,
} from './evidence.schemas'

/** The two kinds of evidence the document names (SRD 9). */
export type EvidenceGroup = 'vehicle' | 'etag'

export const GROUP_LABELS: Record<EvidenceGroup, string> = {
  vehicle: 'Vehicle evidence',
  etag: 'E-Tag evidence',
}

const PHOTO_LABELS: Record<PhotoKind, string> = {
  front: 'Front',
  rear: 'Rear',
  side: 'Side',
  haulage_bay: 'Haulage bay',
  missing_tag: 'Missing tag',
  invalid_tag: 'Fake / invalid tag',
  other_etag: 'Other relevant photograph',
}

function isKnown<K extends string>(table: Record<K, unknown>, value: string): value is K {
  return Object.hasOwn(table, value)
}

/** "Front", "Missing tag"; a kind CHL adds later is shown as it comes. */
export function photoLabel(kind: Open<PhotoKind>): string {
  return isKnown(PHOTO_LABELS, kind) ? PHOTO_LABELS[kind] : humanize(kind)
}

/** Which evidence a photograph is; a kind the dashboard does not know counts as neither. */
export function groupOf(kind: Open<PhotoKind>): EvidenceGroup | null {
  if ((VEHICLE_PHOTO_KINDS as readonly string[]).includes(kind)) return 'vehicle'
  if ((ETAG_PHOTO_KINDS as readonly string[]).includes(kind)) return 'etag'
  return null
}

export const photosIn = (entry: EvidenceEntry, group: EvidenceGroup): Photograph[] =>
  entry.photographs.filter((photo) => groupOf(photo.kind) === group)

/** "Front · Rear · Side", the views a record holds, each once, in the order taken. */
export const viewsText = (photos: readonly Photograph[]) =>
  [...new Set(photos.map((photo) => photoLabel(photo.kind)))].join(' · ')

/** "5 photographs" / "1 photograph". */
export const photographsText = (count: number) =>
  `${count} ${count === 1 ? 'photograph' : 'photographs'}`

/** "Lagos / Ojota enforcement point". */
export const placeText = (location: { name: string; area: string }) =>
  location.area ? `${location.area} / ${location.name}` : location.name

/** The text a register's search matches. */
export function searchTextOf(entry: EvidenceEntry): string {
  return [
    entry.id,
    entry.violation.id,
    entry.violation.category,
    entry.verificationReference,
    entry.plate,
    entry.agent.name,
    entry.agent.id,
    entry.location.name,
    entry.location.area,
  ].join(' ')
}
