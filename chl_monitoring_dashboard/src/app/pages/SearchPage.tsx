import { useSearchParams } from 'react-router'
import { StatePanel } from '@/shared/ui/StatePanel'

/** Results of the top bar's search across vehicles, agents and references. */
export function SearchPage() {
  const query = useSearchParams()[0].get('q')?.trim() ?? ''

  if (!query) {
    return <StatePanel kind="empty" message="Type a plate, agent or reference in the search box." />
  }
  return (
    <StatePanel
      kind="empty"
      message={`Results for “${query}” will appear here once records are connected.`}
    />
  )
}
