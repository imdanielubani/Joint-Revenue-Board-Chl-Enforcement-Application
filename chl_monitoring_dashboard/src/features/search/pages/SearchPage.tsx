import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useCurrentUser } from '@/features/auth/session-context'
import { useAreas } from '@/features/geography/areas.queries'
import { scopeOptions, type ScopeOption } from '@/features/geography/scope-options'
import { PageHero, RefreshButton } from '@/shared/ui/PageHero'
import { StatePanel } from '@/shared/ui/StatePanel'
import { SearchSkeleton } from '../components/SearchSkeleton'
import { MIN_QUERY_LENGTH, isSearchable } from '../search-match'
import { SearchResultsList } from '../components/SearchResultsList'
import { resultsSummary, totalResults } from '../search-display'
import { useSearch } from '../search.queries'
import styles from './SearchPage.module.css'

/**
 * Search results: what the top bar's search found in the user's areas —
 * vehicles by plate, agents by name or ID, and verifications, violations,
 * payment requests and trips by reference. Each leads to its own page. Read-only.
 */
export function SearchPage() {
  const query = useSearchParams()[0].get('q')?.trim() ?? ''
  const user = useCurrentUser()
  const areas = useAreas()
  const scopes = useMemo(() => scopeOptions(user, areas.data), [user, areas.data])
  const [first] = scopes
  if (!first) {
    return (
      <StatePanel
        kind="empty"
        message="No areas are assigned to your account in CHL yet, so there is nothing to search. Ask your administrator to assign your areas."
      />
    )
  }
  // The user's own widest area: everything they may see.
  return <SearchContent key={query} query={query} scope={first} />
}

function SearchContent({ query, scope }: { query: string; scope: ScopeOption }) {
  const searchable = isSearchable(query)
  const search = useSearch({ query, scope: scope.value }, { enabled: searchable })
  const data = search.data

  return (
    <div className={styles.page}>
      <PageHero
        title="Search results"
        lede={
          query
            ? `Results for “${query}” in ${scope.name}: vehicles, agents, verifications, violations, payment requests and trips. Read-only.`
            : `Search ${scope.name} for vehicles by plate, agents by name or ID, and records by reference. Read-only.`
        }
        section="Workspace"
        icons="search"
        actions={
          searchable ? (
            <RefreshButton
              refreshing={search.isFetching && !search.isPending}
              onRefresh={() => void search.refetch()}
            />
          ) : undefined
        }
      />

      {!query ? (
        <StatePanel kind="empty" message="Type a plate, agent or reference in the search box." />
      ) : !searchable ? (
        <StatePanel
          kind="empty"
          message={`Type at least ${MIN_QUERY_LENGTH} characters of a plate, agent or reference.`}
        />
      ) : search.isPending ? (
        <SearchSkeleton message={`Searching ${scope.name}…`} />
      ) : !data ? (
        <StatePanel kind="error" error={search.error} onRetry={() => void search.refetch()} />
      ) : totalResults(data) === 0 ? (
        <StatePanel
          kind="empty"
          message={`Nothing matches “${query}” in ${scope.name}. Check the plate or reference, or search for part of it.`}
        />
      ) : (
        <>
          {search.isError && (
            <p className={styles.stale} role="status">
              The latest results could not be loaded; these are from the last successful search.
            </p>
          )}
          <p className={styles.summary} role="status">
            {resultsSummary(data)}
          </p>
          <SearchResultsList results={data} />
        </>
      )}
    </div>
  )
}
