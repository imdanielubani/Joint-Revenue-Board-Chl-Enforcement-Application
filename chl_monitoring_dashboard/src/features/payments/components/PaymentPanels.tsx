import { useMemo } from 'react'
import { paths } from '@/config/paths'
import { useModuleLink } from '@/features/auth/use-module-link'
import { Stack } from '@/features/geography/components/RecordCells'
import cells from '@/features/geography/components/RecordColumns.module.css'
import { share } from '@/features/overview/overview-display'
import { assetUrl } from '@/shared/lib/asset-url'
import { formatNaira, formatNumber, formatPercent, formatShortDateTime } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import type { Column } from '@/shared/ui/DataTable'
import { LabeledSelect } from '@/shared/ui/LabeledSelect'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import { RowActions, type RowCommand } from '@/shared/ui/RowActions'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import {
  methodLabel,
  methodText,
  NO_METHOD,
  paymentStatusPill,
  searchTextOf,
  taggingPill,
  transactionLabel,
  tripActivationPill,
  type Pill,
} from '../payments-display'
import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  type DemandNotice,
  type RelatedTransaction,
} from '../payments.schemas'
import styles from './PaymentCards.module.css'

export function PillLabel({ pill }: { pill: Pill }) {
  return (
    <StatusLabel tone={pill.tone} {...(pill.icon ? { icon: pill.icon } : {})}>
      {pill.label}
    </StatusLabel>
  )
}

/** A notice's case or verification, opened in its own popup on this page. */
export type NoticeRelatedKind = 'case' | 'verification'

interface PanelProps {
  notices: readonly DemandNotice[]
  subtitle: string
  /** Opens the notice's details, or with `related`, its case or verification. */
  onOpen(notice: DemandNotice, related?: NoticeRelatedKind): void
}

/** The row's actions: the notice, then its case and verification where the role may see them. */
function useActions(onOpen: PanelProps['onOpen']) {
  const link = useModuleLink()
  return useMemo(() => {
    const cases = link('violations', paths.violations) !== undefined
    const verifications = link('verifications', paths.verifications) !== undefined
    return (row: DemandNotice) => {
      const commands: RowCommand[] = [
        { label: 'View notice details', onSelect: () => onOpen(row) },
        ...(cases ? [{ label: 'Open the case', onSelect: () => onOpen(row, 'case') }] : []),
        ...(verifications
          ? [{ label: 'View verification', onSelect: () => onOpen(row, 'verification') }]
          : []),
      ]
      return <RowActions label={`Actions for ${row.id}`} actions={commands} />
    }
  }, [link, onOpen])
}

const noticeColumn: Column<DemandNotice> = {
  key: 'notice',
  header: 'Demand notice',
  render: (row) => <span className={cells.plate}>{row.id}</span>,
  sortValue: (row) => row.id,
}

const plateColumn: Column<DemandNotice> = {
  key: 'plate',
  header: 'Plate',
  render: (row) => <span className={cells.plate}>{row.plate}</span>,
  sortValue: (row) => row.plate,
}

/* ------------------------------------------------------------ Payment Status */

const STATUS_COLORS: Record<Pill['tone'], string> = {
  success: 'var(--status-success-text)',
  warning: 'var(--status-warning-text)',
  amber: 'var(--status-amber-text)',
  danger: 'var(--status-danger-text)',
  info: 'var(--card-title)',
  neutral: 'var(--status-neutral-dot)',
}

/**
 * Payment Status: a tile for Payment Pending and Payment Received, as CHL
 * reports them, and any other state it returns, with the notices' count,
 * share and total payable; a tile lists its notices in the register.
 */
