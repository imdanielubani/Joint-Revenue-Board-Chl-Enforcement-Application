import { describe, expect, it } from 'vitest'
import { isSearchable, matchesQuery, normalizeQuery } from './search-match'

describe('search matching', () => {
  it('ignores case, spaces, dashes, dots and slashes', () => {
    expect(normalizeQuery(' kja 482-xy ')).toBe('KJA482XY')
    expect(normalizeQuery('Lagos / Ikeja.Gate')).toBe('LAGOSIKEJAGATE')
  })

  it('finds a plate however it is typed', () => {
    for (const query of ['KJA-482-XY', 'kja482xy', 'kja 482 xy', '482-X']) {
      expect(matchesQuery(query, 'KJA-482-XY')).toBe(true)
    }
    expect(matchesQuery('KJA-483', 'KJA-482-XY')).toBe(false)
  })

  it('finds a reference or a name in any of the values given', () => {
    expect(matchesQuery('vio30280', 'VR-24150', 'VIO-30280')).toBe(true)
    expect(matchesQuery('tunde', 'Tunde Okafor', 'JRB-AG-0142')).toBe(true)
    expect(matchesQuery('0142', null, undefined, 'JRB-AG-0142')).toBe(true)
  })

  it('searches nothing for fewer than two characters', () => {
    expect(isSearchable('')).toBe(false)
    expect(isSearchable(' k- ')).toBe(false)
    expect(isSearchable('kj')).toBe(true)
    expect(matchesQuery('k', 'KJA-482-XY')).toBe(false)
  })
})
