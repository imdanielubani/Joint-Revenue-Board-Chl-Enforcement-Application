import { describe, expect, it } from 'vitest'
import { MODULE_KEYS } from '@/features/auth/auth.schemas'
import { MOCK_USERS } from '@/mocks/mock-users'
import { MODULES, modulesFor } from './modules'

describe('modules', () => {
  it('lists every module exactly once', () => {
    expect(MODULES.map((module) => module.key).sort()).toEqual([...MODULE_KEYS].sort())
    expect(new Set(MODULES.map((module) => module.path)).size).toBe(MODULES.length)
  })

  it('keeps menu order whatever order the backend sends', () => {
    const user = { ...MOCK_USERS[0]!, modules: ['sync' as const, 'overview' as const] }
    expect(modulesFor(user).map((module) => module.key)).toEqual(['overview', 'sync'])
  })
})
