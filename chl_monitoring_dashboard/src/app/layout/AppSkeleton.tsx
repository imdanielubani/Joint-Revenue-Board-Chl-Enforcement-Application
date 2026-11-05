import { Bone, Skeleton, SkeletonCard, SkeletonFigures, SkeletonTable } from '@/shared/ui/Skeleton'
import styles from './AppSkeleton.module.css'

/**
 * The dashboard's frame while the app first loads, before any page has drawn:
 * the sidebar, the top bar and a page's usual shape.
 */
export function AppSkeleton() {
  return (
    <div className={styles.app}>
      <div className={styles.sidebar} aria-hidden="true" />
      <div className={styles.main}>
        <div className={styles.topbar} aria-hidden="true">
          <Bone width="22%" height={12} />
          <Bone width="28%" height={30} />
        </div>
        <Skeleton message="Loading the dashboard…">
          <Bone height={140} />
          <SkeletonFigures count={4} />
          <SkeletonCard>
            <SkeletonTable rows={5} columns={6} />
          </SkeletonCard>
        </Skeleton>
      </div>
    </div>
  )
}
