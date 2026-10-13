import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import 'package:jbr_chl_enforcement/features/auth/domain/entities/auth_failure.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/auth_session.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/officer.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/repositories/auth_repository.dart';
import 'package:jbr_chl_enforcement/features/notifications/domain/entities/app_notification.dart';
import 'package:jbr_chl_enforcement/features/notifications/domain/repositories/notifications_repository.dart';
import 'package:jbr_chl_enforcement/features/offline_sync/domain/entities/sync_queue_item.dart';
import 'package:jbr_chl_enforcement/features/offline_sync/domain/repositories/sync_repository.dart';
import 'package:jbr_chl_enforcement/features/vehicle/domain/entities/verification_result.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/verification_method.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/verification_request.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/repositories/verification_repository.dart';
import 'package:jbr_chl_enforcement/features/verification_history/domain/entities/verification_record.dart';
import 'package:jbr_chl_enforcement/features/verification_history/domain/repositories/history_repository.dart';
import 'package:jbr_chl_enforcement/shared/device/location/location_adapter.dart';
import 'package:jbr_chl_enforcement/shared/device/permissions/permission_adapter.dart';
import 'package:jbr_chl_enforcement/shared/device/scanner/qr_scanner_adapter.dart';
import 'package:jbr_chl_enforcement/shared/storage/preferences_service.dart';
import 'package:jbr_chl_enforcement/shared/storage/secure_storage_service.dart';

/// In-memory [PreferencesService].
class FakePreferencesService implements PreferencesService {
  FakePreferencesService([Map<String, bool>? values]) : values = values ?? {};

  final Map<String, bool> values;

  @override
  Future<bool> getBool(String key, {bool defaultValue = false}) async =>
      values[key] ?? defaultValue;

  @override
  Future<void> setBool(String key, bool value) async => values[key] = value;
}

/// Scriptable [PermissionAdapter] that records what was called.
class FakePermissionAdapter implements PermissionAdapter {
  FakePermissionAdapter({
    Map<AppPermission, AppPermissionStatus>? statuses,
    this.locationServiceEnabled = true,
    this.statusAfterRequest = AppPermissionStatus.granted,
  }) : statuses = {
         for (final permission in AppPermission.values)
           permission: AppPermissionStatus.granted,
         ...?statuses,
       };

  /// All granted, GPS on: nothing for the permission screen to show.
  factory FakePermissionAdapter.allGranted() => FakePermissionAdapter();

  final Map<AppPermission, AppPermissionStatus> statuses;
  bool locationServiceEnabled;
  AppPermissionStatus statusAfterRequest;

  final List<AppPermission> requested = [];
  int appSettingsOpened = 0;
  int locationSettingsOpened = 0;

  @override
  Future<AppPermissionStatus> status(AppPermission permission) async =>
      statuses[permission]!;

  @override
  Future<AppPermissionStatus> request(AppPermission permission) async {
    requested.add(permission);
    return statuses[permission] = statusAfterRequest;
  }

  @override
  Future<bool> isLocationServiceEnabled() async => locationServiceEnabled;

  @override
  Future<bool> openAppSettings() async {
    appSettingsOpened++;
    return true;
  }

  @override
  Future<bool> openLocationSettings() async {
    locationSettingsOpened++;
    return true;
  }
}

/// In-memory [SecureStorageService].
class FakeSecureStorageService implements SecureStorageService {
  final Map<String, String> values = {};

  @override
  Future<String?> read(String key) async => values[key];

  @override
  Future<void> write(String key, String value) async => values[key] = value;

  @override
  Future<void> delete(String key) async => values.remove(key);
}

/// Scriptable [AuthRepository].
class FakeAuthRepository implements AuthRepository {
  FakeAuthRepository({
    this.failure,
    this.delay = Duration.zero,
    this.role = agentRole,
    this.resetFailure,
    this.resetDelay = Duration.zero,
  });

  static const String agentRole = 'Enforcement Agent';

  /// Fails with this when set; otherwise signs in as [officer] with [role].
  AuthFailure? failure;
  Duration delay;

