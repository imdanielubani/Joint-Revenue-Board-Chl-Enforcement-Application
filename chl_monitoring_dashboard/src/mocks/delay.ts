/** A short wait, so sample data shows the same loading states as the backend. */
export function delay(ms: number = import.meta.env.MODE === 'test' ? 0 : 400): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
