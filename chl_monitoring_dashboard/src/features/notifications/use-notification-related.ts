import { useCallback } from 'react'
import { paths } from '@/config/paths'
import { useModuleLink } from '@/features/auth/use-module-link'
import type { TripRelated } from '@/features/trips/components/TripRelatedDialog'
import type { Notification } from './notifications.schemas'

export interface NotificationRelated {
  label: string
  related: TripRelated
}

/**
 * The records a notification leads to, each opened in a popup on the page: a
 * repeat vehicle's reports, a payment's demand notice, the agent who sent it.
 * Only those in modules the user may open.
 */
export function useNotificationRelated() {
  const link = useModuleLink()
  return useCallback(
    (item: Notification): NotificationRelated[] => {
      const related: NotificationRelated[] = []
      if (item.repeatVehicle && link('violations', paths.violations)) {
        related.push({
          label: 'View vehicle reports',
          related: { kind: 'vehicleReports', vehicle: item.repeatVehicle },
        })
      }
      if (item.entry?.payment && link('payments', paths.payments)) {
        related.push({
          label: 'Open the payment',
          related: { kind: 'payment', noticeId: item.entry.payment.noticeId },
        })
      }
      if (item.agent && link('agents', paths.agents)) {
        related.push({ label: 'View agent', related: { kind: 'agent', agent: item.agent } })
      }
      return related
    },
    [link],
  )
}
