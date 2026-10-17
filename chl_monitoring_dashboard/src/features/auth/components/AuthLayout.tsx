import type { ReactNode } from 'react'
import { assetUrl } from '@/shared/lib/asset-url'
import { JrbLogo } from '@/shared/ui/JrbLogo'
import styles from './AuthLayout.module.css'

interface AuthLayoutProps {
  eyebrow: string
  title: string
  description: ReactNode
  /** Shown above the heading, such as a back link. */
  before?: ReactNode
  /** Sits 18px above centre, as the sign-in design does; other pages are centred. */
  raised?: boolean
  children: ReactNode
}

/** The signed-out pages: the brand panel on the left, the form panel on the right. */
export function AuthLayout({
  eyebrow,
  title,
  description,
  before,
  raised = false,
  children,
}: AuthLayoutProps) {
  return (
    <div className={styles.page}>
      <aside className={styles.brandPanel}>
        <img className={styles.map} src={assetUrl('auth/map-dots.png')} alt="" />
        <div className={styles.brandContent}>
          <div className={styles.brand}>
            <JrbLogo />
            <div>
              <p className={styles.brandName}>JRB CHL</p>
              <p className={styles.brandTagline}>MONITORING DASHBOARD</p>
            </div>
          </div>

          <div className={styles.hero}>
            <p className={styles.heroEyebrow}>Enforcement monitoring</p>
            <p className={styles.heroTitle}>Monitoring &amp; Command for haulage enforcement.</p>
            <p className={styles.heroText}>
              Monitor vehicle verifications, review outstanding cases and understand field activity
              across your assigned locations.
            </p>
          </div>

          <div className={styles.brandFooter}>
            <span>JOINT REVENUE BOARD</span>
            <span>CHL MONITORING</span>
          </div>
        </div>
      </aside>

      <main className={raised ? `${styles.formPanel} ${styles.raised}` : styles.formPanel}>
        <div className={styles.formColumn}>
          {before}
          <header className={styles.header}>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.description}>{description}</p>
          </header>
          {children}
        </div>
      </main>
    </div>
  )
}
