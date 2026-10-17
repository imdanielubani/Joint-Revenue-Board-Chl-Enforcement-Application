import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { assetUrl } from '@/shared/lib/asset-url'
import { ToastContext, type ToastContextValue, type ToastInput } from './toast-context'
import styles from './Toast.module.css'

/** How long a notification stays before it dismisses itself. */
export const TOAST_DURATION_MS = 6000

interface ToastItem extends ToastInput {
  id: number
}

/** Shows notifications in the top-right corner; each one can be dismissed. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((toast: ToastInput) => {
    nextId.current += 1
    setToasts((current) => [...current, { ...toast, id: nextId.current }])
  }, [])

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

interface ToastProps {
  toast: ToastItem
  /** Stable across renders, so each toast's timer runs once from when it appeared. */
  onDismiss: (id: number) => void
}

function Toast({ toast, onDismiss }: ToastProps) {
  const { id } = toast
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(id), TOAST_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [id, onDismiss])

  return (
    <div className={styles.toast}>
      <img
        className={styles.icon}
        src={assetUrl('toast/check-circle.svg')}
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
