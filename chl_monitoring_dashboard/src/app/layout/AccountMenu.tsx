import { useEffect, useRef, type KeyboardEvent, type RefObject } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { ROLE_LABELS } from '@/features/auth/auth.schemas'
import { useCurrentUser } from '@/features/auth/session-context'
import { useSignOut } from '@/features/auth/use-sign-out'
import { MaskIcon } from '@/shared/ui/MaskIcon'
import styles from './AccountMenu.module.css'

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
  const menuRef = useRef<HTMLDivElement>(null)

  const items = () => [
    ...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []),
  ]

  const close = (returnFocus: boolean) => {
    onClose()
    if (returnFocus) triggerRef.current?.focus()
  }

  // Focus the first item on opening; close on a click outside.
  useEffect(() => {
    items()[0]?.focus()
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [onClose, triggerRef])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const list = items()
    const index = list.indexOf(document.activeElement as HTMLElement)
    const focusAt = (next: number) => list[(next + list.length) % list.length]?.focus()
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focusAt(index + 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        focusAt(index - 1)
        break
      case 'Home':
        event.preventDefault()
        focusAt(0)
        break
      case 'End':
        event.preventDefault()
        focusAt(list.length - 1)
        break
      case 'Escape':
        event.preventDefault()
        close(true)
        break
      case 'Tab':
        close(false)
        break
    }
  }

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
