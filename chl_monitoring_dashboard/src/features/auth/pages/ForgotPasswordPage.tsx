import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { assetUrl } from '@/shared/lib/asset-url'
import { AuthHelp } from '../components/AuthHelp'
import { AuthLayout } from '../components/AuthLayout'
import { BackToSignIn } from '../components/BackToSignIn'
import styles from '../components/form.module.css'

/**
 * Sign-in help. Passwords are reset in the existing CHL system, never here,
 * so this page points the user to CHL support.
 */
export function ForgotPasswordPage() {
  return (
    <AuthLayout
      before={<BackToSignIn />}
      eyebrow="Secure access"
      title="Get Sign-in help"
      description={
        <>
          <span className={styles.descriptionLine}>
            Password resets are handled through your existing CHL account.
          </span>{' '}
          <span className={styles.descriptionLine}>
            Contact your organization&rsquo;s CHL administrator to restore access.
          </span>
        </>
      }
    >
      <div className={styles.supportActions}>
        <Link className={styles.supportButton} to={paths.support}>
          Contact CHL Support
          <img src={assetUrl('auth/arrow-right.svg')} width={18} height={18} alt="" />
        </Link>
      </div>
      <AuthHelp />
    </AuthLayout>
  )
}
