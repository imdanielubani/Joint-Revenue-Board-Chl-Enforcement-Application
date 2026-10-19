import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router'
import { assetUrl } from '@/shared/lib/asset-url'
import styles from './RowActions.module.css'

/** A menu item opening another page. */
export interface RowAction {
  label: string
  to: string
}

/** A menu item acting on this page, such as opening a popup. */
export interface RowCommand {
  label: string
  onSelect(): void
}

interface RowActionsProps {
  /** Names the row, for the button: "Actions for KDN-512-ZA". */
  label: string
  actions: readonly (RowAction | RowCommand)[]
}

const MENU_WIDTH = 180

/**
 * The "⋮" button at the end of a record row, opening a short menu of links and actions.
 * The menu is placed against the window, so a scrolling table never clips it.
 */
export function RowActions({ label, actions }: RowActionsProps) {
  const menuId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  const close = useCallback((returnFocus: boolean) => {
    setPosition(null)
    if (returnFocus) buttonRef.current?.focus()
  }, [])

  const open = () => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    setPosition({
      top: rect.bottom + 6,
      left: Math.max(8, rect.right - MENU_WIDTH),
    })
  }

  // While open: focus the first item; close on a click elsewhere, a scroll or a resize.
  useEffect(() => {
    if (!position) return
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      close(false)
    }
    const onMove = () => close(false)
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
  }, [position, close])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
    const index = items.indexOf(document.activeElement as HTMLElement)
    const focusAt = (next: number) => items[(next + items.length) % items.length]?.focus()
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusAt(index + 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusAt(index - 1)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close(true)
    } else if (event.key === 'Tab') {
      close(false)
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={styles.button}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={position !== null}
        aria-controls={position ? menuId : undefined}
        onClick={() => (position ? close(false) : open())}
      >
        <img src={assetUrl('overview/kebab.svg')} alt="" width={21} height={21} />
      </button>
      {position && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          className={styles.menu}
          style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
          onKeyDown={onKeyDown}
        >
          {actions.map((action) =>
            'to' in action ? (
              <Link
                key={action.label}
                role="menuitem"
                className={styles.item}
                to={action.to}
                onClick={() => close(false)}
              >
                {action.label}
              </Link>
            ) : (
              <button
                key={action.label}
                type="button"
                role="menuitem"
                className={styles.item}
                onClick={() => {
                  // Back to the "⋮" button first, so whatever opens returns focus there.
                  close(true)
                  action.onSelect()
                }}
              >
                {action.label}
              </button>
            ),
          )}
        </div>
      )}
    </>
  )
}