  /// The signed-in officer's role; change it to test agent access.
  String? role;

  /// Password reset fails with this when set; otherwise succeeds.
  AuthFailure? resetFailure;
  Duration resetDelay;
  final List<String> resetRequests = [];

  static const Officer officer = Officer(
    id: 'o-1',
    name: 'Test Officer',
    email: 'officer@jbr.com',
    role: agentRole,
  );

  final List<({String email, String password})> calls = [];

  /// Sessions kept on the device, with the Remember Session choice.
  final List<({AuthSession session, bool remember})> kept = [];

  @override
  Future<AuthSession> signIn({
    required String email,
    required String password,
  }) async {
    calls.add((email: email, password: password));
    if (delay > Duration.zero) await Future<void>.delayed(delay);
    final failure = this.failure;
    if (failure != null) throw AuthException(failure);
    return AuthSession(
      accessToken: 'token',
      officer: Officer(
        id: officer.id,
        name: officer.name,
        email: officer.email,
        role: role,
      ),
    );
  }

  @override
  Future<void> keepSession(
    AuthSession session, {
    required bool rememberSession,
  }) async => kept.add((session: session, remember: rememberSession));

  @override
  Future<void> requestPasswordReset({required String email}) async {
    resetRequests.add(email);
    if (resetDelay > Duration.zero) await Future<void>.delayed(resetDelay);
    final failure = resetFailure;
    if (failure != null) throw AuthException(failure);
  }
}

/// Sync queue whose answers the test decides.
class FakeSyncRepository implements SyncRepository {
  FakeSyncRepository(this.pending);

  int pending;
  final _changes = StreamController<List<SyncQueueItem>>.broadcast();
  final List<Completer<void>> calls = [];

  /// Queued records; [pending] numbered ones unless [items] is set.
  List<SyncQueueItem>? items;

  List<SyncQueueItem> get _queue =>
      items ??
      [
        for (var i = 1; i <= pending; i++)
          SyncQueueItem(
            id: 'SYN-Q-00$i',
            plateNumber: 'ABC12${i}AA',
            method: VerificationMethod.manualPlate,
            savedAt: DateTime(2026, 10, 13, 9, i),
          ),
      ];

  @override
  Stream<List<SyncQueueItem>> watchQueue() async* {
    yield _queue;
    yield* _changes.stream;
  }

  @override
  Future<void> synchronize() {
    final call = Completer<void>();
    calls.add(call);
    return call.future;
  }

  /// CHL acknowledges the latest call; the queue empties.
  void acknowledge() {
    pending = 0;
    items = null;
    _changes.add(const []);
    calls.last.complete();
  }

  void fail() => calls.last.completeError(StateError('server error'));

  void dispose() => _changes.close();
}

/// Notification inbox whose answers the test decides.
class FakeNotificationsRepository implements NotificationsRepository {
  FakeNotificationsRepository(List<AppNotification> inbox) : inbox = [...inbox];

  final List<AppNotification> inbox;

  /// Set to make loading fail.
  Object? fetchError;

  /// Set to make read receipts fail.
  Object? markError;

  /// Set to hold loading until it completes.
  Completer<void>? gate;

  int fetchCount = 0;
  final List<String> markedRead = [];
  int markAllCount = 0;

  @override
  Future<List<AppNotification>> fetchNotifications() async {
    fetchCount++;
    await gate?.future;
    final error = fetchError;
    if (error != null) throw error;
    return List.unmodifiable(inbox);
  }

  @override
  Future<void> markRead(String id) async {
    markedRead.add(id);
    final error = markError;
    if (error != null) throw error;
    final index = inbox.indexWhere((notification) => notification.id == id);
    if (index >= 0) inbox[index] = inbox[index].copyWith(isRead: true);
  }

  @override
  Future<void> markAllRead() async {
    markAllCount++;
    final error = markError;
    if (error != null) throw error;
    for (var i = 0; i < inbox.length; i++) {
      inbox[i] = inbox[i].copyWith(isRead: true);
    }
  }
}

/// Verification history whose answers the test decides.
class FakeHistoryRepository implements HistoryRepository {
  FakeHistoryRepository(this.records);

