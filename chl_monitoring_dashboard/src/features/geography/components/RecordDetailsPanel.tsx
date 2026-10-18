import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { assetUrl } from '@/shared/lib/asset-url'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import type { RecordDetails } from '../record-details'
import styles from './RecordDetailsPanel.module.css'

/**
 * One underlying record, opened on the page: everything known about it and
 * its related records, with links into the modules where the role allows.
 */
export function RecordDetailsPanel({
  details,
  onClose,
}: {
  details: RecordDetails
  onClose(): void
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  // Move to the panel when a record opens, so keyboard and screen-reader users land on it.
  useEffect(() => {
    headingRef.current?.focus()
  }, [details.key])

  return (
    <section className={styles.panel} aria-labelledby={`${details.key}-title`}>
      <header className={styles.head}>
        <div>
          <p className={styles.kind}>{details.kind}</p>
          <h4 id={`${details.key}-title`} ref={headingRef} tabIndex={-1} className={styles.title}>
            {details.title}
          </h4>
        </div>
        <div className={styles.headEnd}>
          {details.status && (
            <StatusLabel
              tone={details.status.tone}
              {...(details.status.icon ? { icon: details.status.icon } : {})}
            >
              {details.status.label}
            </StatusLabel>
          )}
          <button type="button" className={styles.close} onClick={onClose}>
            Close
          </button>
        </div>
      </header>
      <dl className={styles.facts}>
        {details.facts.map((fact) => (
          <div key={fact.term} className={styles.fact}>
            <dt>{fact.term}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
      {details.links.length > 0 && (
        <ul className={styles.links}>
          {details.links.map((entry) => (
            <li key={entry.label}>
              <Link className={styles.link} to={entry.to}>
                {entry.label}
                <img src={assetUrl('overview/arrow-up-right.svg')} alt="" width={14} height={14} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
