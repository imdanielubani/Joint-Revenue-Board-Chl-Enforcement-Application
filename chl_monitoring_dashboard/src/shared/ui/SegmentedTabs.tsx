import { useEffect, useRef, type KeyboardEvent } from 'react'
import { panelId, tabId } from './tab-ids'
import styles from './SegmentedTabs.module.css'

export interface SegmentedTab<T extends string> {
  id: T
  label: string
  /** The small count beside the label. */
  count?: number
}

interface SegmentedTabsProps<T extends string> {
  /** Prefix for the tab ids; the panel is `${idBase}-panel`, labelled by the selected tab. */
  idBase: string
  label: string
  tabs: readonly SegmentedTab<T>[]
  value: T
  onChange(value: T): void
  className?: string
}

/**
 * Tabs drawn as a segmented control ("By agent · By location · Corporate
 * summary"). Arrow keys move between them, as for any tab list. Where the
 * labels cannot all fit, the strip scrolls sideways rather than squash them.
 */
export function SegmentedTabs<T extends string>({
  idBase,
  label,
  tabs,
  value,
  onChange,
  className,
}: SegmentedTabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null)

  // Where the strip scrolls, keep the selected tab in view. Only the strip
  // moves, never the page, so the page does not jump on load.
  useEffect(() => {
    const reveal = () => {
      const list = listRef.current
      const tab = list?.querySelector<HTMLElement>('[aria-selected="true"]')
      if (!list || !tab || list.scrollWidth <= list.clientWidth) return
      const start =
        tab.getBoundingClientRect().left - list.getBoundingClientRect().left + list.scrollLeft
      const end = start + tab.offsetWidth
      if (start < list.scrollLeft) list.scrollLeft = start
      else if (end > list.scrollLeft + list.clientWidth) list.scrollLeft = end - list.clientWidth
    }
    reveal()
    // The labels widen once the web font loads: measure again then.
    let active = true
    void document.fonts?.ready.then(() => {
      if (active) reveal()
    })
    return () => {
      active = false
    }
  }, [value])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((tab) => tab.id === value)
    let next: number
    switch (event.key) {
      case 'ArrowRight':
        next = (index + 1) % tabs.length
        break
      case 'ArrowLeft':
        next = (index - 1 + tabs.length) % tabs.length
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = tabs.length - 1
        break
      default:
        return
    }
    const target = tabs[next]
    if (!target) return
    event.preventDefault()
    onChange(target.id)
    listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      className={className ? `${styles.tabs} ${className}` : styles.tabs}
      onKeyDown={onKeyDown}
    >
      {tabs.map((tab) => {
        const selected = tab.id === value
        return (
          <button
            key={tab.id}
            id={tabId(idBase, tab.id)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId(idBase)}
            tabIndex={selected ? 0 : -1}
            className={selected ? `${styles.tab} ${styles.selected}` : styles.tab}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
            {tab.count !== undefined && <span className={styles.count}>{tab.count}</span>}
          </button>
        )
      })}
    </div>
  )
}
