import type { ReactNode } from 'react'
import styles from './PageHeader.module.css'

// The page's own heading (h1) is the title in the top bar; this is a section heading.

interface PageHeaderProps {
  title: string
  description?: string
  /** Filters or other controls shown beside the title. */
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div>
        <h2 className={styles.title}>{title}</h2>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  )
}
