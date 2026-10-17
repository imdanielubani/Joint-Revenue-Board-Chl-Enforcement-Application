import { useId, useState } from 'react'
import { Link } from 'react-router'
import { assetUrl } from '@/shared/lib/asset-url'
import styles from './form.module.css'

interface AuthHelpProps {
  /** Where "Need help signing in?" leads. Without it, the link shows a short note in place. */
  helpTo?: string
}

/** The role note and "Need help signing in?" under the signed-out forms. */
export function AuthHelp({ helpTo }: AuthHelpProps) {
  const id = useId()
  const [showHelp, setShowHelp] = useState(false)

  return (
    <>
      <p className={styles.roleNote}>
        <img src={assetUrl('auth/shield-icon.svg')} width={15} height={15} alt="" />
        Your CHL role determines which records and locations you can access
      </p>

      <div className={styles.help}>
        {helpTo ? (
          <Link className={styles.helpButton} to={helpTo}>
            Need help signing in?
          </Link>
        ) : (
          <>
            <button
              type="button"
              className={styles.helpButton}
              aria-expanded={showHelp}
              aria-controls={`${id}-help`}
              onClick={() => setShowHelp((shown) => !shown)}
            >
              Need help signing in?
            </button>
            {showHelp && (
              <p id={`${id}-help`} className={styles.helpText}>
                Use the email address and password of your CHL account. If you still can&apos;t sign
                in, contact your CHL administrator.
              </p>
            )}
          </>
        )}
      </div>
    </>
  )
}
