import { paths } from '@/config/paths'
import type { ModuleKey, User } from '@/features/auth/auth.schemas'

/** The sidebar's sections, in the design's order. */
export const MODULE_SECTIONS = ['Workspace', 'Enforcement', 'Monitoring'] as const
export type ModuleSection = (typeof MODULE_SECTIONS)[number]

export interface ModuleDefinition {
  key: ModuleKey
  /** The name in the sidebar. */
  label: string
  /** The page title in the top bar, when it differs from the label. */
  title?: string
  /** The breadcrumb above the title, when it differs from section › label. */
  crumbs?: readonly string[]
  path: string
  section: ModuleSection
  /** The sidebar icon, in public/assets/. */
  icon: string
  /** The top-bar icon, when the design gives one of its own. */
  tileIcon?: string
  /** The top-bar title on the module's page for one record (`path/<id>`), where it has one. */
  recordTitle?: string
}

/** The dashboard's modules, in menu order. The router, the sidebar and the top bar read this. */
export const MODULES: readonly ModuleDefinition[] = [
  {
    key: 'overview',
    label: 'Overview',
    title: 'Operational overview',
    crumbs: ['Workspace', 'Monitoring'],
    path: paths.overview,
    section: 'Workspace',
    icon: 'nav/overview.svg',
    tileIcon: 'shell/tile-overview.svg',
  },
  {
    key: 'command-centre',
    label: 'Command centre',
    path: paths.commandCentre,
    section: 'Workspace',
    icon: 'nav/command-centre.svg',
  },
  {
    key: 'geography',
    label: 'Geographical monitoring',
    path: paths.geography,
    section: 'Workspace',
    icon: 'nav/geography.svg',
  },
  {
    key: 'verifications',
    label: 'Verifications & E-Tags',
    path: paths.verifications,
    section: 'Enforcement',
    icon: 'nav/verifications.svg',
  },
  {
    key: 'trips',
    label: 'Trip monitoring',
    path: paths.trips,
    section: 'Enforcement',
    icon: 'nav/trips.svg',
  },
  {
    key: 'violations',
    label: 'Violations & cases',
    path: paths.violations,
    section: 'Enforcement',
    icon: 'nav/violations.svg',
  },
  {
    key: 'agents',
    label: 'Agents & organizations',
    recordTitle: 'Agent activity',
    path: paths.agents,
    section: 'Enforcement',
    icon: 'nav/agents.svg',
  },
  {
    key: 'evidence',
    label: 'Evidence records',
    path: paths.evidence,
    section: 'Enforcement',
    icon: 'nav/evidence.svg',
  },
  {
    key: 'field-reports',
    label: 'Field reports',
    path: paths.fieldReports,
    section: 'Enforcement',
    icon: 'nav/field-reports.svg',
  },
  {
    key: 'payments',
    label: 'Payments & compliance',
    path: paths.payments,
    section: 'Monitoring',
    icon: 'nav/payments.svg',
  },
  {
    key: 'notifications',
    label: 'Notifications',
    path: paths.notifications,
    section: 'Monitoring',
    icon: 'nav/notifications.svg',
  },
  {
    key: 'repeat-alerts',
    label: 'Repeat vehicle alerts',
    path: paths.repeatAlerts,
    section: 'Monitoring',
    icon: 'nav/repeat-alerts.svg',
  },
  {
    key: 'history',
    label: 'Verification history',
    path: paths.history,
    section: 'Monitoring',
    icon: 'nav/history.svg',
  },
  {
    key: 'audit',
    label: 'Audit trail',
    path: paths.audit,
    section: 'Monitoring',
    icon: 'nav/audit.svg',
  },
  {
    key: 'sync',
    label: 'Synchronization',
    path: paths.sync,
    section: 'Monitoring',
    icon: 'nav/sync.svg',
  },
]

/** The modules this user may open, in menu order. */
export function modulesFor(user: User): ModuleDefinition[] {
  return MODULES.filter((module) => user.modules.includes(module.key))
}
