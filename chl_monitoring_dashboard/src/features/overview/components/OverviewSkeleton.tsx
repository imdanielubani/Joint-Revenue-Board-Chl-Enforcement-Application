import {
  Skeleton,
  SkeletonCard,
  SkeletonChart,
  SkeletonFigures,
  SkeletonTable,
} from '@/shared/ui/Skeleton'
import page from '../pages/OverviewPage.module.css'
import rows from './CardRows.module.css'

/**
 * The Overview while it loads, in its own layout: the eight headline figures,
 * the activity chart beside the outcomes, the performance table, the two rows
 * of insight and attention cards, and the recent activity table.
 */
export function OverviewSkeleton() {
  return (
    <Skeleton message="Loading the overview…">
      <SkeletonFigures count={8} />
      <div className={page.activityRow}>
        <SkeletonCard>
          <SkeletonChart height={240} />
        </SkeletonCard>
        <SkeletonCard lines={7} />
      </div>
      <SkeletonCard>
        <SkeletonTable rows={5} columns={7} />
      </SkeletonCard>
      <div className={rows.row}>
        <SkeletonCard lines={5} />
        <SkeletonCard lines={5} />
        <SkeletonCard lines={5} />
      </div>
      <div className={rows.row}>
        <SkeletonCard lines={5} />
        <SkeletonCard lines={5} />
        <SkeletonCard lines={5} />
      </div>
      <SkeletonCard>
        <SkeletonTable rows={5} columns={6} />
      </SkeletonCard>
    </Skeleton>
  )
}
