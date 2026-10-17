import { StatePanel } from '@/shared/ui/StatePanel'

/**
 * Account settings. Nothing is configurable yet: accounts, roles and areas are
 * managed in CHL, so this waits until dashboard preferences are agreed.
 */
export function SettingsPage() {
  return (
    <StatePanel
      kind="empty"
      message="There are no settings to change yet. Your account, role and areas are managed in CHL."
    />
  )
}
