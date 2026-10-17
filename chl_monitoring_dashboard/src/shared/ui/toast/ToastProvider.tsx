import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { assetUrl } from '@/shared/lib/asset-url'
import {
  ToastContext,
  type ToastAction,
  type ToastContextValue,
  type ToastIcon,
  type ToastInput,
  type ToastVariant,
} from './toast-context'
import styles from './Toast.module.css'

/** How long a success notification stays before it dismisses itself. */
export const TOAST_DURATION_MS = 6000

const ICON_FILES: Record<ToastIcon, string> = {
  check: 'toast/check-circle.svg',
  clock: 'toast/clock.svg',
  warning: 'toast/warning-circle.svg',
  account: 'toast/account-error.svg',
}

const DEFAULT_ICONS: Record<ToastVariant, ToastIcon> = {
  success: 'check',
  warning: 'clock',
  error: 'warning',
}

interface ToastItem extends ToastInput {
  id: number
}

/**
 * Shows notifications in the top-right corner. Errors are announced at once;
 * success and warning notifications are announced politely. Only success
 * notifications dismiss themselves. Lives inside the router so actions can be links.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((toast: ToastInput) => {
    nextId.current += 1
    const item = { ...toast, id: nextId.current }
    setToasts((current) => [
      ...current.filter((existing) => !toast.key || existing.key !== toast.key),
      item,
    ])
  }, [])

  const dismissToast = useCallback((...keys: string[]) => {
    setToasts((current) => current.filter((toast) => !toast.key || !keys.includes(toast.key)))
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({ showToast, dismissToast }),
    [showToast, dismissToast],
  )
  const errors = toasts.filter((toast) => toast.variant === 'error')
  const others = toasts.filter((toast) => toast.variant !== 'error')

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.stack}>
        {/* An alert is announced when it appears, so this region exists only while it has errors.
            The polite region must already be on the page for its changes to be announced. */}
        {errors.length > 0 && (
          <div className={styles.region} role="alert">
            {errors.map((toast) => (
              <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
            ))}
          </div>
        )}
        <div className={styles.region} role="status" aria-live="polite">
          {others.map((toast) => (
            <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

/** A link when the action goes to another page, a button when it acts on this one. */
function ToastActionControl({ action, onDone }: { action: ToastAction; onDone: () => void }) {
  const select = () => {
    onDone()
    action.onSelect?.()
  }
  if (action.to !== undefined) {
    return (
      <Link className={styles.action} to={action.to} onClick={select}>
        {action.label}
      </Link>
    )
  }
  return (
    <button type="button" className={`${styles.action} ${styles.actionButton}`} onClick={select}>
      {action.label}
    </button>
  )
}

interface ToastProps {
  toast: ToastItem
  /** Stable across renders, so each toast's timer runs once from when it appeared. */
  onDismiss: (id: number) => void
}

function Toast({ toast, onDismiss }: ToastProps) {
  const { id, variant = 'success' } = toast
  useEffect(() => {
    if (variant !== 'success') return
    const timer = window.setTimeout(() => onDismiss(id), TOAST_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [id, variant, onDismiss])

  return (
    <div className={`${styles.toast} ${styles[variant]}`}>
      <img
        className={styles.icon}
        src={assetUrl(ICON_FILES[toast.icon ?? DEFAULT_ICONS[variant]])}
        width={23}
        height={23}
        alt=""
      />
      <div className={styles.body}>
        <p className={styles.title}>{toast.title}</p>
        {toast.lines?.map((line, index) => (
          <p key={index} className={index === 0 ? `${styles.line} ${styles.first}` : styles.line}>
            {line}
          </p>
        ))}
        {toast.action && <ToastActionControl action={toast.action} onDone={() => onDismiss(id)} />}
      </div>
      <button
        type="button"
        className={styles.dismiss}
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
      >
        <img src={assetUrl('toast/close.svg')} width={18} height={18} alt="" />
      </button>
    </div>
  )
}
