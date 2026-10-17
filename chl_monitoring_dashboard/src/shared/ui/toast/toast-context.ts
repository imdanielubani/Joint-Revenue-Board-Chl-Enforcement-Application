import { createContext, useContext } from 'react'

/**
 * success (green): confirms something; dismisses itself, announced politely.
 * warning (amber): needs the user's attention, not urgent; stays until dismissed, announced politely.
 * error (red): something failed; stays until dismissed, announced at once.
 */
export type ToastVariant = 'success' | 'warning' | 'error'

/** The icon beside the title. Defaults: `check` for success, `clock` for warning, `warning` for error. */
export type ToastIcon = 'check' | 'clock' | 'warning' | 'account'

/**
 * The underlined action under the text. With `to` it is a link to another page; without,
 * a button that runs `onSelect` on the current page. Either way it dismisses the notification.
 */
export type ToastAction =
  | { label: string; to: string; onSelect?: () => void }
  | { label: string; to?: undefined; onSelect: () => void }

export interface ToastInput {
  variant?: ToastVariant
  icon?: ToastIcon
  title: string
  /** One paragraph per entry, under the title. */
  lines?: string[]
  /** A link under the text, such as "Contact CHL support". */
  action?: ToastAction
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
