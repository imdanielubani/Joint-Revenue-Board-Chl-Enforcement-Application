import type { RefObject } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { ROLE_LABELS } from '@/features/auth/auth.schemas'
import { useCurrentUser } from '@/features/auth/session-context'
import { useSignOut } from '@/features/auth/use-sign-out'
import { MaskIcon } from '@/shared/ui/MaskIcon'
import styles from './AccountMenu.module.css'
import { useMenu } from './use-menu'

interface AccountMenuProps {
  id: string
  /** Where it opens: under the top bar's profile button, or above the sidebar's user button. */
  placement: 'below' | 'above'
  triggerRef: RefObject<HTMLButtonElement | null>
  /** Must be stable (useCallback): the menu sets itself up once, when it opens. */
  onClose(): void
}

/** The account menu: who is signed in, Profile, Settings and Log out. */
export function AccountMenu({ id, placement, triggerRef, onClose }: AccountMenuProps) {
  const user = useCurrentUser()
  const signOut = useSignOut()
  const { menuRef, onKeyDown } = useMenu(triggerRef, onClose)

  return (
    <div
      ref={menuRef}
      id={id}
      className={`${styles.menu} ${styles[placement]}`}
      role="menu"
      aria-label="Account"
      onKeyDown={onKeyDown}
    >
      <div className={styles.header} role="presentation">
        <p className={styles.name}>{user.name}</p>
        <p className={styles.role}>{ROLE_LABELS[user.role]}</p>
      </div>
      <div className={styles.items} role="presentation">
        <Link className={styles.item} to={paths.profile} role="menuitem" onClick={onClose}>
          <MaskIcon className={styles.itemIcon} src="shell/menu-profile.svg" size={20} />
          Profile
        </Link>
        <Link className={styles.item} to={paths.settings} role="menuitem" onClick={onClose}>
          <MaskIcon className={styles.itemIcon} src="shell/menu-settings.svg" size={20} />
          Settings
        </Link>
        <div className={styles.separator} role="presentation">
          <button
            type="button"
            className={`${styles.item} ${styles.logout}`}
            role="menuitem"
            onClick={() => {
              onClose()
              void signOut()
            }}
          >
            <MaskIcon src="shell/menu-logout.svg" size={20} />
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}
