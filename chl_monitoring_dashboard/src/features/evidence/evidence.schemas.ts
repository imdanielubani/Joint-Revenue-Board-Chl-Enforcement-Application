import { z } from 'zod'
import type { ActionStatus, Open, OverviewFilters } from '@/features/overview/overview.schemas'

const open = <T extends string>() => z.custom<Open<T>>((value) => typeof value === 'string')

/** Vehicle evidence (SRD 9): front, rear, side and haulage-bay photographs. */
export const VEHICLE_PHOTO_KINDS = ['front', 'rear', 'side', 'haulage_bay'] as const
/** E-Tag evidence (SRD 9): missing-tag, fake/invalid-tag and other relevant photographs. */
export const ETAG_PHOTO_KINDS = ['missing_tag', 'invalid_tag', 'other_etag'] as const
export type VehiclePhotoKind = (typeof VEHICLE_PHOTO_KINDS)[number]
export type EtagPhotoKind = (typeof ETAG_PHOTO_KINDS)[number]
export type PhotoKind = VehiclePhotoKind | EtagPhotoKind

const agent = z.object({ id: z.string(), name: z.string() })
const gps = z
  .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
  .nullable()

/** One photograph captured through the mobile camera, with the metadata captured with it. */
export const photographSchema = z.object({
  id: z.string(),
  kind: open<PhotoKind>(),
  /** Where the image is served; null while it is still uploading from the device. */
  url: z.string().nullable(),
  /** The capture timestamp. */
  capturedAt: z.string(),
  /** The GPS captured with the photograph (WGS 84); null when none was captured. */
  position: gps,
})

/** A note an agent submitted with the evidence. */
export const enforcementNoteSchema = z.object({
  id: z.string(),
  text: z.string(),
  submittedAt: z.string(),
  agent,
})

/**
 * The evidence captured for one violation (SRD 9): its photographs, the
 * metadata captured with them, the agent's notes, and what it relates to.
 */
export const evidenceEntrySchema = z.object({
  /** The evidence record's reference, "EV-30271". */
  id: z.string(),
  /** Received by CHL, or still uploading from the device. */
  status: open<'received' | 'pending'>(),
  violation: z.object({ id: z.string(), category: z.string(), status: open<ActionStatus>() }),
  verificationReference: z.string(),
  plate: z.string(),
  /** CHL's vehicle ID, where the plate resolved to a vehicle. */
  vehicleId: z.string().nullable(),
  agent,
  /** The enforcement location. */
  location: z.object({ id: z.string(), name: z.string(), area: z.string(), code: z.string() }),
  photographs: z.array(photographSchema),
  notes: z.array(enforcementNoteSchema),
})

export const evidenceMonitoringSchema = z.object({
  /** The latest record CHL received in scope, at any time; null when none. */
  latestReceivedAt: z.string().nullable(),
  /** The evidence captured in the area and period, newest first. */
  records: z.array(evidenceEntrySchema),
})

export type Photograph = z.infer<typeof photographSchema>
export type EnforcementNote = z.infer<typeof enforcementNoteSchema>
export type EvidenceEntry = z.infer<typeof evidenceEntrySchema>
export type EvidenceMonitoring = z.infer<typeof evidenceMonitoringSchema>

/** The area, period, agent and organization, as on the Overview. */
export type EvidenceFilters = OverviewFilters
