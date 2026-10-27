import { useCallback } from 'react'
import { paths } from '@/config/paths'
import { useModuleLink } from '@/features/auth/use-module-link'
import type { FeedItem } from '@/features/command-centre/command-centre.schemas'
import type { TripRelated } from '@/features/trips/components/TripRelatedDialog'

export interface FieldRecordRelated {
  label: string
  related: TripRelated
}

/**
 * The records a field report or confirmation leads to, each opened in a popup
 * on the page: the agent who sent it, and the vehicle's verifications. Only
 * those in modules the user may open.
 */
export function useFieldRecordRelated() {
  const link = useModuleLink()
  return useCallback(
    (item: FeedItem): FieldRecordRelated[] => {
      const related: FieldRecordRelated[] = []
      if (item.plate && link('verifications', paths.verifications)) {
        related.push({
          label: 'View vehicle history',
          related: { kind: 'vehicle', plate: item.plate },
        })
      }
      if (link('agents', paths.agents)) {
        related.push({ label: 'View agent', related: { kind: 'agent', agent: item.agent } })
      }
      return related
    },
    [link],
  )
}
