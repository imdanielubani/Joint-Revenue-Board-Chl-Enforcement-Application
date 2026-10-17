import { createContext, useContext } from 'react'

export interface ToastInput {
  title: string
  /** One paragraph per entry, under the title. */
  lines?: string[]
}

export interface ToastContextValue {
  /** Shows a success notification in the top-right corner. */
  showToast(toast: ToastInput): void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast must be used inside <ToastProvider>.')
  return value
}
