import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { storage } from '@/shared/lib/storage'
import { useMediaQuery } from '@/shared/lib/use-media-query'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import styles from './AppShell.module.css'

/** Whether the sidebar is collapsed is remembered per browser: a viewer's preference. */
export const SIDEBAR_COLLAPSED_KEY = 'chl-dashboard.sidebar-collapsed'

/** Where notifications start on signed-in pages: under the top bar (16 + 64 + 12). */
const TOAST_TOP_SIGNED_IN = '92px'

/** The signed-in frame: sidebar, top bar and the current page. */
export function AppShell() {
  const narrow = useMediaQuery('(max-width: 768px)')
  const [collapsed, setCollapsed] = useState(() => storage.get(SIDEBAR_COLLAPSED_KEY) === 'true')
  const [overlayOpen, setOverlayOpen] = useState(false)
  const { pathname } = useLocation()

  // Narrow screens: close the slide-over sidebar when the page changes.
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setOverlayOpen(false)
  }

  // Keep notifications clear of the top bar while signed in.
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--toast-top', TOAST_TOP_SIGNED_IN)
    return () => {
      root.style.removeProperty('--toast-top')
    }
  }, [])

  const toggleSidebar = () => {
    if (narrow) {
      setOverlayOpen((open) => !open)
      return
    }
    setCollapsed((current) => {
      storage.set(SIDEBAR_COLLAPSED_KEY, String(!current))
      return !current
    })
  }

  const sidebarCollapsed = !narrow && collapsed
  const sidebarOpen = narrow ? overlayOpen : !collapsed
  const toggleLabel = narrow
    ? overlayOpen
      ? 'Close menu'
      : 'Open menu'
    : collapsed
      ? 'Expand sidebar'
      : 'Collapse sidebar'

  return (
    <div className={sidebarCollapsed ? `${styles.shell} ${styles.collapsed}` : styles.shell}>
      <a className={styles.skipLink} href="#main">
        Skip to content
      </a>
      <Sidebar
        collapsed={sidebarCollapsed}
        overlayOpen={narrow && overlayOpen}
        onNavigate={() => setOverlayOpen(false)}
      />
      {narrow && overlayOpen && (
        <div className={styles.backdrop} aria-hidden="true" onClick={() => setOverlayOpen(false)} />
      )}
      <div className={styles.body}>
        {/* The top bar stays in view as the page scrolls under it. */}
        <div className={styles.topbarDock}>
          <Topbar
            sidebarOpen={sidebarOpen}
            toggleLabel={toggleLabel}
            onToggleSidebar={toggleSidebar}
          />
        </div>
        <main id="main" className={styles.main} tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
