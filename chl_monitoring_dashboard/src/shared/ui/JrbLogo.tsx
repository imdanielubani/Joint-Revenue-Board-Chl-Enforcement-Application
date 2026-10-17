import { assetUrl } from '@/shared/lib/asset-url'
import styles from './JrbLogo.module.css'

/** The JRB mark in its white circle, cropped from the brand image as the design does. */
export function JrbLogo() {
  return (
    <span className={styles.badge}>
      <span className={styles.mark}>
        <img className={styles.image} src={assetUrl('brand/jrb-logo.png')} alt="" />
      </span>
    </span>
  )
}
