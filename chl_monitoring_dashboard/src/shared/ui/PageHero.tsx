import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { assetUrl } from '@/shared/lib/asset-url'
import styles from './PageHero.module.css'

interface PageHeroProps {
  title: string
  lede: string
  /** The section after "JRB CHL /" in the small heading: "Workspace", "Enforcement". */
  section: string
  /**
   * The folder in public/assets/ holding the module's banner icons,
   * hero-watermark.svg and hero-crumb.svg: its own sidebar icon, as on the Overview.
   */
  icons: string
  /** The buttons on the right: HeroButton and RefreshButton. */
  actions?: ReactNode
}

/** The green banner at the top of a module page: its name, a line about it, and its actions. */
export function PageHero({ title, lede, section, icons, actions }: PageHeroProps) {
  const titleId = useId()
  return (
    <section className={styles.hero} aria-labelledby={titleId}>
      <span className={styles.rings} aria-hidden="true" />
      <img
        className={styles.watermark}
        src={assetUrl(`${icons}/hero-watermark.svg`)}
        alt=""
        width={160}
        height={160}
      />
      <div className={styles.heroText}>
        <p className={styles.eyebrow}>
          <img src={assetUrl(`${icons}/hero-crumb.svg`)} alt="" width={18} height={18} />
          <span>JRB CHL</span>
          <span className={styles.slash} aria-hidden="true">
            /
          </span>
          <span>{section}</span>
        </p>
        <h2 id={titleId} className={styles.heroTitle}>
          {title}
        </h2>
        <p className={styles.heroLede}>{lede}</p>
      </div>
      {actions && <div className={styles.heroActions}>{actions}</div>}
    </section>
  )
}

interface HeroButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** "outline" sits on the green (Refresh); "solid" is white (Export records). */
  variant: 'outline' | 'solid'
  /** A 17px icon in public/assets/. */
  icon: string
  /** Spins the icon, while something loads. */
  spinning?: boolean
}

/** A banner button, as the design draws them. */
export function HeroButton({ variant, icon, spinning, children, ...props }: HeroButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={`${styles.heroButton} ${variant === 'solid' ? styles.solid : styles.outline}`}
    >
      <img
        className={spinning ? styles.spinning : undefined}
        src={assetUrl(icon)}
        alt=""
        width={17}
        height={17}
      />
      {children}
    </button>
  )
}

/** "Refresh", which spins and says so while the figures reload. */
export function RefreshButton({
  refreshing,
  onRefresh,
}: {
  refreshing: boolean
  onRefresh(): void
}) {
  return (
    <HeroButton
      variant="outline"
      icon="overview/refresh.svg"
      spinning={refreshing}
      onClick={onRefresh}
      disabled={refreshing}
      aria-busy={refreshing}
    >
      {refreshing ? 'Refreshing…' : 'Refresh'}
    </HeroButton>
  )
}
