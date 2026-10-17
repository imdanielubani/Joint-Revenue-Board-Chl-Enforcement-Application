import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import type { AuthApi } from '@/features/auth/auth.api'
import { SessionProvider } from '@/features/auth/SessionProvider'
import { createQueryClient } from '@/shared/api/query-client'

interface AppProvidersProps {
  children: ReactNode
  /** Tests pass their own, so nothing leaks between them. */
  queryClient?: QueryClient
  authApi?: AuthApi
}

export function AppProviders({ children, queryClient, authApi }: AppProvidersProps) {
  const [client] = useState(() => queryClient ?? createQueryClient())
  return (
    <QueryClientProvider client={client}>
      <SessionProvider api={authApi}>{children}</SessionProvider>
    </QueryClientProvider>
  )
}
