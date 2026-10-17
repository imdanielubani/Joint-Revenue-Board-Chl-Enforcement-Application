import { useEffect } from 'react'
import { useToast } from '@/shared/ui/toast/toast-context'
import { useSession } from '../session-context'
import { minutesLeft } from '../session-policy'

const KEYS = { idle: 'session-idle', expiring: 'session-expiring' } as const

/**
 * Shows the amber notification while the session is about to end, and removes it
 * when that passes (activity, or the session ended). Mounted in the signed-in frame.
 */
export function SessionWarnings() {
  const { warning, stayActive } = useSession()
  const { showToast, dismissToast } = useToast()

  useEffect(() => {
    if (warning?.kind === 'idle-warning') {
      showToast({
        key: KEYS.idle,
        variant: 'warning',
        title: 'Are you still there?',
        lines: [
          `You’ll be signed out in ${minutesLeft(warning.signsOutAt)} because of inactivity.`,
        ],
        action: { label: 'Stay signed in', onSelect: stayActive },
      })
    }
    if (warning?.kind === 'expiry-warning') {
      showToast({
        key: KEYS.expiring,
        variant: 'warning',
        title: 'Session expiring',
        lines: [
          `Your session ends in ${minutesLeft(warning.endsAt)}. Sign in again afterwards to continue.`,
        ],
      })
    }
    return () => dismissToast(KEYS.idle, KEYS.expiring)
    // The provider keeps the same warning object while its kind is unchanged, and the
    // functions are stable, so this runs only when the warning starts, changes or ends.
  }, [warning, showToast, dismissToast, stayActive])

  return null
}
