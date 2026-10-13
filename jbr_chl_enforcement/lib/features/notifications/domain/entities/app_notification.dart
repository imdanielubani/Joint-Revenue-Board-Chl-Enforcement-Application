import 'package:flutter/foundation.dart';

import 'notification_type.dart';

/// A message in the officer's notification inbox.
@immutable
class AppNotification {
  const AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.summary,
    required this.body,
    required this.receivedAt,
    this.isRead = false,
    this.verificationRecordId,
  });

  final String id;
  final NotificationType type;

  /// e.g. "RFID reader disconnected".
  final String title;

  /// One or two lines shown in the inbox.
  final String summary;

  /// The full message, shown on the details page.
  final String body;

  final DateTime receivedAt;
  final bool isRead;

  /// The verification record a verification notification is about.
  final String? verificationRecordId;

  AppNotification copyWith({bool? isRead}) => AppNotification(
    id: id,
    type: type,
    title: title,
    summary: summary,
    body: body,
    receivedAt: receivedAt,
    isRead: isRead ?? this.isRead,
    verificationRecordId: verificationRecordId,
  );

  @override
  bool operator ==(Object other) =>
      other is AppNotification &&
      other.id == id &&
      other.type == type &&
      other.title == title &&
      other.summary == summary &&
      other.body == body &&
      other.receivedAt == receivedAt &&
      other.isRead == isRead &&
      other.verificationRecordId == verificationRecordId;

  @override
  int get hashCode => Object.hash(
    id,
    type,
    title,
    summary,
    body,
    receivedAt,
    isRead,
    verificationRecordId,
  );
}
