import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ContactSupport } from './ContactSupport'

describe('ContactSupport', () => {
  it('opens a support page in a new tab', () => {
    render(<ContactSupport url="https://support.example/chl" />)
    const link = screen.getByRole('link', { name: 'Contact CHL Support' })

    expect(link).toHaveAttribute('href', 'https://support.example/chl')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('opens an email to a support address', () => {
    render(<ContactSupport url="mailto:help@example.com" />)
    const link = screen.getByRole('link', { name: 'Contact CHL Support' })

    expect(link).toHaveAttribute('href', 'mailto:help@example.com')
    expect(link).not.toHaveAttribute('target')
  })
})
