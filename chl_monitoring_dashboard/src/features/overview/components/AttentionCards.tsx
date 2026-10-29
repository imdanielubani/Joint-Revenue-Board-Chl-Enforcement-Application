import { useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { assetUrl } from '@/shared/lib/asset-url'
import { formatNumber } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import { SegmentedTabs } from '@/shared/ui/SegmentedTabs'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import { panelId, tabId } from '@/shared/ui/tab-ids'
import {
  actionStatusLabel,
  actionStatusTone,
  followUpLabel,
  plural,
  share,
} from '../overview-display'
import type { CaseItem, Overview } from '../overview.schemas'
import { useModuleLink } from '@/features/auth/use-module-link'
import styles from './AttentionCards.module.css'

/** How many entries a card lists before pointing to the full page. */
const LIST_LIMIT = 4
const TOP_LOCATIONS = 5

function MaybeLink({
  to,
  className,
  children,
}: {
  to: string | undefined
  className: string | undefined
  children: ReactNode
}) {
  return to ? (
    <Link className={`${className} ${styles.linked}`} to={to}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  )
}

/* -------------------------------------------------------------- Locations */

/** "Activity by enforcement location": the busiest locations, by verifications. */
export function LocationActivityCard({ locations }: { locations: Overview['locations'] }) {
  const link = useModuleLink()
  const top = [...locations]
    .sort((a, b) => b.verifications - a.verifications)
    .slice(0, TOP_LOCATIONS)
  const busiest = top[0]?.verifications ?? 0

  return (
    <DashboardCard
      title="Activity by enforcement location"
      subtitle="Recorded activity · not live tracking"
      icon="overview/card-location.svg"
      footer={{ label: 'Open geographical monitoring', to: link('geography', paths.geography) }}
    >
      <div className={styles.locationsTop}>
        <span className={styles.locationsIcon}>
          <img src={assetUrl('overview/location-pin.svg')} alt="" width={18} height={18} />
        </span>
        <div className={styles.locationsSummary}>
          <p className={styles.locationsCount}>{plural(locations.length, 'location')}</p>
          <p className={styles.small}>Observed verification and enforcement activity</p>
        </div>
        <span className={styles.chip}>Top locations</span>
      </div>
      {top.length === 0 ? (
        <p className={styles.empty}>No location recorded activity in this period.</p>
      ) : (
        <ol className={styles.list}>
          {top.map((location, index) => (
            <li key={location.id}>
              <MaybeLink
                className={styles.location}
                to={link('geography', `${paths.geography}?scope=${location.id}`)}
              >
                <span className={index === 0 ? `${styles.rank} ${styles.rankFirst}` : styles.rank}>
                  {index + 1}
                </span>
                <span className={styles.locationMain}>
                  <span className={styles.locationName}>{location.name}</span>
                  <span className={styles.small}>
                    {location.area} · {plural(location.agents, 'agent')} ·{' '}
                    {plural(location.violationsIssued, 'violation')}
                  </span>
                  <span className={styles.track}>
                    <span
                      className={styles.fill}
                      style={{ width: `${share(location.verifications, busiest)}%` }}
                    />
                  </span>
                </span>
                <span className={styles.locationFigure}>
                  <strong>{formatNumber(location.verifications)}</strong>
                  <span>verification{location.verifications === 1 ? '' : 's'}</span>
                </span>
              </MaybeLink>
            </li>
          ))}
        </ol>
      )}
    </DashboardCard>
  )
}

/* ------------------------------------------------------------------ Cases */

type CaseView = 'unresolved' | 'escalated'

/**
 * A case's status pill. Escalated and Payment Pending carry the design's icons;
 * any other status (Cancelled, or one CHL adds later) shows as returned.
 */
function CaseStatus({ status }: { status: CaseItem['status'] }) {
  if (status === 'escalated') {
    return (
      <StatusLabel tone="danger" icon="overview/status-escalated.svg">
        Escalated
      </StatusLabel>
    )
  }
  if (status === 'payment_pending') {
    return (
      <StatusLabel tone="amber" icon="overview/status-pending.svg">
        Payment Pending
      </StatusLabel>
    )
  }
  return <StatusLabel tone={actionStatusTone(status)}>{actionStatusLabel(status)}</StatusLabel>
}

/** What a page is narrowed to, for the links to the full lists. */
interface Narrowing {
  /** The area the page shows. */
  scope?: string | undefined
  /** The agent the page shows. */
  agentId?: string | undefined
}

/** Adds the page's area and agent to a module link, where the page is narrowed to them. */
function narrowed(to: string, { scope, agentId }: Narrowing): string {
  const params = [
    scope ? `scope=${encodeURIComponent(scope)}` : null,
    agentId ? `agent=${encodeURIComponent(agentId)}` : null,
  ].filter(Boolean)
  return params.length > 0 ? `${to}${to.includes('?') ? '&' : '?'}${params.join('&')}` : to
}

interface CasesCardProps extends Narrowing {
  cases: Overview['cases']
  title?: string
  subtitle?: string
  /** Above the tabs, such as the counts the cases come from. */
  intro?: ReactNode
  /** Under the list, such as repeat vehicles still waiting for follow-up. */
  children?: ReactNode
}

/** "Cases requiring attention": unresolved cases, or only the escalated ones. */
export function CasesCard({
  cases,
  title = 'Cases requiring attention',
  subtitle = 'Unresolved cases, including escalated violations',
  scope,
  agentId,
  intro,
  children,
}: CasesCardProps) {
  const link = useModuleLink()
  const idBase = useId()
  const [view, setView] = useState<CaseView>('unresolved')
  const items = (
    view === 'escalated' ? cases.items.filter((item) => item.status === 'escalated') : cases.items
  ).slice(0, LIST_LIMIT)

  return (
    <DashboardCard
      title={title}
      subtitle={subtitle}
      icon="overview/card-cases.svg"
      footer={{
        label: 'View all cases',
        to: link('violations', narrowed(paths.violations, { scope, agentId })),
      }}
    >
      {intro}
      <SegmentedTabs<CaseView>
        idBase={idBase}
        label="Cases to show"
        tabs={[
          { id: 'unresolved', label: 'Unresolved', count: cases.unresolved },
          { id: 'escalated', label: 'Escalated', count: cases.escalated },
        ]}
        value={view}
        onChange={setView}
      />
      <div id={panelId(idBase)} role="tabpanel" aria-labelledby={tabId(idBase, view)}>
        {items.length === 0 ? (
          <p className={styles.empty}>
            {view === 'escalated'
              ? 'No escalated cases in this period.'
              : 'No unresolved cases in this period.'}
          </p>
        ) : (
          <ul className={styles.cases}>
            {items.map((item) => (
              <li key={item.id}>
                <MaybeLink
                  className={styles.case}
                  to={link('violations', `${paths.violations}?case=${item.id}`)}
                >
                  <span className={styles.caseHead}>
                    <span className={styles.plate}>{item.plate}</span>
                    <CaseStatus status={item.status} />
                  </span>
                  <span className={styles.caseCategory}>
                    {item.category}
                    <img
                      src={assetUrl('overview/arrow-up-right.svg')}
                      alt=""
                      width={14}
                      height={14}
                    />
                  </span>
                  <span className={styles.caseFoot}>
                    <span>{item.id}</span>
                    <span>{item.area}</span>
                  </span>
                </MaybeLink>
              </li>
            ))}
          </ul>
        )}
      </div>
      {children}
    </DashboardCard>
  )
}

/* ---------------------------------------------------------- Repeat vehicles */

type RepeatView = 'open' | 'no_follow_up'

interface RepeatVehiclesCardProps extends Narrowing {
  repeat: Overview['repeatVehicles']
  title?: string
  subtitle?: string
}

/** "Repeat-vehicle alerts": vehicles reported more than once, and whether anyone followed up. */
export function RepeatVehiclesCard({
  repeat,
  title = 'Repeat-vehicle alerts',
  subtitle = 'Repeated reports and follow-up visibility',
  scope,
  agentId,
}: RepeatVehiclesCardProps) {
  const link = useModuleLink()
  const idBase = useId()
  const [view, setView] = useState<RepeatView>('open')
  const items = (
    view === 'no_follow_up' ? repeat.items.filter((item) => item.followUp === 'none') : repeat.items
  ).slice(0, LIST_LIMIT)

  return (
    <DashboardCard
      title={title}
      subtitle={subtitle}
      icon="overview/card-repeat.svg"
      footer={{
        label: 'View repeat-vehicle alerts',
        to: link('repeat-alerts', narrowed(paths.repeatAlerts, { scope, agentId })),
      }}
    >
      <SegmentedTabs<RepeatView>
        idBase={idBase}
        label="Alerts to show"
        tabs={[
          { id: 'open', label: 'All Open', count: repeat.open },
          { id: 'no_follow_up', label: 'No follow-up', count: repeat.withoutFollowUp },
        ]}
        value={view}
        onChange={setView}
      />
      <div id={panelId(idBase)} role="tabpanel" aria-labelledby={tabId(idBase, view)}>
        {items.length === 0 ? (
          <p className={styles.empty}>
            {view === 'no_follow_up'
              ? 'Every repeat vehicle has a recorded follow-up.'
              : 'No open repeat-vehicle alerts in this period.'}
          </p>
        ) : (
          <ul className={styles.repeats}>
            {items.map((item) => (
              <li key={item.plate}>
                <MaybeLink
                  className={styles.repeat}
                  to={link('violations', `${paths.violations}?plate=${item.plate}`)}
                >
                  <span className={styles.reports}>
                    <strong>{formatNumber(item.reports)}</strong>
                    <span>report{item.reports === 1 ? '' : 's'}</span>
                  </span>
                  <span className={styles.repeatMain}>
                    <span className={styles.repeatHead}>
                      <span className={styles.plate}>{item.plate}</span>
                      <img
                        src={assetUrl('overview/arrow-up-right.svg')}
                        alt=""
                        width={14}
                        height={14}
                      />
                    </span>
                    <span className={styles.small}>
                      {plural(item.agents, 'agent')} · {item.area}
                    </span>
                    <span
                      className={
                        item.followUp === 'none'
                          ? `${styles.followUp} ${styles.followUpNone}`
                          : styles.followUp
                      }
                    >
                      <img
                        src={assetUrl(
                          item.followUp === 'none'
                            ? 'overview/timer-none.svg'
                            : 'overview/timer-partial.svg',
                        )}
                        alt=""
                        width={11}
                        height={11}
                      />
                      {followUpLabel(item.followUp)}
                    </span>
                  </span>
                </MaybeLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardCard>
  )
}
