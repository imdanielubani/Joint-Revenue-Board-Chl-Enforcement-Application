import {
  Skeleton,
  SkeletonCard,
  SkeletonFigures,
  SkeletonList,
  SkeletonTabs,
} from '@/shared/ui/Skeleton'

/** Notifications while they load: figures, the category tabs and the list. */
export function NotificationsSkeleton() {
  return (
    <Skeleton message="Loading notifications…">
      <SkeletonFigures count={4} />
      <SkeletonTabs count={4} />
      <SkeletonCard>
        <SkeletonList rows={6} />
      </SkeletonCard>
    </Skeleton>
  )
}
