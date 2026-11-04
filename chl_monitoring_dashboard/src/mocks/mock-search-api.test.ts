import { describe, expect, it } from 'vitest'
import { searchResultsSchema } from '@/features/search/search.schemas'
import { summarizeSearch } from './mock-search-api'

const NOW = Date.parse('2026-10-18T12:00:00+01:00')
const search = (query: string, scope = 'ng') => summarizeSearch({ query, scope }, NOW)

describe('summarizeSearch', () => {
  it('finds a vehicle by its plate however it is typed, counting its verifications', () => {
    const result = search('kja 482xy')
    expect(searchResultsSchema.safeParse(result).success).toBe(true)
    expect(result.vehicles.map((vehicle) => vehicle.plate)).toEqual(['KJA-482-XY'])
    expect(result.vehicles[0]!.verifications).toBeGreaterThan(1)
  })

  it('finds agents by name or ID', () => {
    expect(search('tunde').agents.map((agent) => agent.id)).toEqual(['JRB-AG-0142'])
    expect(search('AG-014').agents).toHaveLength(5)
  })

  it('finds violations and payment requests by reference, each once', () => {
    const { violations } = search('VIO-30')
    expect(violations.length).toBeGreaterThan(0)
    const ids = violations.map((violation) => violation.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^VIO-30/)

    const { payments } = search('DN-30')
    expect(payments.length).toBeGreaterThan(0)
    for (const payment of payments) {
      expect(payment.id).toMatch(/^DN-30/)
      expect(payment.violationId).toMatch(/^VIO-/)
    }
  })

  it('finds a verification and a trip by reference', () => {
    const all = search('VR-').verifications
    const reference = all[0]!.reference
    expect(search(reference).verifications.map((record) => record.reference)).toEqual([reference])
    const trip = all.find((record) => record.tripId)!.tripId!
    expect(search(trip).trips.map((found) => found.reference)).toEqual([trip])
  })

  it('searches only the area given', () => {
    const national = search('VR-').verifications.length
    const lagos = search('VR-', 'la').verifications.length
    expect(lagos).toBeGreaterThan(0)
    expect(lagos).toBeLessThan(national)
  })

  it('returns nothing for a query too short to search', () => {
    const result = search('k')
    expect(result.vehicles).toEqual([])
    expect(result.agents).toEqual([])
    expect(result.verifications).toEqual([])
  })
})
