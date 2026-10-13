import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/repositories/notifications_repository_impl.dart';
import '../../domain/entities/app_notification.dart';

/// The inbox, newest first. Loading shows the skeleton; an error shows
/// "Notifications unavailable" until [NotificationsController.retry].
final notificationsProvider =
    AsyncNotifierProvider<NotificationsController, List<AppNotification>>(
      NotificationsController.new,
      // No automatic retries: the officer retries with "Try again".
      retry: (_, _) => null,
    );

/// Unread notifications, shown as a badge on the bell; 0 until the inbox
/// has loaded.
final unreadNotificationCountProvider = Provider<int>(
  (ref) =>
      ref
          .watch(notificationsProvider)
          .value
          ?.where((notification) => !notification.isRead)
          .length ??
      0,
);

class NotificationsController extends AsyncNotifier<List<AppNotification>> {
  @override
  Future<List<AppNotification>> build() async {
    final notifications = await ref
        .watch(notificationsRepositoryProvider)
        .fetchNotifications();
    return [...notifications]
      ..sort((a, b) => b.receivedAt.compareTo(a.receivedAt));
  }

  /// Loads the inbox again (after "Notifications unavailable", or pull to
  /// refresh).
  Future<void> retry() async {
    ref.invalidateSelf();
    await future.catchError((Object _) => const <AppNotification>[]);
  }

  /// Marks [id] as read straight away, and on the server; puts it back if
  /// the server refuses.
  Future<void> markRead(String id) async {
    final current = state.value;
    if (current == null) return;
    final index = current.indexWhere((notification) => notification.id == id);
    if (index < 0 || current[index].isRead) return;
    state = AsyncData([
      for (final notification in current)
        notification.id == id
            ? notification.copyWith(isRead: true)
            : notification,
    ]);
    try {
      await ref.read(notificationsRepositoryProvider).markRead(id);
    } catch (error) {
      debugPrint('Could not mark the notification as read: $error');
      if (ref.mounted) state = AsyncData(current);
    }
  }

  /// Marks every notification as read straight away, and on the server;
  /// restores them if the server refuses.
  Future<void> markAllRead() async {
    final current = state.value;
    if (current == null || current.every((n) => n.isRead)) return;
    state = AsyncData([
      for (final notification in current) notification.copyWith(isRead: true),
    ]);
    try {
      await ref.read(notificationsRepositoryProvider).markAllRead();
    } catch (error) {
      debugPrint('Could not mark the notifications as read: $error');
      if (ref.mounted) state = AsyncData(current);
    }
  }
}
