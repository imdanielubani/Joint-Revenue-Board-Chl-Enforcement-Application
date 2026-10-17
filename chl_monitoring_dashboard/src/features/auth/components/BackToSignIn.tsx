import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { assetUrl } from '@/shared/lib/asset-url'
import styles from './form.module.css'

/** "← Back to sign in", above a signed-out page's content. */
export function BackToSignIn({ className }: { className?: string }) {
  return (
    <Link
      className={className ? `${styles.backLink} ${className}` : styles.backLink}
      to={paths.signIn}
    >
      <img src={assetUrl('auth/arrow-left.svg')} width={16} height={16} alt="" />
      Back to sign in
    </Link>
  )
}
