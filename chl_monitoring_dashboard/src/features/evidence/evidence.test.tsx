import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { presetPeriod } from '@/features/overview/overview-period'
import { summarizeEvidence } from '@/mocks/mock-evidence-api'
import { lagosDay } from '@/shared/lib/dates'
import { renderApp, signInAs } from '@/test/render-app'
import { photosIn } from './evidence-display'

const card = (title: string) => screen.findByRole('region', { name: title })
const figure = async (label: string) => {
  const figures = await screen.findByRole('list', { name: 'Headline figures' })
  return within(figures).getByText(label).closest('li')!
}
/** The rows on a register's first page, header row left out. */
const bodyRows = (table: HTMLElement) => within(table).getAllByRole('row').slice(1)

/** What the page must show nationally over the last 30 days. */
const expected = () =>
  summarizeEvidence({
    scope: 'ng',
    range: '30d',
    ...presetPeriod('30d', lagosDay()),
    agentId: null,
    organization: null,
  }).records

describe('evidence records page', () => {
  it('counts the evidence records, photographs, vehicle evidence and E-Tag evidence', async () => {
    const records = expected()
    const sum = (count: (entry: (typeof records)[number]) => number) =>
      records.reduce((total, entry) => total + count(entry), 0)
    signInAs('admin@jrb.gov.ng')
    renderApp('/evidence?range=30d')

    expect(await screen.findByRole('heading', { level: 2, name: 'Evidence records' })).toBeVisible()
    expect(await figure('Evidence records')).toHaveTextContent(String(records.length))
    expect(await figure('Photographs')).toHaveTextContent(
      String(sum((entry) => entry.photographs.length)),
    )
    expect(await figure('Vehicle evidence')).toHaveTextContent(
      String(sum((entry) => photosIn(entry, 'vehicle').length)),
    )
    expect(await figure('E-Tag evidence')).toHaveTextContent(
      String(sum((entry) => photosIn(entry, 'etag').length)),
    )
  })

  it('has a tab for the records, vehicle evidence, E-Tag evidence and enforcement notes', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/evidence')
    const tabs = await screen.findByRole('tablist', { name: 'Evidence views' })
    expect(
      within(tabs)
        .getAllByRole('tab')
        .map((tab) => tab.textContent?.replace(/\d+$/, '')),
    ).toEqual(['Evidence records', 'Vehicle Evidence', 'E-Tag Evidence', 'Enforcement Notes'])
  })

  it('lists each record with plain-text references, opening its evidence from the row’s actions', async () => {
    const entry = expected()[0]!
    signInAs('admin@jrb.gov.ng')
    renderApp('/evidence?range=30d')
    // The banner shares the register's name, so look for the register's table itself.
    const table = await screen.findByRole('table', { name: 'Evidence records' })
    expect(within(table).getByText(entry.id).closest('button, a')).toBeNull()

    await userEvent.click(within(table).getByRole('button', { name: `Actions for ${entry.id}` }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'View evidence' }))
    const dialog = await screen.findByRole('dialog', { name: `Evidence ${entry.id}` })
    for (const section of [
      'Photograph viewer',
      'Evidence metadata',
      'Enforcement notes',
      'Related records',
    ]) {
      expect(within(dialog).getByRole('heading', { name: section })).toBeInTheDocument()
    }
    for (const term of [
      'Capture timestamp',
      'GPS coordinates',
      'Agent',
      'Violation reference',
      'Vehicle',
      'Verification',
      'Violation',
      'Enforcement location',
    ]) {
      expect(within(dialog).getByText(term)).toBeInTheDocument()
    }
    expect(within(dialog).getByRole('link', { name: entry.verificationReference })).toHaveAttribute(
      'href',
      `/verifications?ref=${entry.verificationReference}`,
    )

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('moves between a violation’s photographs, vehicle evidence first', async () => {
    const entry = expected().find((item) => item.photographs.length >= 3)!
    signInAs('admin@jrb.gov.ng')
    renderApp(`/evidence?range=30d&record=${entry.violation.id}`)
    const dialog = await screen.findByRole('dialog', { name: `Evidence ${entry.id}` })
    expect(dialog).toHaveTextContent(`1 of ${entry.photographs.length}`)
    expect(
      within(dialog).getByRole('button', { name: /^Vehicle evidence · Front, 1 of/ }),
    ).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(within(dialog).getByRole('button', { name: 'Next photograph' }))
    expect(dialog).toHaveTextContent(`2 of ${entry.photographs.length}`)
    expect(
      within(dialog).getByRole('button', { name: /^Vehicle evidence · Rear, 2 of/ }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('opens on the E-Tag photograph from the E-Tag Evidence tab', async () => {
    const entry = expected().find((item) => photosIn(item, 'etag').length > 0)!
    signInAs('admin@jrb.gov.ng')
    renderApp(`/evidence?range=30d&view=etag&record=${entry.violation.id}`)
    const dialog = await screen.findByRole('dialog', { name: `Evidence ${entry.id}` })
    const pressed = within(dialog)
      .getAllByRole('button', { pressed: true })
      .map((button) => button.getAttribute('aria-label'))
    expect(pressed).toHaveLength(1)
    expect(pressed[0]).toMatch(/^E-Tag evidence · /)
  })

  it('says a photograph is still uploading rather than showing anything in its place', async () => {
    const entry = expected().find((item) => item.status === 'pending')!
    signInAs('admin@jrb.gov.ng')
    renderApp(`/evidence?range=30d&record=${entry.violation.id}`)
    const dialog = await screen.findByRole('dialog', { name: `Evidence ${entry.id}` })
    const uploading = entry.photographs.find((photo) => photo.url === null)!
    const index = [...entry.photographs]
      .sort((a, b) => Number(a.kind.includes('tag')) - Number(b.kind.includes('tag')))
      .indexOf(uploading)
    for (let i = 0; i < index; i += 1) {
      await userEvent.click(within(dialog).getByRole('button', { name: 'Next photograph' }))
    }
    expect(dialog).toHaveTextContent('still uploading from the device')
  })

  it('is read-only: no way to upload, replace or edit evidence', async () => {
    const entry = expected()[0]!
    signInAs('admin@jrb.gov.ng')
    renderApp(`/evidence?range=30d&record=${entry.violation.id}`)
    const dialog = await screen.findByRole('dialog', { name: `Evidence ${entry.id}` })
    expect(document.querySelector('input[type=file]')).toBeNull()
    expect(within(dialog).queryByRole('button', { name: /upload|replace|edit|delete/i })).toBeNull()
    expect(dialog).toHaveTextContent(
      'the dashboard does not upload replacement evidence, edit photographs or alter captured metadata',
    )
  })

  it('lists the agents’ submitted notes', async () => {
    const notes = expected().flatMap((entry) => entry.notes)
    signInAs('admin@jrb.gov.ng')
    renderApp('/evidence?range=30d&view=notes')
    const panel = await card('Enforcement Notes')
    const table = within(panel).getByRole('table', { name: 'Enforcement notes' })
    expect(bodyRows(table)).toHaveLength(Math.min(10, notes.length))
    expect(table).toHaveTextContent(notes[0]!.text)
  })

  it('says when the evidence named in the address is not in the area and period', async () => {
    const entry = expected()[0]!
    signInAs('admin@jrb.gov.ng')
    renderApp(`/evidence?range=30d&scope=pl&record=${entry.violation.id}`)
    expect(
      await screen.findByText(`No evidence for ${entry.violation.id} in this area and period.`, {
        exact: false,
      }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
