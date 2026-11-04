import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
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
  // The pill behind the selected tab: where it sits, once measured.
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null)
  // It slides only after it has first been placed, never in from the side on load.
  const [pillReady, setPillReady] = useState(false)

  // What the tabs say, so a parent passing a new but equal list does not re-measure.
  const tabsKey = tabs.map((tab) => `${tab.id}:${tab.label}:${tab.count ?? ''}`).join('|')

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const place = () => {
      const tab = list.querySelector<HTMLElement>('[aria-selected="true"]')
      // Unmeasured (hidden, or no layout): keep the tab's own highlight.
      const next =
        tab && tab.offsetWidth > 0 ? { left: tab.offsetLeft, width: tab.offsetWidth } : null
      // Unchanged: keep the same value, so nothing renders again.
      setPill((current) =>
        current === next ||
        (current && next && current.left === next.left && current.width === next.width)
          ? current
          : next,
      )
    }
    place()
    // Tabs change width when the web font loads or the window resizes.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place)
    observer?.observe(list)
    return () => observer?.disconnect()
  }, [value, tabsKey])

  useEffect(() => {
    if (!pill || pillReady) return
    const frame = requestAnimationFrame(() => setPillReady(true))
    return () => cancelAnimationFrame(frame)
  }, [pill, pillReady])

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
      data-pill={pill ? '' : undefined}
      onKeyDown={onKeyDown}
    >
      {pill && (
        <span
          aria-hidden="true"
          className={pillReady ? `${styles.pill} ${styles.pillReady}` : styles.pill}
          style={{ width: pill.width, transform: `translateX(${pill.left}px)` }}
        />
      )}
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
