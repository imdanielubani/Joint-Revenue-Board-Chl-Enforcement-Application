export interface SafeStorage {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
}

/**
 * Browser storage that never throws: it can be blocked (private windows,
 * cleared site data), and the dashboard must still work without it.
 */
function safeStorage(area: () => Storage): SafeStorage {
  return {
    get(key) {
      try {
        return area().getItem(key)
      } catch {
        return null
      }
    },
    set(key, value) {
      try {
        area().setItem(key, value)
      } catch {
        // Storage unavailable: the value lasts only for this page load.
      }
    },
    remove(key) {
      try {
        area().removeItem(key)
      } catch {
        // Nothing to remove.
      }
    },
  }
}

/** Kept until removed, across browser restarts. */
export const storage = safeStorage(() => window.localStorage)

/** Kept until this browser tab is closed. */
export const tabStorage = safeStorage(() => window.sessionStorage)
