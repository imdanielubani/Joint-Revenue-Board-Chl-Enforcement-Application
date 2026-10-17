import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { assetUrl } from '@/shared/lib/asset-url'
import { useSession } from '../session-context'
import styles from './form.module.css'

/**
 * "← Back to sign in", above a signed-out page's content. A signed-in user who
 * reached CHL support from the top bar goes back to the dashboard instead.
 */
export function BackToSignIn({ className }: { className?: string }) {
  const { session } = useSession()
  return (
    <Link
      className={className ? `${styles.backLink} ${className}` : styles.backLink}
      to={session ? paths.home : paths.signIn}
    >
      <img src={assetUrl('auth/arrow-left.svg')} width={16} height={16} alt="" />
      {session ? 'Back to dashboard' : 'Back to sign in'}
    </Link>
  )
}
