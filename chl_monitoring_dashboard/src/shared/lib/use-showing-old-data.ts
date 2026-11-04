import { useIsFetching } from '@tanstack/react-query'

/**
 * True while a page still shows its previous figures as new ones load — after
 * the area, period or a filter changed. The once-a-minute refreshes do not
 * count: they never replace what is shown with older figures.
 */
export function useShowingOldData(): boolean {
  return (
    useIsFetching({
      predicate: (query) =>
        query.observers.some((observer) => observer.getCurrentResult().isPlaceholderData),
    }) > 0
  )
}
