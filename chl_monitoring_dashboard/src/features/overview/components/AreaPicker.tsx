import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { levelCaption } from '@/features/geography/areas'
import { assetUrl } from '@/shared/lib/asset-url'
import type { ScopeOption } from '../scope-options'
import styles from './AreaPicker.module.css'

interface AreaPickerProps {
  options: readonly ScopeOption[]
  value: string
  onChange(value: string): void
}

/**
 * The area the Overview reports on: the design's "National overview" control,
 * opening a searchable list of every area the user may see, indented by level.
 */
export function AreaPicker({ options, value, onChange }: AreaPickerProps) {
  const listId = useId()
  const optionId = (index: number) => `${listId}-option-${index}`
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const selected = options.find((option) => option.value === value)
  const matches = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (words.length === 0) return options
    return options.filter((option) => {
      const text = `${option.name} ${levelCaption(option.level)}`.toLowerCase()
      return words.every((word) => text.includes(word))
    })
  }, [options, query])

  const show = () => {
    setQuery('')
    setActive(
      Math.max(
        0,
        options.findIndex((option) => option.value === value),
      ),
    )
    setOpen(true)
  }

  const close = (returnFocus: boolean) => {
    setOpen(false)
    if (returnFocus) buttonRef.current?.focus()
  }

  const choose = (option: ScopeOption | undefined) => {
    if (!option) return
    if (option.value !== value) onChange(option.value)
    close(true)
  }

  // While open: focus the search; close on a click elsewhere.
  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // Keep the highlighted area in view.
  useEffect(() => {
    if (!open) return
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView?.({ block: 'nearest' })
  }, [open, active])

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActive((index) => Math.min(matches.length - 1, index + 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActive((index) => Math.max(0, index - 1))
        break
      case 'PageDown':
        event.preventDefault()
        setActive((index) => Math.min(matches.length - 1, index + 8))
        break
      case 'PageUp':
        event.preventDefault()
        setActive((index) => Math.max(0, index - 8))
        break
      case 'Enter':
        event.preventDefault()
        choose(matches[active])
        break
      case 'Escape':
        event.preventDefault()
        close(true)
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  return (
    <div ref={rootRef} className={styles.picker}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        aria-label={`Monitoring scope: ${selected?.label ?? 'none'}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close(false) : show())}
        onKeyDown={(event) => {
          if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault()
            show()
          }
        }}
      >
        <span className={styles.triggerText}>{selected?.label ?? 'Choose an area'}</span>
        <img src={assetUrl('overview/filter-chevron.svg')} alt="" width={13} height={13} />
      </button>

      {open && (
        <div className={styles.panel}>
          <label className={styles.search}>
            <img src={assetUrl('overview/search.svg')} alt="" width={14} height={14} />
            <span className="visually-hidden">Find an area</span>
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              placeholder="Find an area…"
              autoComplete="off"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={matches[active] ? optionId(active) : undefined}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setActive(0)
              }}
              onKeyDown={onSearchKeyDown}
            />
          </label>
          <ul ref={listRef} id={listId} role="listbox" aria-label="Areas" className={styles.list}>
            {matches.length === 0 ? (
              <li className={styles.empty} role="presentation">
                No areas match “{query.trim()}”.
              </li>
            ) : (
              matches.map((option, index) => {
                const isSelected = option.value === value
                return (
                  <li
                    key={option.value}
                    id={optionId(index)}
                    data-index={index}
                    role="option"
                    aria-selected={isSelected}
                    className={[
                      styles.option,
                      index === active ? styles.active : '',
                      isSelected ? styles.selected : '',
                    ].join(' ')}
                    style={{ paddingLeft: 10 + (query ? 0 : option.depth * 12) }}
                    onPointerDown={(event) => event.preventDefault()}
                    onPointerEnter={() => setActive(index)}
                    onClick={() => choose(option)}
                  >
                    <span className={styles.optionName}>{option.name}</span>
                    <span className={styles.optionLevel}>{levelCaption(option.level)}</span>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
