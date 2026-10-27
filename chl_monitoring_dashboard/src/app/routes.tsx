import { Outlet, type RouteObject } from 'react-router'
import { paths } from '@/config/paths'
import type { ModuleKey } from '@/features/auth/auth.schemas'
import { RedirectIfSignedIn, RequireAuth, RequireModule } from '@/features/auth/guards'
import { ToastProvider } from '@/shared/ui/toast/ToastProvider'
import { AppShell } from './layout/AppShell'
import { MODULES } from './modules'
import { HomeRedirect } from './pages/HomeRedirect'
import { NotFoundPage } from './pages/NotFoundPage'
import { RouteErrorPage } from './pages/RouteErrorPage'

type LazyPage = NonNullable<RouteObject['lazy']>

// Each module is its own bundle, loaded the first time it is opened.
const MODULE_PAGES: Record<ModuleKey, LazyPage> = {
  overview: () =>
    import('@/features/overview/pages/OverviewPage').then((m) => ({ Component: m.OverviewPage })),
  'command-centre': () =>
    import('@/features/command-centre/pages/CommandCentrePage').then((m) => ({
      Component: m.CommandCentrePage,
    })),
  geography: () =>
    import('@/features/geography/pages/GeographyPage').then((m) => ({
      Component: m.GeographyPage,
    })),
  agents: () =>
    import('@/features/agents/pages/AgentsPage').then((m) => ({ Component: m.AgentsPage })),
  verifications: () =>
    import('@/features/verifications/pages/VerificationsPage').then((m) => ({
      Component: m.VerificationsPage,
    })),
  trips: () => import('@/features/trips/pages/TripsPage').then((m) => ({ Component: m.TripsPage })),
  violations: () =>
    import('@/features/violations/pages/ViolationsPage').then((m) => ({
      Component: m.ViolationsPage,
    })),
  evidence: () =>
    import('@/features/evidence/pages/EvidencePage').then((m) => ({ Component: m.EvidencePage })),
  'field-reports': () =>
    import('@/features/field-reports/pages/FieldReportsPage').then((m) => ({
      Component: m.FieldReportsPage,
    })),
  payments: () =>
    import('@/features/payments/pages/PaymentsPage').then((m) => ({ Component: m.PaymentsPage })),
  notifications: () =>
    import('@/features/notifications/pages/NotificationsPage').then((m) => ({
      Component: m.NotificationsPage,
    })),
  'repeat-alerts': () =>
    import('@/features/repeat-alerts/pages/RepeatAlertsPage').then((m) => ({
      Component: m.RepeatAlertsPage,
    })),
  audit: () => import('@/features/audit/pages/AuditPage').then((m) => ({ Component: m.AuditPage })),
  sync: () => import('@/features/sync/pages/SyncPage').then((m) => ({ Component: m.SyncPage })),
}

// A module's page for one record, at `path/<id>`, where it has one.
const RECORD_PAGES: Partial<Record<ModuleKey, LazyPage>> = {
  agents: () =>
    import('@/features/agents/pages/AgentPage').then((m) => ({ Component: m.AgentPage })),
}

export const routes: RouteObject[] = [
  {
    // Notifications live here, inside the router, so a notification's action can be a link,
    // and it stays on screen when the page changes.
    element: (
      <ToastProvider>
        <Outlet />
      </ToastProvider>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <RedirectIfSignedIn />,
        children: [
          {
            path: paths.signIn,
            lazy: () =>
              import('@/features/auth/pages/SignInPage').then((m) => ({ Component: m.SignInPage })),
          },
          {
            path: paths.forgotPassword,
            lazy: () =>
              import('@/features/auth/pages/ForgotPasswordPage').then((m) => ({
                Component: m.ForgotPasswordPage,
              })),
          },
        ],
      },
      // CHL support is open whether or not the user is signed in (the top bar's Help leads here).
      {
        path: paths.support,
        lazy: () =>
          import('@/features/auth/pages/SupportPage').then((m) => ({
            Component: m.SupportPage,
          })),
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <HomeRedirect /> },
              {
                path: paths.profile,
                lazy: () =>
                  import('@/features/auth/pages/ProfilePage').then((m) => ({
                    Component: m.ProfilePage,
                  })),
              },
              {
                path: paths.settings,
                lazy: () =>
                  import('@/features/auth/pages/SettingsPage').then((m) => ({
                    Component: m.SettingsPage,
                  })),
              },
              {
                path: paths.search,
                lazy: () => import('./pages/SearchPage').then((m) => ({ Component: m.SearchPage })),
              },
              ...MODULES.map<RouteObject>((module) => ({
                path: module.path,
                element: <RequireModule module={module.key} />,
                children: [
                  { index: true, lazy: MODULE_PAGES[module.key] },
                  ...(RECORD_PAGES[module.key]
                    ? [{ path: ':recordId', lazy: RECORD_PAGES[module.key] }]
                    : []),
                ],
              })),
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]
