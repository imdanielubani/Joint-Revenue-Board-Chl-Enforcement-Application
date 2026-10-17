import { NavLink } from 'react-router'
import { useCurrentUser } from '@/features/auth/session-context'
import { modulesFor, type ModuleSection } from '../modules'
import styles from './Sidebar.module.css'

const SECTIONS: ModuleSection[] = ['Monitoring', 'Enforcement', 'Records']

/** The menu shows only the modules this user may open. */
export function Sidebar() {
  const modules = modulesFor(useCurrentUser())

  return (
    <aside className={styles.sidebar}>
      <p className={styles.brand}>CHL Monitoring</p>
      <nav aria-label="Main">
        {SECTIONS.map((section) => {
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
                      className={({ isActive }) =>
                        isActive ? `${styles.link} ${styles.active}` : styles.link
                      }
                    >
                      {module.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
