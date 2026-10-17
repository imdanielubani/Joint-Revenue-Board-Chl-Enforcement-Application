import { useRef, type KeyboardEvent } from 'react'
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
 * summary"). Arrow keys move between them, as for any tab list.
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
