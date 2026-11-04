import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import {
  RegisterSkeleton,
  Skeleton,
  SkeletonColumns,
  SkeletonFacts,
  SkeletonFilters,
  SkeletonList,
  SkeletonTabs,
} from './Skeleton'

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

  it('draws a list with the rows asked for', () => {
    expect(shapes(<SkeletonList rows={3} />).firstElementChild!.childElementCount).toBe(3)
  })

  it('draws a popup’s facts, and sections side by side', () => {
    expect(shapes(<SkeletonFacts rows={4} />).firstElementChild!.childElementCount).toBe(4)
    const columns = shapes(
      <SkeletonColumns columns="1fr 1fr">
        <span />
        <span />
      </SkeletonColumns>,
    ).firstElementChild as HTMLElement
    expect(columns.style.getPropertyValue('--columns')).toBe('1fr 1fr')
  })

  it('draws a register page: figures, tabs or filters, then the table', () => {
    const { container, getByText } = render(
      <RegisterSkeleton message="Loading the register…" tabs={3} filters={2} />,
    )
    expect(getByText('Loading the register…')).toBeInTheDocument()
    const sections = container.querySelector('[aria-hidden="true"]')!.children
    expect(sections).toHaveLength(3)
  })
})
