import { useCallback } from 'react'
import { useToast } from '@/shared/ui/toast/toast-context'
import { useSession } from './session-context'

/**
 * Signs the user out on request and confirms it with the design's "Logged out
 * successfully" notification, which stays on screen over the sign-in page.
 * (A session that expires shows its own message on the sign-in page instead.)
 */
export function useSignOut(): () => Promise<void> {
  const { signOut } = useSession()
  const { showToast } = useToast()

  return useCallback(async () => {
    // signOut ends the session here at once, then tells the backend; confirm straight away
    // rather than after the backend answers (which can be slow or fail).
    const done = signOut()
    showToast({
      key: 'signed-out',
      title: 'Logged out successfully',
      lines: ['You have logged out of this workspace. Sign in again when you’re ready.'],
    })
    await done
  }, [signOut, showToast])
}
