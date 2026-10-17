import { Link } from 'react-router'
import { env } from '@/config/env'
import { paths } from '@/config/paths'
import { assetUrl } from '@/shared/lib/asset-url'
import { AuthHelp } from '../components/AuthHelp'
import { AuthLayout } from '../components/AuthLayout'
import { ContactSupport } from '../components/ContactSupport'
import styles from '../components/form.module.css'

/**
 * Sign-in help. Passwords are reset in the existing CHL system, never here,
 * so this page points the user to CHL support.
 */
export function ForgotPasswordPage() {
  return (
    <AuthLayout
      before={
        <Link className={styles.backLink} to={paths.signIn}>
          <img src={assetUrl('auth/arrow-left.svg')} width={16} height={16} alt="" />
          Back to sign in
        </Link>
      }
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
        <ContactSupport url={env.supportUrl} />
      </div>
      <AuthHelp />
    </AuthLayout>
  )
}
