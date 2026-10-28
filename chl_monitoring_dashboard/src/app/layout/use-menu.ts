import { useEffect, useRef, type KeyboardEvent, type RefObject } from 'react'

/**
 * A pop-up menu's behaviour, as the account menu has it: the first item takes
 * focus when it opens; arrows, Home and End move between items; Escape closes
 * it and returns focus to its button; Tab or a click outside closes it.
 * `onClose` must be stable (useCallback): the menu sets itself up once.
 */
export function useMenu(triggerRef: RefObject<HTMLElement | null>, onClose: () => void) {
  const menuRef = useRef<HTMLDivElement>(null)

  const items = () => [
    ...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []),
  ]

  useEffect(() => {
    items()[0]?.focus()
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [onClose, triggerRef])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const list = items()
    const index = list.indexOf(document.activeElement as HTMLElement)
    const focusAt = (next: number) => list[(next + list.length) % list.length]?.focus()
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focusAt(index + 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        focusAt(index - 1)
        break
      case 'Home':
        event.preventDefault()
        focusAt(0)
        break
      case 'End':
        event.preventDefault()
        focusAt(list.length - 1)
        break
      case 'Escape':
        event.preventDefault()
        onClose()
        triggerRef.current?.focus()
        break
      case 'Tab':
        onClose()
        break
    }
  }

  return { menuRef, onKeyDown }
}
