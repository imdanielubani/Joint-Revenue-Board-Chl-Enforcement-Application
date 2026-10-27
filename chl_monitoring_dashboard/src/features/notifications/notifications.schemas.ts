import { z } from 'zod'
import { feedItemSchema } from '@/features/command-centre/command-centre.schemas'
import {
  repeatVehicleSchema,
  type Open,
  type OverviewFilters,
} from '@/features/overview/overview.schemas'

const open = <T extends string>() => z.custom<Open<T>>((value) => typeof value === 'string')

/**
 * The groups the document sorts notifications into (SRD 11.2 to 11.4).
 * Repeat-vehicle alerts have a module of their own; their notifications are
 * listed here under Enforcement, as 11.2 lists them.
 */
export const NOTIFICATION_CATEGORIES = ['enforcement', 'field', 'operational'] as const
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number]

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  enforcement: 'Enforcement',
  field: 'Field',
  operational: 'Operational',
}

/** What a notification is about. CHL may send others; they are shown as they come. */
export const NOTIFICATION_TYPES = [
  // Enforcement (11.2)
  'repeat_vehicle',
  'payment_received',
  // Field (11.3)
  'sos',
  'vehicle_report',
  'driver_report',
  'situation_report',
  'general',
  'load_status',
] as const
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  repeat_vehicle: 'Repeat-vehicle alert',
  payment_received: 'Payment received',
  sos: 'SOS',
  vehicle_report: 'Vehicle report',
  driver_report: 'Driver report',
  situation_report: 'Situation report',
  general: 'General notification',
  load_status: 'Loaded / empty',
}

/** A notification CHL delivered to the dashboard, and whether this user has read it. */
export const notificationSchema = z.object({
  id: z.string(),
  category: open<NotificationCategory>(),
  type: open<NotificationType>(),
  /** What it says, in CHL's words. */
  title: z.string(),
  /** When CHL received it. */
  receivedAt: z.string(),
  /** Whether this user has opened it. */
  read: z.boolean(),
  plate: z.string().nullable(),
  agent: z.object({ id: z.string(), name: z.string() }).nullable(),
  location: z.object({ name: z.string(), area: z.string(), code: z.string() }).nullable(),
  /** The field record or payment update it is about, as the Command centre shows it. */
  entry: feedItemSchema.nullable(),
  /** For a repeat-vehicle notification: the vehicle, as its alert counts it. */
  repeatVehicle: repeatVehicleSchema.nullable(),
})

export const notificationsSchema = z.object({
  /** When CHL last received a notification in this area and period; null when none arrived. */
  latestReceivedAt: z.string().nullable(),
  /** Received in the area and period, latest first. */
  notifications: z.array(notificationSchema),
  /**
   * Whether CHL passes on agents' operational notifications (reader, internet,
   * GPS, sync). They are the mobile application's own; the SRD does not
   * guarantee the backend receives them (11.4).
   */
  operationalProvided: z.boolean(),
})

export type Notification = z.infer<typeof notificationSchema>
export type Notifications = z.infer<typeof notificationsSchema>
export type NotificationsFilters = OverviewFilters
