import { Bone, Skeleton, SkeletonCard, SkeletonList } from '@/shared/ui/Skeleton'

/** The search while it runs: what was found, then groups of results. */
export function SearchSkeleton({ message }: { message: string }) {
  return (
    <Skeleton message={message}>
      <Bone width="30%" height={12} />
      <SkeletonCard>
        <SkeletonList rows={3} />
      </SkeletonCard>
      <SkeletonCard>
        <SkeletonList rows={3} />
      </SkeletonCard>
    </Skeleton>
  )
}