  List<VerificationRecord> records;

  /// Set to make loading fail.
  Object? fetchError;

  /// Set to hold loading until it completes.
  Completer<void>? gate;

  int fetchCount = 0;

  @override
  Future<List<VerificationRecord>> fetchHistory() async {
    fetchCount++;
    await gate?.future;
    final error = fetchError;
    if (error != null) throw error;
    return List.unmodifiable(records);
  }
}

/// A QR camera the test drives: [see] a code, or change [cameraStatus].
class FakeQrScanner implements QrScanner {
  FakeQrScanner({
    QrCameraStatus status = QrCameraStatus.running,
    this.statusAfterStart = QrCameraStatus.running,
  }) : _status = ValueNotifier(status);

  final ValueNotifier<QrCameraStatus> _status;
  final StreamController<QrReading> _readings =
      StreamController<QrReading>.broadcast();

  /// What the camera reports after [start].
  QrCameraStatus statusAfterStart;

  int starts = 0;
  bool disposed = false;

  /// The camera sees a code; null when it cannot be decoded.
  void see(String? value) => _readings.add(QrReading(value));

  set cameraStatus(QrCameraStatus value) => _status.value = value;

  @override
  ValueListenable<QrCameraStatus> get status => _status;

  @override
  Stream<QrReading> get readings => _readings.stream;

  @override
  Widget buildPreview(BuildContext context) =>
      const SizedBox.expand(key: Key('camera preview'));

  @override
  Future<void> start() async {
    starts++;
    _status.value = statusAfterStart;
  }

  @override
  Future<void> dispose() async {
    disposed = true;
    await _readings.close();
  }
}

/// Verifications the test drives: each [verify] opens a stream that
/// [emit] and [fail] feed.
class FakeVerificationRepository implements VerificationRepository {
  final List<VerificationRequest> requests = [];
  StreamController<VerificationProgress>? _current;
  int cancelled = 0;

  /// What [refresh] returns (the same result by default), or throws.
  VerificationResult? refreshed;
  Object? refreshError;
  int refreshes = 0;

  /// What [recordDestinationLocation] fails with, if set; [recordGate]
  /// holds it until completed.
  Object? recordError;
  Completer<void>? recordGate;
  final List<DeviceLocation> recordedLocations = [];
  DateTime recordedAt = DateTime(2026, 10, 6, 0, 50);

  void emit(VerificationProgress progress) => _current!.add(progress);

  void fail(Object error) => _current!.addError(error);

  @override
  Stream<VerificationProgress> verify(VerificationRequest request) {
    requests.add(request);
    final controller = StreamController<VerificationProgress>(
      onCancel: () => cancelled++,
    );
    _current = controller;
    return controller.stream;
  }

  @override
  Future<VerificationResult> refresh(VerificationResult result) async {
    refreshes++;
    final error = refreshError;
    if (error != null) throw error;
    return refreshed ?? result;
  }

  @override
  Future<RecordedLocation> recordDestinationLocation(
    String transactionReference,
    DeviceLocation location,
  ) async {
    await recordGate?.future;
    final error = recordError;
    if (error != null) throw error;
    recordedLocations.add(location);
    return RecordedLocation(
      latitude: location.latitude,
      longitude: location.longitude,
      accuracyMetres: location.accuracyMetres,
      recordedAt: recordedAt,
    );
  }
}

/// A position that is always [location], unless [problem] is set.
class FakeLocationReader implements LocationReader {
  FakeLocationReader({DeviceLocation? location, this.problem})
    : location =
          location ??
          DeviceLocation(
            latitude: 8.974402,
            longitude: 7.452813,
            accuracyMetres: 97.2,
            at: DateTime(2026, 10, 6, 0, 49),
          );

  DeviceLocation location;
  LocationProblem? problem;

  /// Holds [current] until completed.
  Completer<void>? gate;
  int reads = 0;

  @override
  Future<DeviceLocation> current() async {
    reads++;
    await gate?.future;
    final problem = this.problem;
    if (problem != null) throw LocationUnavailable(problem);
    return location;
  }
}
