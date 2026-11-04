import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { Skeleton, SkeletonFilters, SkeletonTabs } from './Skeleton'

const shapes = (ui: ReactElement) =>
  render(<Skeleton message="Loading…">{ui}</Skeleton>).container.querySelector(
    '[aria-hidden="true"]',
  )!

describe('skeleton pieces', () => {
  it('draws a tab strip with one placeholder per tab', () => {
    expect(shapes(<SkeletonTabs count={4} />).firstElementChild!.childElementCount).toBe(4)
  })

  it('draws one placeholder per filter field', () => {
    expect(shapes(<SkeletonFilters count={5} />).firstElementChild!.childElementCount).toBe(5)
  })
})
