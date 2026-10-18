import { describe, expect, it } from 'vitest'
import type { User } from '@/features/auth/auth.schemas'
import { MOCK_AREAS } from '@/mocks/mock-areas-api'
import { MOCK_USERS } from '@/mocks/mock-users'
import { coversSeveralLocations, scopeOptions } from './scope-options'

const admin = MOCK_USERS[0]!
const withScopes = (scopes: User['scopes']): User => ({ ...admin, scopes })

describe('scopeOptions', () => {
  it('gives a national user the national overview until the area tree loads', () => {
    expect(scopeOptions(admin)).toEqual([
      { value: 'ng', label: 'National overview', name: 'National', level: 'national', depth: 0 },
    ])
  })

  it('then lists every area in the country, in tree order', () => {
    const options = scopeOptions(admin, MOCK_AREAS)
    expect(options).toHaveLength(MOCK_AREAS.length)
    expect(options.slice(0, 4).map((option) => [option.label, option.depth])).toEqual([
      ['National overview', 0],
      ['South West region overview', 1],
      ['Lagos state overview', 2],
      ['Ikeja LGA overview', 3],
    ])
  })

  it('limits a user to the areas within their own', () => {
    const lagos = withScopes([{ level: 'state', id: 'la', name: 'Lagos' }])
    expect(scopeOptions(lagos, MOCK_AREAS).map((option) => option.name)).toEqual([
      'Lagos state',
      'Ikeja LGA',
      'Ojota ward',
      'Lagos Zone 1',
      'Ojota enforcement point',
      'Ikeja Gate 3',
      'Apapa LGA',
      'Apapa Port Rd',
    ])
  })

  it('keeps an assigned area CHL does not list', () => {
    const user = withScopes([{ level: 'state', id: 'xx', name: 'Unlisted' }])
    expect(scopeOptions(user, MOCK_AREAS).map((option) => option.label)).toEqual([
      'Unlisted state overview',
    ])
  })
})

describe('coversSeveralLocations', () => {
  it('is false only for a single enforcement point', () => {
    expect(coversSeveralLocations('enforcement_point')).toBe(false)
    expect(coversSeveralLocations('lga')).toBe(true)
    expect(coversSeveralLocations('national')).toBe(true)
  })
})
