import { Link } from 'react-router'
import { env } from '@/config/env'
import { paths } from '@/config/paths'
import { ROLE_LABELS } from '@/features/auth/auth.schemas'
import { useCurrentUser, useSession } from '@/features/auth/session-context'
import styles from './Topbar.module.css'

export function Topbar() {
  const user = useCurrentUser()
  const { signOut } = useSession()

  return (
    <header className={styles.topbar}>
      <div className={styles.badges}>
        {env.appEnv !== 'production' && <span className={styles.badge}>{env.appEnv}</span>}
        {env.useMocks && <span className={styles.badge}>Sample data</span>}
      </div>
      <div className={styles.end}>
        {user.modules.includes('notifications') && (
          <Link className={styles.iconLink} to={paths.notifications}>
            Notifications
          </Link>
        )}
        <Link className={styles.user} to={paths.profile}>
          <span className={styles.name}>{user.name}</span>
          <span className={styles.role}>{ROLE_LABELS[user.role]}</span>
        </Link>
        <button type="button" className={styles.signOut} onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
    </header>
  )
}
