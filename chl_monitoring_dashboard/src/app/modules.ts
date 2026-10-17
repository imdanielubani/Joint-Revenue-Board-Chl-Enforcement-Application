import { paths } from '@/config/paths'
import type { ModuleKey, User } from '@/features/auth/auth.schemas'

export type ModuleSection = 'Monitoring' | 'Enforcement' | 'Records'

export interface ModuleDefinition {
  key: ModuleKey
  label: string
  path: string
  section: ModuleSection
}

/** The dashboard's modules, in menu order. The router and the sidebar both read this. */
export const MODULES: readonly ModuleDefinition[] = [
  { key: 'overview', label: 'Overview', path: paths.overview, section: 'Monitoring' },
  {
    key: 'command-centre',
    label: 'Command Centre',
    path: paths.commandCentre,
    section: 'Monitoring',
  },
  { key: 'geography', label: 'Geography', path: paths.geography, section: 'Monitoring' },
  { key: 'agents', label: 'Agents', path: paths.agents, section: 'Monitoring' },
  {
    key: 'verifications',
    label: 'Verifications',
    path: paths.verifications,
    section: 'Enforcement',
  },
  { key: 'trips', label: 'CHL Trips', path: paths.trips, section: 'Enforcement' },
  { key: 'violations', label: 'Violations', path: paths.violations, section: 'Enforcement' },
  { key: 'evidence', label: 'Evidence', path: paths.evidence, section: 'Enforcement' },
  { key: 'payments', label: 'Payments', path: paths.payments, section: 'Enforcement' },
  { key: 'notifications', label: 'Notifications', path: paths.notifications, section: 'Records' },
  { key: 'audit', label: 'History & Audit', path: paths.audit, section: 'Records' },
  { key: 'sync', label: 'Sync Status', path: paths.sync, section: 'Records' },
]

/** The modules this user may open, in menu order. */
export function modulesFor(user: User): ModuleDefinition[] {
  return MODULES.filter((module) => user.modules.includes(module.key))
}
