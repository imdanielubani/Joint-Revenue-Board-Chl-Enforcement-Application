import {
  Skeleton,
  SkeletonCard,
  SkeletonChart,
  SkeletonColumns,
  SkeletonFigures,
  SkeletonList,
  SkeletonTable,
} from '@/shared/ui/Skeleton'

/**
 * Geographical monitoring while it loads: its figures, the map, and the places
 * beside the records.
 */
export function GeographySkeleton() {
  return (
    <Skeleton message="Loading geographical monitoring…">
      <SkeletonFigures count={4} />
      <SkeletonCard>
        <SkeletonChart height={340} />
      </SkeletonCard>
      <SkeletonColumns columns="minmax(0, 1fr) minmax(0, 2fr)">
        <SkeletonCard>
          <SkeletonList rows={5} />
        </SkeletonCard>
        <SkeletonCard>
          <SkeletonTable rows={5} columns={5} />
        </SkeletonCard>
      </SkeletonColumns>
    </Skeleton>
  )
}
