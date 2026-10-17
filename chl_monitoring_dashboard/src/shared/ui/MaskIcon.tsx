import type { CSSProperties } from 'react'
import { assetUrl } from '@/shared/lib/asset-url'
import styles from './MaskIcon.module.css'

interface MaskIconProps {
  /** A file in public/assets/, as for assetUrl(). */
  src: string
  size: number
  className?: string
}

/**
 * An icon drawn in the current text colour, using the design's SVG as a mask.
 * The shape is the design's exactly; only its colour follows the state, so one
 * file serves the menu's active, inactive and highlighted variants.
 */
export function MaskIcon({ src, size, className }: MaskIconProps) {
  const style = {
    '--icon-url': `url("${assetUrl(src)}")`,
    width: size,
    height: size,
  } as CSSProperties
  return (
    <span
      className={className ? `${styles.icon} ${className}` : styles.icon}
      style={style}
      aria-hidden="true"
    />
  )
}
