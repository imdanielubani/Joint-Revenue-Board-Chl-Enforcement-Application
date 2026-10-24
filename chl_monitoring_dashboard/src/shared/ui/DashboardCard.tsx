import { useId, type ReactNode } from 'react'
import { Link } from 'react-router'
import { assetUrl } from '@/shared/lib/asset-url'
import styles from './DashboardCard.module.css'

export interface CardLink {
  label: string
  /** Where it goes; without one (the user may not open that module) the label shows as plain text. */
  to?: string | undefined
}

interface DashboardCardProps {
  title: string
  /** The line under the title; some cards have none. */
  subtitle?: string
  /** The 32px header icon, in public/assets/. */
  icon?: string
  /** A chip on the right of the header, such as the period shown, in place of the icon. */
  aside?: string
  /** The link along the bottom of the card, or a note in its place. */
  footer?: CardLink | ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  /** For links and scrolling to the card. */
  id?: string
}

function isLink(footer: DashboardCardProps['footer']): footer is CardLink {
  return typeof footer === 'object' && footer !== null && 'label' in footer
}

/**
 * The monitoring card: a header (title, subtitle, icon) and a body, each in its
 * own white panel on a grey frame, with an optional link underneath.
 */
export function DashboardCard({
  title,
  subtitle,
  icon,
  aside,
  footer,
  children,
  className,
  bodyClassName,
  id,
}: DashboardCardProps) {
  const titleId = useId()
  return (
    <section
      id={id}
      className={className ? `${styles.card} ${className}` : styles.card}
      aria-labelledby={titleId}
    >
      <header className={styles.header}>
        <div className={styles.heading}>
          <h3 id={titleId} className={styles.title}>
            {title}
          </h3>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {aside ? (
          <span className={styles.aside}>{aside}</span>
        ) : (
          icon && <img className={styles.icon} src={assetUrl(icon)} alt="" width={32} height={32} />
        )}
      </header>
      <div className={bodyClassName ? `${styles.body} ${bodyClassName}` : styles.body}>
        {children}
      </div>
      {isLink(footer) ? <CardFooterLink {...footer} /> : footer}
    </section>
  )
}

/** "Explore verifications →" along the bottom of a card. */
export function CardFooterLink({ label, to }: CardLink) {
  if (!to) {
    return (
      <p className={styles.footer}>
        <span>{label}</span>
      </p>
    )
  }
  return (
    <Link className={`${styles.footer} ${styles.footerLink}`} to={to}>
      <span>{label}</span>
      <img src={assetUrl('overview/footer-arrow.svg')} alt="" width={14} height={14} />
    </Link>
  )
}
