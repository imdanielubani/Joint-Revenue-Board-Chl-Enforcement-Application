import { useCallback, useId, useRef, useState } from 'react'
import { NavLink } from 'react-router'
import { ROLE_LABELS } from '@/features/auth/auth.schemas'
import { useCurrentUser } from '@/features/auth/session-context'
import { useSignOut } from '@/features/auth/use-sign-out'
import { useNotificationsSummary } from '@/features/notifications/notifications.queries'
import { useViolationsSummary } from '@/features/violations/violations.queries'
import { initials } from '@/shared/lib/initials'
import { JrbLogo } from '@/shared/ui/JrbLogo'
import { MaskIcon } from '@/shared/ui/MaskIcon'
import { MODULE_SECTIONS, modulesFor, type ModuleDefinition } from '../modules'
import { AccountMenu } from './AccountMenu'
import { workspaceOf } from './workspace'
import styles from './Sidebar.module.css'

interface SidebarProps {
  /** Icons only, 80px wide. */
  collapsed: boolean
  /** Narrow screens: the sidebar slides over the page. */
  overlayOpen: boolean
  /** A menu link was followed (closes the overlay on narrow screens). */
  onNavigate(): void
}

/** The menu shows only the modules this user may open, grouped as in the design. */
export function Sidebar({ collapsed, overlayOpen, onNavigate }: SidebarProps) {
  const user = useCurrentUser()
  const signOut = useSignOut()
  const modules = modulesFor(user)
  const workspace = workspaceOf(user)
  const menuId = useId()
  const userButtonRef = useRef<HTMLButtonElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  // Stable, so the open menu sets itself up once rather than on every render.
  const closeMenu = useCallback(() => setMenuOpen(false), [setMenuOpen])

  const notifications = useNotificationsSummary({
    enabled: user.modules.includes('notifications'),
  })
  const violations = useViolationsSummary({ enabled: user.modules.includes('violations') })
  const unread = notifications.data?.unread ?? 0
  const needingAttention = violations.data?.needingAttention ?? 0

  const badge = (module: ModuleDefinition) => {
    if (module.key === 'violations' && needingAttention > 0) {
      return (
        <>
          <span className={styles.attention} aria-hidden="true" />
          <span className="visually-hidden">, {needingAttention} need attention</span>
        </>
      )
    }
    if (module.key === 'notifications' && unread > 0) {
      return (
        <>
          <span className={styles.count} aria-hidden="true">
            {unread > 99 ? '99+' : unread}
          </span>
          <span className="visually-hidden">, {unread} unread</span>
        </>
      )
    }
    return null
  }

  const className = [
    styles.sidebar,
    collapsed && styles.collapsed,
    overlayOpen && styles.overlayOpen,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <aside className={className} aria-label="Sidebar">
      <div className={styles.brand}>
        <div className={styles.brandRow}>
          <JrbLogo size="sm" />
          <div className={styles.brandText}>
            <p className={styles.brandName}>JRB CHL</p>
            <p className={styles.brandTagline}>MONITORING DASHBOARD</p>
          </div>
        </div>
        <hr className={styles.dashed} />
      </div>

      <div className={styles.workspaceWrap}>
        <div className={styles.workspace}>
          <span className={styles.workspaceTile}>
            <MaskIcon src="shell/workspace-globe.svg" size={19} />
          </span>
          <div className={styles.workspaceText}>
            <p className={styles.workspaceName}>{workspace.name}</p>
            <p className={styles.workspaceOrg}>{workspace.organization}</p>
          </div>
          <span className={styles.online} aria-hidden="true" />
        </div>
      </div>

      <nav className={styles.nav} aria-label="Main">
        {MODULE_SECTIONS.map((section) => {
          const items = modules.filter((module) => module.section === section)
          if (items.length === 0) return null
          return (
            <div key={section} className={styles.section}>
              <p className={styles.sectionTitle}>{section}</p>
              <ul className={styles.list}>
                {items.map((module) => (
                  <li key={module.key}>
                    <NavLink
                      to={module.path}
                      title={collapsed ? module.label : undefined}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        isActive ? `${styles.link} ${styles.active}` : styles.link
                      }
                    >
                      <MaskIcon className={styles.linkIcon} src={module.icon} size={19} />
                      <span className={styles.linkLabel}>{module.label}</span>
                      {badge(module)}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </nav>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.logout}
          title={collapsed ? 'Log out' : undefined}
          onClick={() => void signOut()}
        >
          <MaskIcon src="shell/logout.svg" size={19} />
          <span className={styles.logoutLabel}>Log out</span>
        </button>

        <div className={styles.userWrap}>
          <button
            ref={userButtonRef}
            type="button"
            className={styles.user}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? menuId : undefined}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className={styles.avatar} aria-hidden="true">
              {initials(user.name)}
            </span>
            <span className={styles.userText}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userRole}>{ROLE_LABELS[user.role]}</span>
            </span>
            <MaskIcon className={styles.userChevron} src="shell/user-chevron.svg" size={15} />
            <span className="visually-hidden">Account menu</span>
          </button>
          {menuOpen && (
            <AccountMenu
              id={menuId}
              placement="above"
              triggerRef={userButtonRef}
              onClose={closeMenu}
            />
          )}
        </div>
      </div>
    </aside>
  )
}
