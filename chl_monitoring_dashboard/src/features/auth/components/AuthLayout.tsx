import type { ReactNode } from 'react'
import styles from './AuthLayout.module.css'

/** The frame around the signed-out pages. */
export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="auth-title">
        <p className={styles.brand}>CHL Monitoring Dashboard</p>
        <h1 id="auth-title" className={styles.title}>
          {title}
        </h1>
        {children}
      </section>
    </main>
  )
}
