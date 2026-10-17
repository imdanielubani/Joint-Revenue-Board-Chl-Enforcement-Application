import { describe, expect, it } from 'vitest'
import { niceTicks, pointX } from './chart-scale'

describe('niceTicks', () => {
  it('uses round, whole-number steps from zero', () => {
    expect(niceTicks(5)).toEqual([0, 1, 2, 3, 4, 5])
    expect(niceTicks(45)).toEqual([0, 10, 20, 30, 40, 50])
    expect(niceTicks(130)).toEqual([0, 50, 100, 150])
  })

  it('still draws an axis when there is nothing to show', () => {
    expect(niceTicks(0)).toEqual([0, 1, 2, 3, 4, 5])
  })
})

describe('pointX', () => {
  it('spreads points edge to edge, and centres a single one', () => {
    expect(pointX(0, 3)).toBe(0)
    expect(pointX(2, 3)).toBe(1)
    expect(pointX(0, 1)).toBe(0.5)
  })
})
