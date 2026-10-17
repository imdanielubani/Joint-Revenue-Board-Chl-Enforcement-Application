import { useId, useState } from 'react'
import { assetUrl } from '@/shared/lib/asset-url'
import styles from './form.module.css'

/**
 * "Contact CHL Support": opens the configured support page (in a new tab) or
 * email address. Until one is configured, it says so instead of doing nothing.
 */
export function ContactSupport({ url }: { url: string }) {
  const id = useId()
  const [showNote, setShowNote] = useState(false)

  const content = (
    <>
      Contact CHL Support
      <img src={assetUrl('auth/arrow-right.svg')} width={18} height={18} alt="" />
    </>
  )

  if (url) {
    const external = url.startsWith('https://')
    return (
      <a
        className={styles.supportButton}
        href={url}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {content}
      </a>
    )
  }

  return (
    <>
      <button
        type="button"
        className={styles.supportButton}
        aria-expanded={showNote}
        aria-controls={`${id}-note`}
        onClick={() => setShowNote((shown) => !shown)}
      >
        {content}
      </button>
      {showNote && (
        <p id={`${id}-note`} className={styles.notice} role="status">
          The CHL support contact hasn&apos;t been set up yet. Contact your organization&rsquo;s CHL
          administrator.
        </p>
      )}
    </>
  )
}
