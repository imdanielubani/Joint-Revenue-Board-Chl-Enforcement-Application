import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SosCard, OpenSosAlert } from './SosCard'

describe('SosCard', () => {
  it('says when CHL does not provide SOS notifications', () => {
    render(<SosCard sos={null} onSelect={() => {}} />)
    expect(screen.getByText(/CHL does not provide SOS notifications yet/)).toBeInTheDocument()
  })

  it('says when there is nothing to show', () => {
    render(<SosCard sos={{ open: 0, items: [] }} onSelect={() => {}} />)
    expect(screen.getByText(/No SOS was received in this window/)).toBeInTheDocument()
  })

  it('shows no alert while no SOS is open', () => {
    const { container } = render(<OpenSosAlert sos={{ open: 0, items: [] }} onSelect={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })
})
