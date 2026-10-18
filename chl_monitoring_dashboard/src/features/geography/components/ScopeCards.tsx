import { useId, useState } from 'react'
import type { GeoLevel } from '@/features/auth/auth.schemas'
import { assetUrl } from '@/shared/lib/asset-url'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import { FilterSelect } from '@/shared/ui/FilterBar'
import { SegmentedTabs } from '@/shared/ui/SegmentedTabs'
import { panelId, tabId } from '@/shared/ui/tab-ids'
import { MONITORING_SCOPES } from '../monitoring-scopes'
import type { ScopeOption } from '../scope-options'
import styles from './ScopeCards.module.css'

/**
 * "Monitoring scope": eight views of the same enforcement records (SRD 4).
 * A level, then one of the areas CHL configures at that level within the
 * user's own; no parent-child hierarchy is assumed between them.
 */
export function MonitoringScopeCard({
  scopes,
  current,
  onScopeChange,
  recordWindow,
}: {
  /** The areas the user may look at, as CHL configures them. */
  scopes: readonly ScopeOption[]
  current: ScopeOption
  onScopeChange(scope: string): void
  /** "14-day record window · through 18 Oct 2026". */
  recordWindow: string
}) {
  const idBase = useId()
  const [level, setLevel] = useState<GeoLevel>(current.level)
  const atLevel = scopes.filter((option) => option.level === level)
  const scope = MONITORING_SCOPES.find((entry) => entry.level === level)
  const currentIsHere = atLevel.some((option) => option.value === current.value)

  // A level shows its areas; the first is chosen at once, so the page follows the tab.
  const chooseLevel = (next: GeoLevel) => {
    setLevel(next)
    const first = scopes.find((option) => option.level === next)
    if (first && next !== current.level) onScopeChange(first.value)
  }

  return (
    <DashboardCard
      title="Monitoring scope"
      subtitle="Eight views of the same enforcement records, not a geographical hierarchy"
      icon="geography/card-scope.svg"
      bodyClassName={styles.body}
    >
      <SegmentedTabs<GeoLevel>
        idBase={idBase}
        label="Monitoring scope"
        tabs={MONITORING_SCOPES.map((entry) => ({ id: entry.level, label: entry.label }))}
        value={level}
        onChange={chooseLevel}
        className={styles.levels}
      />
      <div
        id={panelId(idBase)}
        role="tabpanel"
        aria-labelledby={tabId(idBase, level)}
        className={styles.row}
      >
        <div className={styles.choice}>
          <img src={assetUrl('overview/location-pin.svg')} alt="" width={16} height={16} />
          {atLevel.length === 0 ? (
            <span className={styles.none}>
              {level === 'national'
                ? 'Consolidated national visibility is for authorized users.'
                : `CHL has no ${scope?.plural ?? 'areas'} configured within your areas.`}
            </span>
          ) : (
            <>
              <span className={styles.levelName}>
                {level === 'national' ? 'National (authorized)' : scope?.label}
              </span>
              <span className={styles.slash} aria-hidden="true">
                /
              </span>
              <FilterSelect
                label={`${scope?.label ?? 'Area'} to show`}
                value={currentIsHere ? current.value : ''}
                active
                options={[
                  ...(currentIsHere ? [] : [{ value: '', label: 'Choose an area' }]),
                  ...atLevel.map((option) => ({
                    value: option.value,
                    label: level === 'national' ? 'All permitted areas' : option.name,
                  })),
                ]}
                onChange={(value) => {
                  if (value) onScopeChange(value)
                }}
              />
            </>
          )}
        </div>
        <p className={styles.window}>{recordWindow}</p>
      </div>
    </DashboardCard>
  )
}
