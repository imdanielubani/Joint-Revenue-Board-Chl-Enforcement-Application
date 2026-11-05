import { Skeleton, SkeletonCard, SkeletonChart, SkeletonColumns } from '@/shared/ui/Skeleton'

/**
 * One agent's page while it loads: their identity beside their metrics, their
 * verification and enforcement activity, and where they recorded it.
 */
export function AgentSkeleton({ message }: { message: string }) {
  return (
    <Skeleton message={message}>
      <SkeletonColumns columns="minmax(0, 1fr) minmax(0, 1fr)">
        <SkeletonCard lines={6} />
        <SkeletonCard lines={6} />
      </SkeletonColumns>
      <SkeletonColumns columns="minmax(0, 1fr) minmax(0, 1fr)">
        <SkeletonCard>
          <SkeletonChart height={180} />
        </SkeletonCard>
        <SkeletonCard>
          <SkeletonChart height={180} />
        </SkeletonCard>
      </SkeletonColumns>
      <SkeletonCard>
        <SkeletonChart height={260} />
      </SkeletonCard>
    </Skeleton>
  )
}
