import { describe, expect, it } from 'vitest'
import type { User } from '@/features/auth/auth.schemas'
import { MOCK_USERS } from '@/mocks/mock-users'
import { coversSeveralLocations, scopeOptions } from './scope-options'

const admin = MOCK_USERS[0]!
const withScopes = (scopes: User['scopes']): User => ({ ...admin, scopes })

describe('scopeOptions', () => {
  it('gives a national user the national overview only', () => {
    expect(scopeOptions(admin)).toEqual([
      { value: 'national', label: 'National overview', name: 'National' },
    ])
  })

  it('lists each assigned area otherwise', () => {
    const user = withScopes([
      { level: 'state', id: 'la', name: 'Lagos' },
      { level: 'state', id: 'kn', name: 'Kano' },
    ])
    expect(scopeOptions(user).map((option) => option.label)).toEqual([
      'Lagos overview',
      'Kano overview',
    ])
  })
})

describe('coversSeveralLocations', () => {
  it('is false for a user who covers single enforcement points', () => {
    expect(
      coversSeveralLocations(withScopes([{ level: 'enforcement_point', id: 'p', name: 'Ojota' }])),
    ).toBe(false)
    expect(coversSeveralLocations(admin)).toBe(true)
  })
})
