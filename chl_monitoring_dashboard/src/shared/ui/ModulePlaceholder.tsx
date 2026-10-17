import { StatePanel } from './StatePanel'

/**
 * Stands in for a module's screen until it is built from the design. The page's title
 * is in the top bar, so this shows only what the module will hold.
 */
export function ModulePlaceholder({ description }: { description: string }) {
  return (
    <StatePanel
      kind="empty"
      message={`${description} This screen will be built from the design.`}
    />
  )
}
