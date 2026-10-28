import { useCallback, useId, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { paths } from '@/config/paths'
import { ROLE_LABELS } from '@/features/auth/auth.schemas'
import { useCurrentUser } from '@/features/auth/session-context'
import { useNotificationsSummary } from '@/features/notifications/notifications.queries'
import { assetUrl } from '@/shared/lib/asset-url'
import { initials } from '@/shared/lib/initials'
import { MaskIcon } from '@/shared/ui/MaskIcon'
import { AccountMenu } from './AccountMenu'
import { NotificationsMenu } from './NotificationsMenu'
import { pageMeta } from './page-meta'
import styles from './Topbar.module.css'

interface TopbarProps {
  /** Whether the sidebar is showing in full (or, on narrow screens, open over the page). */
  sidebarOpen: boolean
  toggleLabel: string
  onToggleSidebar(): void
}

export function Topbar({ sidebarOpen, toggleLabel, onToggleSidebar }: TopbarProps) {
  const user = useCurrentUser()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const meta = pageMeta(pathname)
  const menuId = useId()
  const profileRef = useRef<HTMLButtonElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  // Stable, so the open menu sets itself up once rather than on every render.
  const closeMenu = useCallback(() => setMenuOpen(false), [setMenuOpen])
  const bellMenuId = useId()
  const bellRef = useRef<HTMLButtonElement>(null)
  const [bellOpen, setBellOpen] = useState(false)
  const closeBell = useCallback(() => setBellOpen(false), [setBellOpen])

  const canSeeNotifications = user.modules.includes('notifications')
  const notifications = useNotificationsSummary({ enabled: canSeeNotifications })
  const unread = notifications.data?.unread ?? 0

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = String(new FormData(event.currentTarget).get('q') ?? '').trim()
    if (query) navigate(`${paths.search}?q=${encodeURIComponent(query)}`)
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.start}>
        <button
          type="button"
          className={styles.toggle}
          aria-label={toggleLabel}
          aria-expanded={sidebarOpen}
          onClick={onToggleSidebar}
        >
          <img
            className={sidebarOpen ? undefined : styles.mirrored}
            src={assetUrl('shell/collapse.svg')}
            width={16}
            height={16}
            alt=""
          />
        </button>

        <span className={styles.tile} aria-hidden="true">
          <MaskIcon src={meta.tileIcon} size={22} />
        </span>

        <div className={styles.titleBlock}>
          <nav aria-label="Breadcrumb">
            <ol className={styles.crumbs}>
              {meta.crumbs.map((crumb, index) => (
                <li key={crumb} className={styles.crumb}>
                  {index > 0 && (
                    <img src={assetUrl('shell/crumb-chevron.svg')} width={11} height={11} alt="" />
                  )}
                  {crumb}
                </li>
              ))}
            </ol>
          </nav>
          <h1 className={styles.title}>{meta.title}</h1>
        </div>
      </div>

      <div className={styles.end}>
        <form className={styles.search} role="search" onSubmit={onSearch}>
          <img src={assetUrl('shell/search.svg')} width={19} height={19} alt="" />
          <input
            className={styles.searchInput}
            name="q"
            type="search"
            placeholder="Search vehicles, agents, references…"
            aria-label="Search all records"
            autoComplete="off"
          />
        </form>

        <div className={styles.actions}>
          <Link className={styles.iconButton} to={paths.support} aria-label="Help and support">
            <img src={assetUrl('shell/help.svg')} width={21} height={21} alt="" />
          </Link>

          {canSeeNotifications && (
            <div className={styles.bellWrap}>
              <button
                ref={bellRef}
                type="button"
                className={styles.iconButton}
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
                aria-haspopup="menu"
                aria-expanded={bellOpen}
                aria-controls={bellOpen ? bellMenuId : undefined}
                onClick={() => {
                  setMenuOpen(false)
                  setBellOpen((open) => !open)
                }}
              >
                <img src={assetUrl('shell/bell.svg')} width={21} height={21} alt="" />
                {unread > 0 && (
                  <span className={styles.badge} aria-hidden="true">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </button>
              {bellOpen && (
                <NotificationsMenu
                  id={bellMenuId}
                  triggerRef={bellRef}
                  unread={notifications.data?.unread}
                  latest={notifications.data?.latest}
                  onClose={closeBell}
                />
              )}
            </div>
          )}

          <span className={styles.divider} aria-hidden="true" />

          <button
            ref={profileRef}
            type="button"
            className={styles.profile}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? menuId : undefined}
            onClick={() => {
              setBellOpen(false)
              setMenuOpen((open) => !open)
            }}
          >
            <span className={styles.avatar} aria-hidden="true">
              {initials(user.name)}
            </span>
            <span className={styles.profileText}>
              <span className={styles.profileName}>{user.name}</span>
              <span className={styles.profileRole}>{ROLE_LABELS[user.role]}</span>
            </span>
            <img
              className={styles.chevron}
              src={assetUrl('shell/chevron-down.svg')}
              width={14}
              height={14}
              alt=""
            />
            <span className="visually-hidden">Account menu</span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <AccountMenu id={menuId} placement="below" triggerRef={profileRef} onClose={closeMenu} />
      )}
    </header>
  )
}
