import '../../domain/entities/app_notification.dart';
import '../../domain/entities/notification_type.dart';

/// JSON mapping for [AppNotification], from `GET /notifications`:
///
/// ```json
/// { "id": "…", "category": "incompleteVerification", "title": "…",
///   "body": "…", "data": { "summary": "…", "verificationId": "…" },
///   "createdAt": "2026-10-14T08:30:00.000Z", "read": false }
/// ```
///
/// `category` is a [NotificationType] name; `data.summary` is the short
/// line in the list (the body when absent).
abstract final class AppNotificationModel {
  /// Null for a category this version of the app doesn't know (sent by a
  /// newer server): it is left out rather than shown wrongly. Throws
  /// [FormatException] on a notification the app can't read.
  static AppNotification? fromJson(Map<String, dynamic> json) {
    final type = NotificationType.values.asNameMap()[json['category']];
    if (type == null) return null;
    final id = json['id'];
    final title = json['title'];
    final body = json['body'];
    final createdAt = json['createdAt'];
    if (id is! String ||
        title is! String ||
        body is! String ||
        createdAt is! String) {
      throw const FormatException('Malformed notification');
    }
    final data = json['data'];
    final extra = data is Map<String, dynamic> ? data : const {};
    return AppNotification(
      id: id,
      type: type,
      title: title,
      summary: extra['summary'] as String? ?? body,
      body: body,
      receivedAt: DateTime.parse(createdAt).toLocal(),
      isRead: json['read'] == true,
      verificationRecordId: extra['verificationId'] as String?,
    );
  }

  static List<AppNotification> listFromJson(Object? items) {
    if (items is! List) throw const FormatException('Missing items');
    return [for (final item in items) ?fromJson(item as Map<String, dynamic>)];
  }
}
