import { describe, expect, it } from 'vitest'
import { arcPath, niceTicks, pointX } from './chart-scale'

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

describe('arcPath', () => {
  it('draws clockwise from twelve o’clock', () => {
    // A quarter circle: from the top to the right-hand side.
    expect(arcPath(50, 50, 40, 0, Math.PI / 2)).toBe('M 50 10 A 40 40 0 0 1 90 50')
  })

  it('uses the large arc past half a turn', () => {
    expect(arcPath(50, 50, 40, 0, Math.PI * 1.5)).toBe('M 50 10 A 40 40 0 1 1 10 50')
  })
})
