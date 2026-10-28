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

  it('shows each SOS with its type, or that none was supplied', () => {
    const base = {
      kind: 'sos',
      recordedAt: '2026-10-24T09:00:00.000Z',
      receivedAt: '2026-10-24T09:00:20.000Z',
      source: 'live',
      syncStatus: 'synced',
      agent: { id: 'JRB-AG-0142', name: 'Tunde Okafor' },
      location: { name: 'Ikeja Gate 3', area: 'Lagos', code: 'LOS-01' },
      plate: null,
      result: null,
      violation: null,
      payment: null,
      report: null,
      load: null,
      evidenceCount: 0,
      note: null,
    } as const
    render(
      <SosCard
        sos={{
          open: 2,
          items: [
            {
              ...base,
              id: 'sos-1',
              sos: { status: 'open', type: 'road_accident', message: null, closedAt: null },
            },
            {
              ...base,
              id: 'sos-2',
              sos: { status: 'open', type: null, message: null, closedAt: null },
            },
          ],
        }}
        onSelect={() => {}}
      />,
    )
    expect(screen.getByText('Road accident')).toHaveClass('type')
    expect(screen.getByText('Type not supplied')).toHaveClass('type')
  })
})
