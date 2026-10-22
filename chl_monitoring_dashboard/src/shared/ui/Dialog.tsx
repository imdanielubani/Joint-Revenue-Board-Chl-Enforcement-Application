import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styles from './Dialog.module.css'

interface DialogProps {
  title: string
  subtitle?: string | undefined
  onClose(): void
  children: ReactNode
  /** The buttons along the bottom. */
  footer?: ReactNode
  /** Wider, for content such as a photograph viewer. */
  wide?: boolean
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * A popup over the page: its title, a body that scrolls when long, and its
 * buttons. Escape, the close button or a click outside closes it; while open,
 * the keyboard stays inside it and the page behind does not scroll. Focus goes
 * back to where it was when it closes.
 */
export function Dialog({ title, subtitle, onClose, children, footer, wide = false }: DialogProps) {
  const titleId = useId()
  const subtitleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.body.style.overflow = overflow
      opener?.focus({ preventScroll: true })
    }
  }, [])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      closeRef.current()
      return
    }
    if (event.key !== 'Tab') return
    // Keep the keyboard inside the popup.
    const items = [...(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
    const first = items[0]
    const last = items[items.length - 1]
    if (!first || !last) return
    if (
      event.shiftKey &&
      (document.activeElement === first || document.activeElement === panelRef.current)
    ) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeRef.current()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        tabIndex={-1}
        className={wide ? `${styles.panel} ${styles.wide}` : styles.panel}
        onKeyDown={onKeyDown}
      >
        <header className={styles.head}>
          <div>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            {subtitle && (
              <p id={subtitleId} className={styles.subtitle}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            className={styles.close}
            aria-label="Close"
            onClick={() => closeRef.current()}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}
