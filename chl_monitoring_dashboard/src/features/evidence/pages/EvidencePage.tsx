import { useCallback, useId, useMemo } from 'react'
import { useAgents } from '@/features/agents/agents.queries'
import { useCurrentUser } from '@/features/auth/session-context'
import { useAreas } from '@/features/geography/areas.queries'
import { scopeOptions, type ScopeOption } from '@/features/geography/scope-options'
import { OverviewFilterBar } from '@/features/overview/components/OverviewHeader'
import { periodLabel } from '@/features/overview/overview-period'
import { useOverviewFilters } from '@/features/overview/use-overview-filters'
import { assetUrl } from '@/shared/lib/asset-url'
import { HeadlineFigures } from '@/shared/ui/HeadlineFigures'
import { PageHero, RefreshButton } from '@/shared/ui/PageHero'
import { SegmentedTabs } from '@/shared/ui/SegmentedTabs'
import { StatePanel } from '@/shared/ui/StatePanel'
import { panelId, tabId } from '@/shared/ui/tab-ids'
import cards from '../components/EvidenceCards.module.css'
import { EvidencePanel, NotesPanel } from '../components/EvidencePanels'
import { EvidenceViewer } from '../components/EvidenceViewer'
import { photosIn, type EvidenceGroup } from '../evidence-display'
import { useEvidenceMonitoring } from '../evidence.queries'
import type { EvidenceEntry } from '../evidence.schemas'
import { useEvidenceView, type EvidenceView } from '../use-evidence-view'
import styles from './EvidencePage.module.css'

/** The kind of evidence a tab lists, which the viewer shows first. */
const GROUP_FOR: Record<EvidenceView, EvidenceGroup | null> = {
  records: null,
  vehicle: 'vehicle',
  etag: 'etag',
  notes: null,
}

/**
 * Evidence records (SRD 9): a read-only viewer for evidence captured through
 * the mobile application — photographs, their capture metadata, agents' notes
 * and the related records. It never uploads, replaces or edits evidence.
 */
export function EvidencePage() {
  const user = useCurrentUser()
  const areas = useAreas()
  const scopes = useMemo(() => scopeOptions(user, areas.data), [user, areas.data])
  const [first] = scopes
  if (!first) {
    return (
      <StatePanel
        kind="empty"
        message="No areas are assigned to your account in CHL yet, so there is no evidence to show. Ask your administrator to assign your areas."
      />
    )
  }
  return <EvidenceContent scopes={scopes} fallbackScope={first} areasPending={areas.isPending} />
}

