import { humanize } from '@/features/overview/overview-display'
import type { StatusTone } from '@/shared/ui/StatusLabel'
import {
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_TYPE_LABELS,
  type Notification,
  type NotificationCategory,
  type NotificationType,
} from './notifications.schemas'

/** "Enforcement", "Field", "Operational", or a group CHL adds later, made readable. */
export function categoryLabel(category: string): string {
  return Object.hasOwn(NOTIFICATION_CATEGORY_LABELS, category)
    ? NOTIFICATION_CATEGORY_LABELS[category as NotificationCategory]
    : humanize(category)
}

/** "SOS", "Repeat-vehicle alert", or a type CHL adds later, made readable. */
export function typeLabel(type: string): string {
  return Object.hasOwn(NOTIFICATION_TYPE_LABELS, type)
    ? NOTIFICATION_TYPE_LABELS[type as NotificationType]
    : humanize(type)
}

/** An SOS from an agent: shown in red wherever notifications are listed. */
export function isSos(item: Pick<Notification, 'type'>): boolean {
  return item.type === 'sos'
}

/** Unread in blue, read in grey. */
export function readPill(read: boolean): { tone: StatusTone; label: string } {
  return read ? { tone: 'neutral', label: 'Read' } : { tone: 'info', label: 'Unread' }
}

/** The agent a notification names; a repeat-vehicle notification counts its agents instead. */
export function agentText(item: Notification): { main: string; sub?: string } | null {
  if (item.agent) return { main: item.agent.name, sub: item.agent.id }
  if (item.repeatVehicle) {
    const count = item.repeatVehicle.agents
    return { main: `${count} agent${count === 1 ? '' : 's'}`, sub: 'Reported the vehicle' }
  }
  return null
}

/** What a register search looks through. */
export function searchTextOf(item: Notification): string {
  return [
    item.id,
    item.title,
    typeLabel(item.type),
    categoryLabel(item.category),
    item.plate ?? '',
    item.agent?.id ?? '',
    item.agent?.name ?? '',
    item.location?.name ?? '',
    item.location?.area ?? '',
    item.location?.code ?? '',
    item.entry?.violation?.id ?? '',
    item.entry?.payment?.noticeId ?? '',
  ].join(' ')
}
