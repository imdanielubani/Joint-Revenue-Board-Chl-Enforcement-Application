import { describe, expect, it } from 'vitest'
import { initials } from './initials'

describe('initials', () => {
  it('uses the first and last names', () => {
    expect(initials('Daniel Ubani')).toBe('DU')
    expect(initials('  ngozi  chioma eze ')).toBe('NE')
  })

  it('uses two letters of a single name', () => {
    expect(initials('Adaeze')).toBe('AD')
  })

  it('copes with an empty name', () => {
    expect(initials('')).toBe('')
  })
})
