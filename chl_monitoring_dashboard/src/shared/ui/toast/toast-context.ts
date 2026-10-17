import { createContext, useContext } from 'react'

export type ToastVariant = 'success' | 'error'

/** The icon beside the title. Defaults: `check` for success, `warning` for errors. */
export type ToastIcon = 'check' | 'warning' | 'account'

export interface ToastInput {
  /** Success notifications dismiss themselves; error ones stay until dismissed. */
  variant?: ToastVariant
  icon?: ToastIcon
  title: string
  /** One paragraph per entry, under the title. */
  lines?: string[]
  /** A link under the text, such as "Contact CHL support". */
  action?: { label: string; to: string }
  /** Showing a toast with the same key replaces the earlier one instead of stacking. */
  key?: string
}

export interface ToastContextValue {
  /** Shows a notification in the top-right corner. */
  showToast(toast: ToastInput): void
  /** Removes the notifications with these keys, if they are showing. */
  dismissToast(...keys: string[]): void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast must be used inside <ToastProvider>.')
  return value
}
