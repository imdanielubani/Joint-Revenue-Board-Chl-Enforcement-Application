import { describe, expect, it } from 'vitest'
import {
  ETAG_PHOTO_KINDS,
  evidenceMonitoringSchema,
  VEHICLE_PHOTO_KINDS,
} from '@/features/evidence/evidence.schemas'
import { presetPeriod } from '@/features/overview/overview-period'
import { summarizeEvidence } from './mock-evidence-api'
import { summarizeGeography } from './mock-geography-api'

const NOW = Date.parse('2026-10-18T12:00:00+01:00')
const TODAY = '2026-10-18'
const filters = (scope: string, people: { agentId?: string; organization?: string } = {}) => ({
  scope,
  range: '30d' as const,
  ...presetPeriod('30d', TODAY),
  agentId: people.agentId ?? null,
  organization: people.organization ?? null,
})
const known: readonly string[] = [...VEHICLE_PHOTO_KINDS, ...ETAG_PHOTO_KINDS]

describe('summarizeEvidence', () => {
  it('returns data the schema accepts', () => {
    const result = summarizeEvidence(filters('ng'), NOW)
    expect(evidenceMonitoringSchema.safeParse(result).success).toBe(true)
    expect(result.records.length).toBeGreaterThan(0)
  })

  it('has one record per violation, with the photographs geographical monitoring counts', () => {
    const { records } = summarizeEvidence(filters('la'), NOW)
    const geography = summarizeGeography(filters('la'), NOW).records.evidence
    expect(records.map((entry) => entry.id)).toEqual(geography.map((entry) => entry.id))
    for (const entry of records) {
      const counted = geography.find((item) => item.id === entry.id)!
      expect(entry.photographs).toHaveLength(counted.photographs)
      expect(entry.status).toBe(counted.status)
      expect(entry.violation.id).toBe(counted.violationId)
    }
  })

  it('captures vehicle evidence, and E-Tag evidence where the violation concerns the tag', () => {
    const { records } = summarizeEvidence(filters('ng'), NOW)
    for (const entry of records) {
      const kinds = entry.photographs.map((photo) => photo.kind)
      for (const kind of kinds) expect(known).toContain(kind)
      expect(kinds).toContain('front')
      const tagCategory = [
        'No E-Tag',
        'Fake / Invalid E-Tag',
        'Tampered E-Tag',
        'Tag-Vehicle Mismatch',
      ]
      const hasTagPhoto = kinds.some((kind) =>
        (ETAG_PHOTO_KINDS as readonly string[]).includes(kind),
      )
      expect(hasTagPhoto).toBe(tagCategory.includes(entry.violation.category))
      if (entry.violation.category === 'No E-Tag') expect(kinds).toContain('missing_tag')
    }
  })

  it('keeps the metadata captured with each photograph, after the verification', () => {
    const { records } = summarizeEvidence(filters('ng'), NOW)
    for (const entry of records) {
      for (const photo of entry.photographs) {
        expect(Number.isNaN(Date.parse(photo.capturedAt))).toBe(false)
      }
      const times = entry.photographs.map((photo) => Date.parse(photo.capturedAt))
      expect([...times].sort((a, b) => a - b)).toEqual(times)
    }
  })

  it('shows a photograph still uploading as not yet available, never a stand-in', () => {
    const { records } = summarizeEvidence(filters('ng'), NOW)
    for (const entry of records) {
      const missing = entry.photographs.filter((photo) => photo.url === null)
      expect(missing.length > 0).toBe(entry.status === 'pending')
    }
  })

  it('narrows to one agent, whose notes are their own', () => {
    const { records } = summarizeEvidence(filters('ng', { agentId: 'JRB-AG-0142' }), NOW)
    expect(records.length).toBeGreaterThan(0)
    for (const entry of records) {
      expect(entry.agent.id).toBe('JRB-AG-0142')
      for (const note of entry.notes) expect(note.agent.id).toBe('JRB-AG-0142')
    }
  })
})
