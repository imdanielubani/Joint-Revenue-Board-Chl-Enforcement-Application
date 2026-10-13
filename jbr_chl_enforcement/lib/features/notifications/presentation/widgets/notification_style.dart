import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../domain/entities/app_notification.dart';
import '../../domain/entities/notification_type.dart';

/// How each kind of notification looks.
extension NotificationTypeStyle on NotificationType {
  /// Category shown above the title and in the inbox line.
  String get category => switch (this) {
    NotificationType.incompleteVerification => 'Verification',
    NotificationType.locationAttention => 'Device readiness',
    NotificationType.connectionRestored => 'Connectivity',
    NotificationType.rfidDisconnected ||
    NotificationType.rfidConnected => 'RFID reader',
    NotificationType.sessionExpiry => 'Account',
    NotificationType.appUpdate => 'Application',
  };

  /// Disc behind the icon: amber for something to act on, green when
  /// things are working again, pale green for account and app messages.
  Color get tint => switch (this) {
    NotificationType.incompleteVerification ||
    NotificationType.locationAttention ||
    NotificationType.rfidDisconnected => AppColors.noticeWarningTint,
    NotificationType.connectionRestored ||
    NotificationType.rfidConnected => AppColors.noticePositiveTint,
    NotificationType.sessionExpiry ||
    NotificationType.appUpdate => AppColors.greenTint,
  };

  String get _iconName => switch (this) {
    NotificationType.incompleteVerification => 'clipboard',
    NotificationType.locationAttention => 'pin',
    NotificationType.connectionRestored => 'wifi',
    NotificationType.rfidDisconnected => 'rfid_warn',
    NotificationType.rfidConnected => 'rfid_ok',
    NotificationType.sessionExpiry => 'lock',
    NotificationType.appUpdate => 'phone',
  };

  /// 21 px icon for the inbox.
  String get icon => '${AssetPaths.notificationsDir}/$_iconName.svg';

  /// 28 px icon for the details page. Account and app messages have no
  /// separate large icon, so their inbox icon is drawn larger.
  String get largeIcon => switch (this) {
    NotificationType.sessionExpiry || NotificationType.appUpdate => icon,
    _ => '${AssetPaths.notificationsDir}/${_iconName}_large.svg',
  };
}

/// Dates and times as shown in the inbox and on the details page.
abstract final class NotificationDates {
  static final DateFormat _time = DateFormat('hh:mm a');
  static final DateFormat _day = DateFormat('d MMM y');

  static bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  /// "Today", "Yesterday" or "10 Oct 2026".
  static String day(DateTime when, DateTime now) {
    if (_sameDay(when, now)) return 'Today';
    if (_sameDay(when, DateTime(now.year, now.month, now.day - 1))) {
      return 'Yesterday';
    }
    return _day.format(when);
  }

  /// "09:40 AM".
  static String time(DateTime when) => _time.format(when);

  /// "Today · 09:40 AM", for the details page.
  static String received(DateTime when, DateTime now) =>
      '${day(when, now)} · ${time(when)}';

  /// The inbox line: "Verification · 09:40 AM · Unread".
  static String inboxLine(AppNotification notification) =>
      '${notification.type.category} · ${time(notification.receivedAt)} · '
      '${notification.isRead ? 'Read' : 'Unread'}';
}

/// Notifications grouped by the day they arrived, keeping their order.
List<(String, List<AppNotification>)> groupByDay(
  List<AppNotification> notifications,
  DateTime now,
) {
  final groups = <(String, List<AppNotification>)>[];
  for (final notification in notifications) {
    final label = NotificationDates.day(notification.receivedAt, now);
    if (groups.isNotEmpty && groups.last.$1 == label) {
      groups.last.$2.add(notification);
    } else {
      groups.add((label, [notification]));
    }
  }
  return groups;
}
