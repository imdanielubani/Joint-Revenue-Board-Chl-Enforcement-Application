import '../entities/app_notification.dart';

/// The officer's notification inbox.
abstract interface class NotificationsRepository {
  /// Every notification, newest first. Throws when the inbox cannot be
  /// read; that is not the same as an empty inbox.
  Future<List<AppNotification>> fetchNotifications();

  /// Marks one notification as read.
  Future<void> markRead(String id);

  /// Marks every notification as read.
  Future<void> markAllRead();
}
