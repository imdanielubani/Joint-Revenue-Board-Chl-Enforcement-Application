import {
  Skeleton,
  SkeletonCard,
  SkeletonChart,
  SkeletonColumns,
  SkeletonFigures,
  SkeletonList,
} from '@/shared/ui/Skeleton'

/**
 * The Command centre while it loads: its figures, the activity feed beside the
 * cases needing attention, the SOS and field cards, and the map.
 */
export function CommandCentreSkeleton() {
  return (
    <Skeleton message="Loading the command centre…">
      <SkeletonFigures count={4} />
      <SkeletonColumns>
        <SkeletonCard>
          <SkeletonList rows={6} />
        </SkeletonCard>
        <SkeletonCard lines={7} />
      </SkeletonColumns>
      <SkeletonColumns columns="repeat(3, minmax(0, 1fr))">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </SkeletonColumns>
      <SkeletonCard>
        <SkeletonChart height={280} />
      </SkeletonCard>
    </Skeleton>
  )
}
