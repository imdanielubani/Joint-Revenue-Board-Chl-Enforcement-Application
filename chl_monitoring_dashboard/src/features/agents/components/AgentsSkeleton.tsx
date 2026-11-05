import { Skeleton, SkeletonCard, SkeletonFigures, SkeletonTable } from '@/shared/ui/Skeleton'

/** Agents & organizations while it loads: figures, the agent register and the organizations. */
export function AgentsSkeleton() {
  return (
    <Skeleton message="Loading agents…">
      <SkeletonFigures count={4} />
      <SkeletonCard>
        <SkeletonTable rows={6} columns={8} />
      </SkeletonCard>
      <SkeletonCard lines={4} />
    </Skeleton>
  )
}
