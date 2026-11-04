/**
 * Whether the user's system allows motion. False where it cannot say, as in
 * tests: something leaving then goes at once, as it did before animations.
 */
export function motionAllowed(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: no-preference)').matches
  )
}

/** How long something takes to leave (a toast): wait this long before removing it. */
export const EXIT_MS = 160
