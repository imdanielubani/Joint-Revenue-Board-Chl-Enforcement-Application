import { useCallback, type RefObject } from 'react'
import { EXIT_MS, motionAllowed } from './motion'

/**
 * Leaves a still copy of `node` in its place with `leavingClass`, and takes it
 * away when its transition ends. The copy cannot be clicked, focused or read.
 */
function leave(node: HTMLElement, leavingClass: string) {
  if (!node.isConnected || !motionAllowed()) return
  const copy = node.cloneNode(true) as HTMLElement
  copy.setAttribute('aria-hidden', 'true')
  copy.setAttribute('inert', '')
  copy.style.pointerEvents = 'none'
  // Never two elements with one id, even for a moment.
  for (const element of [copy, ...copy.querySelectorAll<HTMLElement>('[id]')]) {
    element.removeAttribute('id')
  }
  // Placed as it is now, without replaying its entrance; then it leaves.
  copy.style.transition = 'none'
  node.after(copy)
  void copy.offsetWidth
  copy.style.transition = ''
  copy.classList.add(leavingClass)
  const remove = () => copy.remove()
  copy.addEventListener('transitionend', remove, { once: true })
  window.setTimeout(remove, EXIT_MS + 60)
}

/**
 * A ref that lets a popup or menu animate out however it is closed. React
 * removes it at once, as before — focus, scrolling and the page behave exactly
 * as they did — while a still copy animates out in its place. Where motion is
 * not allowed (or the setting is unknown, as in tests) it just goes. `ref`, if
 * given, is kept pointing at the element too.
 */
export function useExitRef<T extends HTMLElement>(leavingClass: string, ref?: RefObject<T | null>) {
  return useCallback(
    (node: T | null) => {
      if (ref) ref.current = node
      if (!node) return
      // Runs just before the element is taken away, while it is still on the page.
      return () => {
        if (ref) ref.current = null
        leave(node, leavingClass)
      }
    },
    [leavingClass, ref],
  )
}
