import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import type { AuthApi } from '@/features/auth/auth.api'
import { SessionProvider } from '@/features/auth/SessionProvider'
import type { SessionPolicy } from '@/features/auth/session-policy'
import { createQueryClient } from '@/shared/api/query-client'

interface AppProvidersProps {
  children: ReactNode
  /** Tests pass their own, so nothing leaks between them. */
  queryClient?: QueryClient
  authApi?: AuthApi
  sessionPolicy?: SessionPolicy
}

/** App-wide state. Notifications live in the root route instead (see routes.tsx), inside the router. */
export function AppProviders({ children, queryClient, authApi, sessionPolicy }: AppProvidersProps) {
  const [client] = useState(() => queryClient ?? createQueryClient())
  return (
    <QueryClientProvider client={client}>
      <SessionProvider api={authApi} policy={sessionPolicy}>
        {children}
      </SessionProvider>
    </QueryClientProvider>
  )
}
