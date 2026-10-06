import 'package:fake_async/fake_async.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jbr_chl_enforcement/core/constants/storage_keys.dart';
import 'package:jbr_chl_enforcement/features/auth/data/datasources/auth_local_data_source.dart';
import 'package:jbr_chl_enforcement/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/auth_session.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/officer.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/providers/session_provider.dart';

import '../../../helpers/fakes.dart';

void main() {
  const officer = Officer(id: '1', name: 'Ada', email: 'ada@jbr.com');

  AuthSession sessionExpiringIn(Duration duration) => AuthSession(
    accessToken: 'token',
    officer: officer,
    expiresAt: DateTime.now().add(duration),
  );

  late FakeSecureStorageService secureStorage;

  ProviderContainer createContainer() {
    final container = ProviderContainer(
      overrides: [
        authLocalDataSourceProvider.overrideWithValue(
          AuthLocalDataSource(secureStorage, FakePreferencesService()),
        ),
      ],
    );
    addTearDown(container.dispose);
    return container;
  }

  setUp(() {
    secureStorage = FakeSecureStorageService()
      ..values[StorageKeys.authSession] = 'saved';
  });

  test('ends the session and reports expiry when the token expires', () {
    fakeAsync((async) {
      final container = createContainer();
      container
          .read(sessionProvider.notifier)
          .start(sessionExpiringIn(const Duration(hours: 1)));

      async.elapse(const Duration(minutes: 59));
      expect(container.read(sessionProvider), isNotNull);
      expect(container.read(sessionEndProvider), isNull);

      async.elapse(const Duration(minutes: 2));
      async.flushMicrotasks();

      expect(container.read(sessionProvider), isNull);
      expect(container.read(sessionEndProvider), SessionEndReason.expired);
      expect(secureStorage.values.containsKey(StorageKeys.authSession), false);
    });
  });

  test('a session that has already expired ends straight away', () {
    final container = createContainer();

    container
        .read(sessionProvider.notifier)
        .start(sessionExpiringIn(const Duration(seconds: -1)));

    expect(container.read(sessionProvider), isNull);
    expect(container.read(sessionEndProvider), SessionEndReason.expired);
  });

  test('a session without an expiry stays until ended', () {
    fakeAsync((async) {
      final container = createContainer();
      container
          .read(sessionProvider.notifier)
          .start(const AuthSession(accessToken: 't', officer: officer));

      async.elapse(const Duration(days: 30));

      expect(container.read(sessionProvider), isNotNull);
    });
  });

  test('signing out cancels the expiry and reports nothing', () {
    fakeAsync((async) {
      final container = createContainer();
      final notifier = container.read(sessionProvider.notifier)
        ..start(sessionExpiringIn(const Duration(minutes: 5)));

      notifier.end();
      async.elapse(const Duration(minutes: 10));

      expect(container.read(sessionProvider), isNull);
      expect(container.read(sessionEndProvider), isNull);
    });
  });

  test('starting a new session replaces the old expiry', () {
    fakeAsync((async) {
      final container = createContainer();
      container.read(sessionProvider.notifier)
        ..start(sessionExpiringIn(const Duration(minutes: 5)))
        ..start(sessionExpiringIn(const Duration(hours: 2)));

      async.elapse(const Duration(minutes: 10));

      expect(container.read(sessionProvider), isNotNull);
      expect(container.read(sessionEndProvider), isNull);
    });
  });
}
