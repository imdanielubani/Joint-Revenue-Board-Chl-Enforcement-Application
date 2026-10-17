import { assetUrl } from '@/shared/lib/asset-url'
import styles from './JrbLogo.module.css'

/**
 * The JRB mark in its white circle, cropped from the brand image as the design does.
 * `md` (49px) on the sign-in pages, `sm` (42px) in the sidebar.
 */
export function JrbLogo({ size = 'md' }: { size?: 'md' | 'sm' }) {
  return (
    <span className={`${styles.badge} ${styles[size]}`}>
      <span className={styles.mark}>
        <img className={styles.image} src={assetUrl('brand/jrb-logo.png')} alt="" />
      </span>
    </span>
  )
}