function EvidenceContent({
  scopes,
  fallbackScope,
  areasPending,
}: {
  scopes: readonly ScopeOption[]
  /** The area shown when the address names none, or one the user may not see. */
  fallbackScope: ScopeOption
  /** True until CHL's area tree has loaded; until then only the user's own areas are known. */
  areasPending: boolean
}) {
  const tabsId = useId()
  const agentList = useAgents()
  const filter = useOverviewFilters({ scopes, fallbackScope, areasPending, agents: agentList.data })
  const { scope, filters } = filter
  const page = useEvidenceView()

  const query = useEvidenceMonitoring(filters, { enabled: !filter.waiting })
  const monitoring = query.data
  const records = useMemo(() => monitoring?.records ?? [], [monitoring])
  const subtitle = `${scope.name} · ${periodLabel(filters.range, filters)}`
  const open = records.find((entry) => entry.violation.id === page.record) ?? null

  const { openRecord } = page
  const onOpen = useCallback((entry: EvidenceEntry) => openRecord(entry.violation.id), [openRecord])

  const counts = useMemo(() => {
    const photos = (group: EvidenceGroup) =>
      records.reduce((sum, entry) => sum + photosIn(entry, group).length, 0)
    const withGroup = (group: EvidenceGroup) =>
      records.filter((entry) => photosIn(entry, group).length > 0).length
    return {
      photographs: records.reduce((sum, entry) => sum + entry.photographs.length, 0),
      vehiclePhotos: photos('vehicle'),
      etagPhotos: photos('etag'),
      vehicleRecords: withGroup('vehicle'),
      etagRecords: withGroup('etag'),
      notes: records.reduce((sum, entry) => sum + entry.notes.length, 0),
    }
  }, [records])

  return (
    <div className={styles.page}>
      <div>
        <PageHero
          title="Evidence records"
          lede="A read-only viewer for evidence captured through the mobile application."
          section="Enforcement"
          icons="evidence"
          actions={
            <RefreshButton
              refreshing={query.isFetching && !query.isPending}
              onRefresh={() => void query.refetch()}
            />
          }
        />
        <OverviewFilterBar
          scopes={scopes}
          scope={scope.value}
          onScopeChange={filter.setScope}
          range={filters.range}
          onRangeChange={filter.setRange}
          period={filters}
          onCustomPeriodChange={filter.setCustomPeriod}
          people={{
            organizations: filter.organizations,
            organization: filters.organization,
            onOrganizationChange: filter.setOrganization,
            agents: filter.agentOptions,
            agentId: filters.agentId,
            onAgentChange: filter.setAgent,
            onClear: filter.clearPeopleFilters,
          }}
          checkedAt={query.dataUpdatedAt}
          latestReceivedAt={monitoring?.latestReceivedAt}
        />
      </div>

      {filter.waiting || query.isPending ? (
        <StatePanel kind="loading" message="Loading evidence…" />
      ) : !monitoring ? (
        <StatePanel kind="error" error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          {query.isError && (
            <p className={styles.stale} role="status">
              The latest figures could not be loaded; these are from the last successful check.
            </p>
          )}
          <HeadlineFigures
            items={[
              {
                label: 'Evidence records',
                value: records.length,
                icon: 'overview/kpi-doc.svg',
                note: 'One for each violation with evidence',
                to: page.linkTo('records'),
              },
              {
                label: 'Photographs',
                value: counts.photographs,
                icon: 'evidence/kpi-camera.svg',
                note: 'Captured through the mobile camera',
                to: page.linkTo('records'),
              },
              {
                label: 'Vehicle evidence',
                value: counts.vehiclePhotos,
                icon: 'evidence/kpi-vehicle.svg',
                note: 'Front, rear, side and haulage bay',
                to: page.linkTo('vehicle'),
              },
              {
                label: 'E-Tag evidence',
                value: counts.etagPhotos,
                icon: 'evidence/kpi-tag.svg',
                note: 'Missing, fake/invalid and other',
                to: page.linkTo('etag'),
              },
            ]}
          />

          <section className={styles.views} aria-label="Evidence views">
            <SegmentedTabs<EvidenceView>
              idBase={tabsId}
              label="Evidence views"
              tabs={[
                { id: 'records', label: 'Evidence records', count: records.length },
                { id: 'vehicle', label: 'Vehicle Evidence', count: counts.vehicleRecords },
                { id: 'etag', label: 'E-Tag Evidence', count: counts.etagRecords },
                { id: 'notes', label: 'Enforcement Notes', count: counts.notes },
              ]}
              value={page.view}
              onChange={page.setView}
            />
            <div id={panelId(tabsId)} role="tabpanel" aria-labelledby={tabId(tabsId, page.view)}>
              {page.view === 'records' && (
                <EvidencePanel
                  records={records}
                  group={null}
                  title="Evidence records"
                  subtitle={`Photographs captured with each violation · ${subtitle}`}
                  onOpen={onOpen}
                />
              )}
              {page.view === 'vehicle' && (
                <EvidencePanel
                  records={records}
                  group="vehicle"
                  title="Vehicle Evidence"
                  subtitle={`Front, rear, side and haulage-bay photographs · ${subtitle}`}
                  onOpen={onOpen}
                />
              )}
              {page.view === 'etag' && (
                <EvidencePanel
                  records={records}
                  group="etag"
                  title="E-Tag Evidence"
                  subtitle={`Missing-tag, fake/invalid-tag and other relevant photographs · ${subtitle}`}
                  onOpen={onOpen}
                />
              )}
              {page.view === 'notes' && (
                <NotesPanel
                  records={records}
                  subtitle={`Agents’ submitted notes · ${subtitle}`}
                  onOpen={onOpen}
                />
              )}
            </div>
          </section>

          {open && (
            <EvidenceViewer
              key={open.id}
              entry={open}
              startGroup={GROUP_FOR[page.view]}
              onClose={() => page.openRecord(null)}
            />
          )}
          {page.record && !open && (
            <p className={styles.stale} role="status">
              No evidence for {page.record} in this area and period. Choose another area or period
              to find it.
            </p>
          )}

          <aside className={cards.pageNote}>
            <img src={assetUrl('verifications/note-info.svg')} alt="" width={16} height={16} />
            <div>
              <p className={cards.pageNoteTitle}>Read-only evidence.</p>
              <p className={cards.pageNoteText}>
                The dashboard does not upload replacement evidence, edit photographs or alter
                captured metadata. Evidence is captured through the mobile camera; gallery uploads
                are not accepted during enforcement evidence collection.
              </p>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}
