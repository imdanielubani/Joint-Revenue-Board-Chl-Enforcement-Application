import type { OverviewFilters } from '@/features/overview/overview.schemas'
import { Dialog } from '@/shared/ui/Dialog'
import { StatePanel } from '@/shared/ui/StatePanel'
import { usePaymentsMonitoring } from '../payments.queries'
import { NoticeDialog } from './NoticeDialog'
import styles from './PaymentCards.module.css'

/**
 * A demand notice opened from another page, in the popup Payments & compliance
 * shows: looked up in the same area and period, for every agent and organization.
 */
export function NoticePopup({
  noticeId,
  filters,
  onClose,
}: {
  noticeId: string
  filters: Pick<OverviewFilters, 'scope' | 'range' | 'from' | 'to'>
  onClose(): void
}) {
  const query = usePaymentsMonitoring({ ...filters, agentId: null, organization: null })
  const notice = query.data?.notices.find((entry) => entry.id === noticeId)
  if (notice) return <NoticeDialog notice={notice} onClose={onClose} />
  return (
    <Dialog
      title={`Demand notice ${noticeId}`}
      onClose={onClose}
      footer={
        <button type="button" className={styles.secondaryButton} onClick={onClose}>
          Close
        </button>
      }
    >
      {query.isPending ? (
        <StatePanel kind="loading" message="Loading…" />
      ) : (
        <p className={styles.small}>
          Demand notice {noticeId} was not found in this area and period.
        </p>
      )}
    </Dialog>
  )
}
