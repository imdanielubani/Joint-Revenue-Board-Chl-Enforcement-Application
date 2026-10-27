import { useId } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { assetUrl } from '@/shared/lib/asset-url'
import styles from './NotFoundPage.module.css'

/**
 * "Page not found": a large "404.", the heading with "not found." picked out,
 * a line on what happened and the way home, beside an unplugged plug and
 * socket. The top bar already names the page.
 */
export function NotFoundPage() {
  const headingId = useId()
  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <img
        className={styles.art}
        src={assetUrl('not-found/unplugged.png')}
        alt=""
        width={1536}
        height={1024}
      />
      <div className={styles.text}>
        <p className={styles.code}>404.</p>
        <h2 id={headingId} className={styles.heading}>
          Page <mark className={styles.mark}>not found.</mark>
        </h2>
        <p className={styles.message}>
          The address you followed does not lead to a page on the JRB CHL Monitoring Dashboard.
          Check the address, or go back home.
        </p>
        <Link className={styles.home} to={paths.home}>
          Go back home
        </Link>
      </div>
    </section>
  )
}
