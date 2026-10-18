import { describe, expect, it } from 'vitest'
import { mockOverviewApi } from '@/mocks/mock-overview-api'
import {
  actionStatusLabel,
  actionStatusTone,
  etagResultColor,
  etagResultLabel,
  followUpLabel,
  humanize,
  methodStyle,
  methodTag,
  outcomeLabel,
  outcomeStyle,
} from './overview-display'
import { overviewSchema, VERIFICATION_OUTCOMES } from './overview.schemas'

/** Every icon file the dashboard ships, by path. */
const ASSETS = import.meta.glob('/public/assets/**/*.svg')

describe('statuses and outcomes', () => {
  it('gives every verification result an icon that exists, E-Tag results their own', () => {
    for (const outcome of VERIFICATION_OUTCOMES) {
      const { icon } = outcomeStyle(outcome)
      expect(icon, outcome).toBeDefined()
      expect(Object.keys(ASSETS), icon).toContain(`/public/assets/${icon}`)
    }
    expect(outcomeStyle('etag_missing').icon).not.toBe(outcomeStyle('invalid_etag').icon)
  })

  it('names the documented ones as the design does', () => {
    expect(outcomeLabel('expired_trip')).toBe('Expired / Previous Trip')
    expect(outcomeStyle('active_trip')).toEqual({
      tone: 'success',
      icon: 'overview/result-active.svg',
    })
    expect(actionStatusLabel('cancelled')).toBe('Cancelled')
    expect(actionStatusTone('cancelled')).toBe('neutral')
    expect(methodTag('qr')).toBe('QR Code')
    expect(followUpLabel('partial')).toBe('Partial follow-up')
    expect(etagResultLabel('invalid')).toBe('Invalid / fake E-Tag')
    expect(etagResultColor('valid')).toBe('var(--etag-valid)')
    expect(etagResultColor('missing')).toBe('var(--etag-missing)')
    expect(etagResultColor('cloned')).toBe('var(--status-neutral-dot)')
  })

  it('shows a state CHL adds later as it comes, in grey', () => {
    expect(actionStatusLabel('under_review')).toBe('Under review')
    expect(actionStatusTone('under_review')).toBe('neutral')
    expect(outcomeLabel('TAG_EXPIRED')).toBe('Tag expired')
    expect(outcomeStyle('TAG_EXPIRED')).toEqual({ tone: 'neutral' })
    expect(methodStyle('nfc')).toEqual({ color: 'var(--status-neutral-dot)' })
    expect(humanize('  ')).toBe('Unknown')
  })

  it('accepts an overview with states it does not know, rather than failing', async () => {
    const overview = await mockOverviewApi.getOverview({
      scope: 'ng',
      range: '14d',
      from: '2026-10-01',
      to: '2026-10-14',
      agentId: null,
      organization: null,
    })
    const [first] = overview.recentActivity
    const changed = {
      ...overview,
      recentActivity: [{ ...first, actionStatus: 'under_review', result: 'tag_expired' }],
      cases: { ...overview.cases, items: [{ ...overview.cases.items[0], status: 'reopened' }] },
    }
    const parsed = overviewSchema.parse(changed)
    expect(parsed.recentActivity[0]?.actionStatus).toBe('under_review')
    expect(parsed.cases.items[0]?.status).toBe('reopened')
  })

  it('still rejects a value that is not text', () => {
    const result = overviewSchema.safeParse({ recentActivity: [{ actionStatus: 4 }] })
    expect(result.success).toBe(false)
  })
})
