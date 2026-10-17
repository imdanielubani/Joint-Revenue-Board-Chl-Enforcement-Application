import { QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AppProviders } from '@/app/AppProviders'
import { routes } from '@/app/routes'
import type { AuthApi } from '@/features/auth/auth.api'
import { saveSession, sessionExpiry } from '@/features/auth/session'
import { MOCK_USERS } from '@/mocks/mock-users'

/** Renders the whole app at `path`, with a fresh query cache. */
export function renderApp(path: string, options: { authApi?: AuthApi } = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <AppProviders queryClient={queryClient} authApi={options.authApi}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return { router }
}

/** Starts the test signed in as one of the sample users. */
export function signInAs(email: string) {
  const user = MOCK_USERS.find((candidate) => candidate.email === email)
  if (!user) throw new Error(`No sample user ${email}`)
  saveSession({
    session: { accessToken: 'access', refreshToken: 'refresh', user, expiresAt: sessionExpiry() },
    remember: true,
  })
  return user
}
