import { useId } from 'react'
import { assetUrl } from '@/shared/lib/asset-url'
import styles from './LabeledSelect.module.css'

interface LabeledSelectProps {
  label: string
  /** The chosen value; null for "All". */
  value: string | null
  options: readonly { value: string; label: string }[]
  onChange(value: string | null): void
}

/** A register filter: a small label over the choice, "All" first; green when it narrows. */
export function LabeledSelect({ label, value, options, onChange }: LabeledSelectProps) {
  const id = useId()
  return (
    <div className={value === null ? styles.box : `${styles.box} ${styles.active}`}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <img
        className={styles.chevron}
        src={assetUrl('verifications/select-chevron.svg')}
        alt=""
        width={12}
        height={12}
      />
    </div>
  )
}
