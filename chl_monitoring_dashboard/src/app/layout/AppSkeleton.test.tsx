import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { routes } from '../routes'
import { AppSkeleton } from './AppSkeleton'

describe('the first load', () => {
  it('shows the dashboard’s frame, telling screen readers it is loading', () => {
    render(<AppSkeleton />)
    const text = screen.getByText('Loading the dashboard…')
    expect(text.closest('[aria-busy="true"]')).toHaveAttribute('role', 'status')
  })

  it('is what the router shows before the first page has loaded', () => {
    expect(routes[0]!.hydrateFallbackElement).toBeDefined()
  })
})
