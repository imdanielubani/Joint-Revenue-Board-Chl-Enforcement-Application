/**
 * localStorage that never throws: it can be blocked (private windows,
 * cleared site data), and the dashboard must still work without it.
 */
export const storage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      // Storage unavailable: the value lasts only for this page load.
    }
  },
  remove(key: string): void {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Nothing to remove.
    }
  },
}
