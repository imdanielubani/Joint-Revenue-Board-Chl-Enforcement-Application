import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/environment/app_environment.dart';
import '../../../../core/constants/api_endpoints.dart';
import '../../../../core/utils/clock.dart';
import '../../../../shared/networking/dio_provider.dart';
import '../../domain/entities/app_notification.dart';
import '../../domain/entities/notification_type.dart';
import '../../domain/repositories/notifications_repository.dart';
import '../models/app_notification_model.dart';

/// The inbox: sample notifications in demo mode, otherwise the server's.
final notificationsRepositoryProvider = Provider<NotificationsRepository>(
  (ref) => AppEnvironment.authDemoMode
      ? DemoNotificationsRepository(now: ref.watch(clockProvider))
      : RemoteNotificationsRepository(
          ref.watch(dioProvider),
          isConfigured: AppEnvironment.hasApi,
        ),
);

/// The officer's inbox on the enforcement API (the latest 100).
class RemoteNotificationsRepository implements NotificationsRepository {
  const RemoteNotificationsRepository(this._dio, {required this._isConfigured});

  final Dio _dio;
  final bool _isConfigured;

  /// Throws [DioException] when the inbox can't be loaded and
  /// [FormatException] on an answer the app can't read.
  @override
  Future<List<AppNotification>> fetchNotifications() async {
    if (!_isConfigured) return const [];
    final response = await _dio.get<Map<String, dynamic>>(
      ApiEndpoints.notifications,
      queryParameters: {'limit': 100},
    );
    return AppNotificationModel.listFromJson(response.data?['items']);
  }

  @override
  Future<void> markRead(String id) async {
    if (!_isConfigured) return;
    await _dio.post<void>(ApiEndpoints.notificationRead(id));
  }

  @override
  Future<void> markAllRead() async {
    if (!_isConfigured) return;
    await _dio.post<void>(ApiEndpoints.notificationsReadAll);
  }
}

/// Seven sample notifications from today and three days ago, so the inbox
/// can be tried before the backend exists. Loading takes a moment, as it
/// would over a network.
class DemoNotificationsRepository implements NotificationsRepository {
  DemoNotificationsRepository({
    required this.now,
    this.delay = const Duration(milliseconds: 900),
  });

  final DateTime Function() now;
  final Duration delay;

  late final List<AppNotification> _inbox = _samples(now());

  @override
  Future<List<AppNotification>> fetchNotifications() async {
    await Future<void>.delayed(delay);
    return List.unmodifiable(_inbox);
  }

  @override
  Future<void> markRead(String id) async {
    final index = _inbox.indexWhere((notification) => notification.id == id);
    if (index >= 0) _inbox[index] = _inbox[index].copyWith(isRead: true);
  }

  @override
  Future<void> markAllRead() async {
    for (var i = 0; i < _inbox.length; i++) {
      _inbox[i] = _inbox[i].copyWith(isRead: true);
    }
  }

  static List<AppNotification> _samples(DateTime now) {
    DateTime today(int hour, int minute) =>
        DateTime(now.year, now.month, now.day, hour, minute);
    final earlier = DateTime(now.year, now.month, now.day - 3);
    DateTime thatDay(int hour, int minute) =>
        DateTime(earlier.year, earlier.month, earlier.day, hour, minute);

    return [
      AppNotification(
        id: 'NTF-007',
        type: NotificationType.rfidDisconnected,
        title: 'RFID reader disconnected',
        summary:
            'Reconnect your reader, or continue verification by plate '
            'number.',
        body:
            'The RFID reader connection was lost. Check the USB-C cable or '
            'approved reader connection before using RFID again. You can '
            'still verify a vehicle using its plate number. Reader '
            'disconnection is not proof of a missing or invalid E-Tag and '
            'must not classify a vehicle as non-compliant.',
        receivedAt: today(9, 45),
      ),
      AppNotification(
        id: 'NTF-006',
        type: NotificationType.incompleteVerification,
        title: 'Review an incomplete verification',
        summary:
            'BDG 204 XY could not be verified. Review the record before '
            'trying again.',
        body:
            'The receipt QR verification for BDG 204 XY did not complete. '
            'No trip or E-Tag conclusion was recorded. Open the personal '
            'verification record to review the pending action and retry '
            'when connectivity is available.',
        receivedAt: today(9, 40),
        verificationRecordId: 'VR-1042',
      ),
      AppNotification(
        id: 'NTF-005',
        type: NotificationType.locationAttention,
        title: 'Location needs your attention',
        summary: 'GPS was unavailable for a recent location request.',
        body:
            'Check that location services and app location permission are '
            'enabled on your device. An unavailable location is not '
            'evidence of vehicle non-compliance.',
        receivedAt: today(9, 32),
      ),
      AppNotification(
        id: 'NTF-004',
        type: NotificationType.connectionRestored,
        title: 'Internet connection restored',
        summary: 'You can continue your CHL trip and E-Tag checks.',
        body:
            'Your internet connection is back. Retry any incomplete '
            'verification explicitly; restored connectivity does not '
            'retroactively confirm a vehicle or trip result.',
        receivedAt: today(9, 28),
      ),
      AppNotification(
        id: 'NTF-003',
        type: NotificationType.rfidConnected,
        title: 'RFID reader connected',
        summary:
            'Your reader connected successfully. Scanning starts only when '
            'selected.',
        body:
            'The RFID reader was connected at the time of this update. A '
            'connection notification does not start scanning or verify a '
            'vehicle. Reader detection and communication activate only '
            'when RFID verification is selected. A later disconnected '
            'notification supersedes this earlier connection update.',
        receivedAt: today(9, 25),
        isRead: true,
      ),
      AppNotification(
        id: 'NTF-002',
        type: NotificationType.sessionExpiry,
        title: 'Session expiry reminder',
        summary: 'Sign in again when your centrally managed session expires.',
        body:
            'Your CHL session is managed centrally. When it expires, sign '
            'in again to continue. Work saved on this phone is kept.',
        receivedAt: thatDay(16, 15),
        isRead: true,
      ),
      AppNotification(
        id: 'NTF-001',
        type: NotificationType.appUpdate,
        title: 'Application update available',
        summary:
            'A new version is available through your approved app '
            'distribution channel.',
        body:
            'A new version of CHL Enforcement is available through your '
            'approved app distribution channel. Install it when you are not '
            'in the middle of a verification.',
        receivedAt: thatDay(10, 0),
        isRead: true,
      ),
    ];
  }
}
