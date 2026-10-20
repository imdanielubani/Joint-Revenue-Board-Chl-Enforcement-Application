import { methodLabel } from '@/features/overview/overview-display'
import { ETAG_RESULTS } from '@/features/overview/overview.schemas'
import { assetUrl } from '@/shared/lib/asset-url'
import { formatNumber } from '@/shared/lib/format'
import { DashboardCard, type CardLink } from '@/shared/ui/DashboardCard'
import {
  etagPill,
  METHOD_ICONS,
  METHOD_NOTES,
  METHOD_ORDER,
  PROVENANCE_LABELS,
} from '../verifications-display'
import type { RegisterFilters } from '../verifications-filters'
import { PROVENANCES, type VerificationEntry } from '../verifications.schemas'
import styles from './VerificationCards.module.css'

interface SummaryProps {
  records: readonly VerificationEntry[]
  /** Lists the matching records in the register. */
  onFilter(filters: Partial<RegisterFilters>): void
}

const countWhere = (
  records: readonly VerificationEntry[],
  test: (r: VerificationEntry) => boolean,
) => records.reduce((sum, record) => sum + (test(record) ? 1 : 0), 0)

/**
 * "Verification methods": how many records each acquisition method produced.
 * Recorded methods only — the dashboard never runs a scan.
 */
export function MethodsCard({ records, onFilter }: SummaryProps) {
  return (
    <DashboardCard
      title="Verification methods"
      subtitle="Recorded acquisition methods, not scan controls"
      icon="verifications/card-methods.svg"
      className={styles.summaryCard}
      bodyClassName={styles.summaryBody}
    >
      <ul className={styles.methodList}>
        {METHOD_ORDER.map((method) => {
          const count = countWhere(records, (record) => record.method === method)
          return (
            <li key={method}>
              <button
                type="button"
                className={styles.methodRow}
                onClick={() => onFilter({ method })}
                aria-label={`${methodLabel(method)}: ${formatNumber(count)} records. List them`}
              >
                <span className={styles.methodIcon}>
                  <img src={assetUrl(METHOD_ICONS[method])} alt="" width={18} height={18} />
                </span>
                <span className={styles.methodText}>
                  <span className={styles.methodName}>{methodLabel(method)}</span>
                  <span className={styles.methodNote}>{METHOD_NOTES[method]}</span>
                </span>
                <span className={styles.methodCount}>{formatNumber(count)}</span>
                <img src={assetUrl('verifications/row-arrow.svg')} alt="" width={13} height={13} />
              </button>
            </li>
          )
        })}
      </ul>
    </DashboardCard>
  )
}

/**
 * "E-Tag results": valid, missing, invalid or fake, and mismatched tags, each
 * its own count. A failed read is a scan error, never a missing tag.
 */
export function EtagResultsCard({ records, onFilter }: SummaryProps) {
  return (
    <DashboardCard
      title="E-Tag results"
      subtitle="Explicit tag results remain separate from scan errors"
      icon="verifications/card-etag.svg"
      className={styles.summaryCard}
      bodyClassName={styles.summaryBody}
    >
      <ul className={styles.tileGrid}>
        {ETAG_RESULTS.map((result, index) => {
          const pill = etagPill(result)
          const count = countWhere(records, (record) => record.etag === result)
          return (
            <li key={result}>
              <button
                type="button"
                className={styles.tile}
                onClick={() => onFilter({ etag: result })}
                aria-label={`${pill.label}: ${formatNumber(count)} records. List them`}
              >
                <span className={styles.tileIndex}>{String(index + 1).padStart(2, '0')}</span>
                <img
                  className={styles.tileArrow}
                  src={assetUrl('overview/tile-arrow.svg')}
                  alt=""
                  width={12}
                  height={12}
                />
                <span className={styles.tileCount}>{formatNumber(count)}</span>
                <span className={styles.tileLabel}>
                  {pill.icon && <img src={assetUrl(pill.icon)} alt="" width={12} height={12} />}
                  {pill.label}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className={styles.cardNote}>
        A failed RFID read does not establish that an E-Tag is missing.
      </p>
    </DashboardCard>
  )
}

/**
 * "Recorded provenance": where each result came from — CHL's backend, the
 * phone's cached data, or a record made offline. Not a live connection.
 */
export function ProvenanceCard({
  records,
  onFilter,
  review,
}: SummaryProps & {
  /** "Review source & synchronization", along the bottom. */
  review: CardLink
}) {
  const live = countWhere(records, (record) => record.provenance === 'live_backend')
  return (
    <DashboardCard
      title="Recorded provenance"
      subtitle="Where the verification result originated"
      icon="verifications/card-provenance.svg"
      className={styles.summaryCard}
      bodyClassName={styles.summaryBody}
      footer={review}
    >
      <div className={styles.bigFigure}>
        <p className={styles.bigValue}>{formatNumber(live)}</p>
        <p className={styles.bigCaption}>backend-origin records</p>
      </div>
      <ul className={styles.sourceList}>
        {PROVENANCES.map((provenance) => {
          const count = countWhere(records, (record) => record.provenance === provenance)
          return (
            <li key={provenance}>
              <button
                type="button"
                className={styles.sourceRow}
                onClick={() => onFilter({ provenance })}
                aria-label={`${PROVENANCE_LABELS[provenance]}: ${formatNumber(count)} records. List them`}
              >
                <span className={styles.sourceName}>{PROVENANCE_LABELS[provenance]}</span>
                <span className={styles.sourceCount}>{formatNumber(count)}</span>
                <img src={assetUrl('overview/tile-arrow.svg')} alt="" width={12} height={12} />
              </button>
            </li>
          )
        })}
      </ul>
      <p className={styles.cardNote}>
        Source labels describe recorded provenance, not a live connection from this dashboard.
        Request success is shown only when supplied.
      </p>
    </DashboardCard>
  )
}
