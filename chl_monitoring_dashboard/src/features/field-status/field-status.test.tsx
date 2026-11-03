import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { presetPeriod } from '@/features/overview/overview-period'
import { mockFieldStatusApi, summarizeFieldStatus } from '@/mocks/mock-field-status-api'
import { lagosDay } from '@/shared/lib/dates'
import { renderApp, signInAs } from '@/test/render-app'

const card = (title: string) => screen.findByRole('region', { name: title })
/** The rows on a register's first page, header row left out. */
const bodyRows = (table: HTMLElement) => within(table).getAllByRole('row').slice(1)
const figure = async (label: string) => {
  const figures = await screen.findByRole('list', { name: 'Headline figures' })
  return within(figures).getByText(label).closest('li')!
}
const register = async () =>
  within(await card('Device status register')).getByRole('table', {
    name: 'Last-reported device status',
  })

/** What the page must show for an area over the last 14 days, the default period. */
const expected = (scope = 'ng') =>
  summarizeFieldStatus({
    scope,
    range: '14d',
    ...presetPeriod('14d', lagosDay()),
    agentId: null,
    organization: null,
  }).devices

afterEach(() => vi.restoreAllMocks())

describe('field operational status page', () => {
  it('opens on the banner, saying the status is last reported, not current', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/field-status')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Field operational status' }),
    ).toBeInTheDocument()
    const hero = await screen.findByRole('region', { name: 'Field operational status' })
    expect(hero).toHaveTextContent('JRB CHL/Monitoring')
    expect(hero).toHaveTextContent('Last reported, not current. Read-only.')
    expect(await screen.findByRole('combobox', { name: 'Agent' })).toBeInTheDocument()
  })

  it('opens for supervisors as well as administrators', async () => {
    signInAs('supervisor@jrb.gov.ng')
    renderApp('/field-status')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Field operational status' }),
    ).toBeInTheDocument()
  })

  it('is kept from users the backend gives no access to it', async () => {
    signInAs('po@jrb.gov.ng')
    renderApp('/field-status')
    expect(await screen.findByRole('heading', { name: 'No access' })).toBeInTheDocument()
  })

  it('counts the agents reporting and each last-reported problem', async () => {
    const devices = expected()
    signInAs('admin@jrb.gov.ng')
    renderApp('/field-status')
    expect(await figure('Agents reporting')).toHaveTextContent(String(devices.length))
    expect(await figure('RFID reader disconnected')).toHaveTextContent(
      String(devices.filter((device) => device.rfidReader === 'disconnected').length),
    )
    expect(await figure('Internet disconnected')).toHaveTextContent(
      String(devices.filter((device) => device.internet === 'disconnected').length),
    )
    expect(await figure('GPS disabled')).toHaveTextContent(
      String(devices.filter((device) => device.gps === 'disabled').length),
    )
  })

  it('lists one row per agent, with a status CHL does not supply shown as not supplied', async () => {
    const devices = expected()
    signInAs('admin@jrb.gov.ng')
    renderApp('/field-status')
    const rows = bodyRows(await register())
    expect(rows).toHaveLength(devices.length)
    rows.forEach((row, index) => expect(row).toHaveTextContent(devices[index]!.agent.name))
    const musa = rows.find((row) => row.textContent?.includes('JRB-AG-0144'))
    if (musa) expect(musa).toHaveTextContent('Not supplied')
  })

  it('opens the register filtered to agents last reported offline', async () => {
    const offline = expected().filter((device) => device.internet === 'disconnected')
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/field-status')
    await userEvent.click(within(await figure('Internet disconnected')).getByRole('link'))
    expect(new URLSearchParams(router.state.location.search).get('internet')).toBe('disconnected')
    if (offline.length === 0) return
    const rows = bodyRows(await register())
    expect(rows).toHaveLength(offline.length)
  })

  it('leads from a row to the agent and their verification history', async () => {
    const [first] = expected()
    signInAs('admin@jrb.gov.ng')
    const { router } = renderApp('/field-status?scope=ng&range=30d')
    await card('Device status register')
    await userEvent.click(screen.getByRole('button', { name: `Actions for ${first!.agent.name}` }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Verification history' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/history'))
    expect(router.state.location.search).toBe(`?scope=ng&range=30d&agent=${first!.agent.id}`)
  })

  it('says so when CHL does not supply device status', async () => {
    vi.spyOn(mockFieldStatusApi, 'getFieldStatus').mockResolvedValue({
      provided: false,
      latestReceivedAt: null,
      devices: [],
    })
    signInAs('admin@jrb.gov.ng')
    renderApp('/field-status')
    expect(
      await screen.findByText(
        'CHL does not supply agents’ RFID reader, internet or GPS status, so none can be shown here.',
      ),
    ).toBeInTheDocument()
  })

  it('says the status is last reported and cannot show what is on an offline phone', async () => {
    signInAs('admin@jrb.gov.ng')
    renderApp('/field-status')
    expect(await screen.findByText('Last reported, not current.')).toBeInTheDocument()
    expect(screen.getByText(/cannot know a phone’s current state/)).toBeInTheDocument()
  })
})
