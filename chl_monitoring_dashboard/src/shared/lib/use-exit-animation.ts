import { useLayoutEffect, type RefObject } from 'react'
import { EXIT_MS, motionAllowed } from './motion'

/**
 * Lets a popup or menu animate out however it is closed. React removes it at
 * once, as before — focus, scrolling and the page behave exactly as they did —
 * and a still copy is left in its place with `leavingClass`, then taken away
 * when its transition ends. The copy cannot be clicked, focused or read. Where
 * motion is not allowed (or the setting is unknown, as in tests) it just goes.
 */
export function useExitAnimation(ref: RefObject<HTMLElement | null>, leavingClass: string) {
  useLayoutEffect(() => {
    const node = ref.current
    return () => {
      if (!node?.isConnected || !motionAllowed()) return
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
  }, [ref, leavingClass])
}