export function StatusPanel({
  notices,
  subtitle,
  onShow,
}: Omit<PanelProps, 'onOpen'> & { onShow(status: string): void }) {
  const known: readonly string[] = PAYMENT_STATUSES
  const others = [...new Set(notices.map((n) => n.status))].filter((s) => !known.includes(s))
  return (
    <DashboardCard
      title="Payment Status"
      subtitle={subtitle}
      icon="overview/card-payment.svg"
      bodyClassName={styles.statusBody}
    >
      <ul className={styles.statusTiles}>
        {[...PAYMENT_STATUSES, ...others].map((status) => {
          const pill = paymentStatusPill(status)
          const rows = notices.filter((notice) => notice.status === status)
          const total = rows.reduce((sum, notice) => sum + (notice.amounts.total ?? 0), 0)
          return (
            <li key={status}>
              <button
                type="button"
                className={styles.statusTile}
                disabled={rows.length === 0}
                onClick={() => onShow(status)}
                aria-label={`View ${pill.label} notices`}
              >
                <span className={styles.statusTileHead}>
                  <PillLabel pill={pill} />
                  <img
                    className={styles.statusTileArrow}
                    src={assetUrl('overview/tile-arrow.svg')}
                    alt=""
                    width={12}
                    height={12}
                  />
                </span>
                <span className={styles.statusTileValue}>{formatNumber(rows.length)}</span>
                <span className={styles.statusTileShare}>
                  {formatPercent(rows.length, notices.length)} of demand notices ·{' '}
                  {formatNaira(total)} payable
                </span>
                <span className={styles.statusTrack} aria-hidden="true">
                  <span
                    className={styles.statusFill}
                    style={{
                      width: `${share(rows.length, notices.length)}%`,
                      background: STATUS_COLORS[pill.tone],
                    }}
                  />
                </span>
                {!known.includes(status) && (
                  <span className={styles.statusTileNote}>Another state returned by CHL</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      <p className={styles.small}>
        Payable totals add up the amounts CHL supplied; a notice without an amount adds nothing.
      </p>
    </DashboardCard>
  )
}

/* ------------------------------------------------------------ Demand Notice Register */

/**
 * Demand Notice Register: the notices and invoices CHL generated, with their
 * violation, amount, method and payment status, filtered by status and method.
 */
export function RegisterPanel({
  notices,
  subtitle,
  onOpen,
  status,
  method,
  plate,
  onStatusChange,
  onMethodChange,
}: PanelProps & {
  status: string | null
  method: string | null
  /** A plate to search for first, from a link. */
  plate: string
  onStatusChange(value: string | null): void
  onMethodChange(value: string | null): void
}) {
  const actions = useActions(onOpen)
  const columns = useMemo<Column<DemandNotice>[]>(
    () => [
      noticeColumn,
      {
        key: 'violation',
        header: 'Violation',
        render: (row) => <Stack main={row.violation.id} sub={row.violation.category} />,
        sortValue: (row) => row.violation.id,
      },
      plateColumn,
      {
        key: 'total',
        header: 'Total payable',
        align: 'end',
        render: (row) =>
          row.amounts.total === null ? (
            <span className={cells.sub}>Not supplied by CHL</span>
          ) : (
            formatNaira(row.amounts.total)
          ),
        sortValue: (row) => row.amounts.total ?? -1,
      },
      {
        key: 'method',
        header: 'Payment method',
        render: (row) =>
          row.method ? (
            methodLabel(row.method.type)
          ) : (
            <span className={cells.sub}>{NO_METHOD}</span>
          ),
        sortValue: (row) => methodText(row.method),
      },
      {
        key: 'status',
        header: 'Payment status',
        render: (row) => <PillLabel pill={paymentStatusPill(row.status)} />,
        sortValue: (row) => paymentStatusPill(row.status).label,
      },
      {
        key: 'trip',
        header: 'Trip activation',
        render: (row) => <PillLabel pill={tripActivationPill(row.compliance)} />,
        sortValue: (row) => tripActivationPill(row.compliance).label,
      },
      {
        key: 'issued',
        header: 'Issued (WAT)',
        render: (row) => formatShortDateTime(row.issuedAt),
        sortValue: (row) => Date.parse(row.issuedAt),
      },
      { key: 'actions', header: 'Actions', align: 'end', render: actions },
    ],
    [actions],
  )
  const statuses = [...new Set([...PAYMENT_STATUSES, ...notices.map((n) => n.status)])].map(
    (value) => ({ value, label: paymentStatusPill(value).label }),
  )
  const methods = [
    ...new Set([
      ...PAYMENT_METHODS,
      ...notices.flatMap((notice) => (notice.method ? [notice.method.type] : [])),
    ]),
  ].map((value) => ({ value, label: methodLabel(value) }))
  const rows = notices.filter(
    (notice) =>
      (!status || notice.status === status) && (!method || notice.method?.type === method),
  )
  return (
    <DashboardCard
      title="Demand Notice Register"
      subtitle={subtitle}
      icon="overview/card-payment.svg"
      bodyClassName={styles.panelBody}
    >
      <div className={styles.selects}>
        <LabeledSelect
          label="Payment status"
          value={status}
          options={statuses}
          onChange={onStatusChange}
        />
        <LabeledSelect
          label="Payment method"
          value={method}
          options={methods}
          onChange={onMethodChange}
        />
      </div>
      <RegisterTable
        key={`${status ?? ''}|${method ?? ''}`}
        label="Demand notices"
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        searchText={searchTextOf}
        initialQuery={plate}
      />
    </DashboardCard>
  )
}

/* ------------------------------------------------------------ Post-Payment Compliance */

/**
 * Post-Payment Compliance: for each notice paid, what CHL recorded after it —
 * trip activation, tagging-process initiation and the compliance outcome —
 * each its own status, never read from the payment.
 */
export function CompliancePanel({ notices, subtitle, onOpen }: PanelProps) {
  const actions = useActions(onOpen)
  const rows = notices.filter((notice) => notice.compliance !== null)
  const columns = useMemo<Column<DemandNotice>[]>(
    () => [
      noticeColumn,
      plateColumn,
      {
        key: 'paid',
        header: 'Payment received (WAT)',
        render: (row) => (row.paidAt ? formatShortDateTime(row.paidAt) : '—'),
        sortValue: (row) => (row.paidAt ? Date.parse(row.paidAt) : 0),
      },
      {
        key: 'trip',
        header: 'Trip activation',
        render: (row) => <PillLabel pill={tripActivationPill(row.compliance)} />,
        sortValue: (row) => (row.compliance?.tripActivated ? 1 : 0),
      },
      {
        key: 'tripReference',
        header: 'Trip',
        render: (row) =>
          row.compliance?.tripReference ? (
            <span className={cells.plate}>{row.compliance.tripReference}</span>
          ) : (
            <span className={cells.sub}>None</span>
          ),
        sortValue: (row) => row.compliance?.tripReference ?? '',
      },
      {
        key: 'tagging',
        header: 'Tagging process',
        render: (row) => <PillLabel pill={taggingPill(row.compliance!)} />,
        sortValue: (row) => taggingPill(row.compliance!).label,
      },
      {
        key: 'outcome',
        header: 'Compliance outcome',
        render: (row) =>
          row.compliance?.outcome ? (
            <Stack
              main={row.compliance.outcome}
              sub={
                row.compliance.updatedAt
                  ? `Updated ${formatShortDateTime(row.compliance.updatedAt)}`
                  : undefined
              }
            />
          ) : (
            <span className={cells.sub}>Not updated by CHL</span>
          ),
        sortValue: (row) => row.compliance?.outcome ?? '',
      },
      { key: 'actions', header: 'Actions', align: 'end', render: actions },
    ],
    [actions],
  )
  return (
    <DashboardCard
      title="Post-Payment Compliance"
      subtitle={subtitle}
      icon="overview/card-payment.svg"
      bodyClassName={styles.panelBody}
    >
      <RegisterTable
        label="Paid notices"
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        searchText={searchTextOf}
      />
      <p className={styles.small}>
        Payment received and trip activated are separate statuses: a paid notice is not taken to
        mean a trip was activated unless CHL recorded one.
      </p>
    </DashboardCard>
  )
}

/* ------------------------------------------------------------ Related Transactions */

interface TransactionRow {
  transaction: RelatedTransaction
  notice: DemandNotice
}

const transactionSearchText = ({ transaction, notice }: TransactionRow) =>
  [transaction.reference, transactionLabel(transaction.kind), notice.id, notice.plate].join(' ')

/** Related Transactions: the transaction references linked to the notices, and their times. */
export function TransactionsPanel({ notices, subtitle, onOpen }: PanelProps) {
  const rows = useMemo(
    () =>
      notices
        .flatMap((notice) => notice.transactions.map((transaction) => ({ transaction, notice })))
        .sort((a, b) => Date.parse(b.transaction.at) - Date.parse(a.transaction.at)),
    [notices],
  )
  const columns = useMemo<Column<TransactionRow>[]>(
    () => [
      {
        key: 'reference',
        header: 'Transaction reference',
        render: (row) => <span className={cells.plate}>{row.transaction.reference}</span>,
        sortValue: (row) => row.transaction.reference,
      },
      {
        key: 'kind',
        header: 'Transaction',
        render: (row) => transactionLabel(row.transaction.kind),
        sortValue: (row) => transactionLabel(row.transaction.kind),
      },
      {
        key: 'notice',
        header: 'Demand notice',
        render: (row) => <span className={cells.plate}>{row.notice.id}</span>,
        sortValue: (row) => row.notice.id,
      },
      {
        key: 'plate',
        header: 'Plate',
        render: (row) => <span className={cells.plate}>{row.notice.plate}</span>,
        sortValue: (row) => row.notice.plate,
      },
      {
        key: 'at',
        header: 'Time (WAT)',
        render: (row) => formatShortDateTime(row.transaction.at),
        sortValue: (row) => Date.parse(row.transaction.at),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'end',
        render: (row) => (
          <RowActions
            label={`Actions for ${row.transaction.reference}`}
            actions={[{ label: 'View notice details', onSelect: () => onOpen(row.notice) }]}
          />
        ),
      },
    ],
    [onOpen],
  )
  return (
    <DashboardCard
      title="Related Transactions"
      subtitle={subtitle}
      icon="overview/card-recent.svg"
      bodyClassName={styles.panelBody}
    >
      <RegisterTable
        label="Related transactions"
        rows={rows}
        columns={columns}
        rowKey={(row) => `${row.transaction.kind}:${row.transaction.reference}`}
        searchText={transactionSearchText}
      />
    </DashboardCard>
  )
}
