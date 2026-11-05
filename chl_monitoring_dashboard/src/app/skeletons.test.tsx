import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockCommandCentreApi } from '@/mocks/mock-command-centre-api'
import { mockGeographyApi } from '@/mocks/mock-geography-api'
import { mockVerificationsApi } from '@/mocks/mock-verifications-api'
import { mockTripsApi } from '@/mocks/mock-trips-api'
import { mockViolationsApi } from '@/mocks/mock-violations-api'
import { mockEvidenceApi } from '@/mocks/mock-evidence-api'
// (stubs)
import { renderApp, signInAs } from '@/test/render-app'

afterEach(() => vi.restoreAllMocks())

/** Each page, the message read out while it loads, and how to hold its data back. */
const CASES: [string, string | RegExp, () => unknown][] = [
  [
    '/command-centre',
    'Loading the command centre…',
    () => vi.spyOn(mockCommandCentreApi, 'getCommandCentre').mockReturnValue(new Promise(() => {})),
  ],
  [
    '/geography',
    'Loading geographical monitoring…',
    () => vi.spyOn(mockGeographyApi, 'getGeography').mockReturnValue(new Promise(() => {})),
  ],
  [
    '/verifications',
    'Loading verifications…',
    () => vi.spyOn(mockVerificationsApi, 'getMonitoring').mockReturnValue(new Promise(() => {})),
  ],
  [
    '/trips',
    'Loading trips…',
    () => vi.spyOn(mockTripsApi, 'getMonitoring').mockReturnValue(new Promise(() => {})),
  ],
  [
    '/violations',
    'Loading violations…',
    () => vi.spyOn(mockViolationsApi, 'getMonitoring').mockReturnValue(new Promise(() => {})),
  ],
  [
    '/evidence',
    'Loading evidence…',
    () => vi.spyOn(mockEvidenceApi, 'getMonitoring').mockReturnValue(new Promise(() => {})),
  ],
  // (cases)
]

describe('every page while it loads', () => {
  for (const [route, message, hold] of CASES) {
    it(`shows ${route}’s shape while its data loads`, async () => {
      hold()
      signInAs('admin@jrb.gov.ng')
      renderApp(route)
      const text = await screen.findByText(message)
      const skeleton = text.closest('[aria-busy="true"]')!
      expect(skeleton).toHaveAttribute('role', 'status')
      // The grey shapes are there, hidden from screen readers.
      expect(skeleton.querySelector('[aria-hidden="true"]')!.childElementCount).toBeGreaterThan(0)
    })
  }
})
