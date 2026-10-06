import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jbr_chl_enforcement/core/constants/storage_keys.dart';
import 'package:jbr_chl_enforcement/features/auth/data/datasources/auth_local_data_source.dart';
import 'package:jbr_chl_enforcement/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/auth_failure.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/providers/auth_controller.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/providers/session_provider.dart';

import '../../../helpers/fakes.dart';

void main() {
  late FakeAuthRepository repository;
  late FakePreferencesService preferences;

  ProviderContainer createContainer() {
    final container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(repository),
        authLocalDataSourceProvider.overrideWithValue(
          AuthLocalDataSource(FakeSecureStorageService(), preferences),
        ),
      ],
    );
    addTearDown(container.dispose);
    // Keep the auto-disposed controller alive for the whole test.
    container.listen(loginControllerProvider, (_, _) {});
    return container;
  }

  LoginController controller(ProviderContainer c) =>
      c.read(loginControllerProvider.notifier);
  LoginState state(ProviderContainer c) => c.read(loginControllerProvider);

  setUp(() {
    repository = FakeAuthRepository();
    preferences = FakePreferencesService();
  });

  group('validation', () {
    test('flags an invalid email without calling the API', () async {
      final c = createContainer();

      await controller(c).submit(email: 'not-an-email', password: 'secret');

      expect(state(c).status, LoginStatus.failure);
      expect(state(c).message, LoginMessages.invalid);
      expect(state(c).emailInvalid, isTrue);
      expect(state(c).passwordInvalid, isFalse);
      expect(repository.calls, isEmpty);
    });

    test('flags both fields when both are empty', () async {
      final c = createContainer();

      await controller(c).submit(email: '  ', password: '');

      expect(state(c).emailInvalid, isTrue);
      expect(state(c).passwordInvalid, isTrue);
      expect(repository.calls, isEmpty);
    });

    test('editing a field clears the error', () async {
      final c = createContainer();
      await controller(c).submit(email: '', password: '');

      controller(c).onInputChanged();

      expect(state(c).status, LoginStatus.idle);
      expect(state(c).message, isNull);
      expect(state(c).emailInvalid, isFalse);
      expect(state(c).passwordInvalid, isFalse);
    });
  });

  group('sign-in', () {
    test('signs in with the trimmed email and starts the session', () async {
      final c = createContainer();
      controller(c).setRememberSession(true);

      await controller(c)
          .submit(email: '  officer@jbr.com ', password: ' pass with spaces ');

      expect(repository.calls.single.email, 'officer@jbr.com');
      expect(repository.calls.single.password, ' pass with spaces ');
      expect(repository.calls.single.remember, isTrue);
      expect(state(c).status, LoginStatus.success);
      expect(state(c).message, LoginMessages.success);
      expect(c.read(sessionProvider)?.officer, FakeAuthRepository.officer);
    });

    test('shows the submitting state while waiting', () async {
      repository.delay = const Duration(milliseconds: 50);
      final c = createContainer();

      final pending = controller(c)
          .submit(email: 'officer@jbr.com', password: 'secret');

      expect(state(c).isSubmitting, isTrue);
      expect(state(c).isLocked, isTrue);
      await pending;
      expect(state(c).status, LoginStatus.success);
    });

    test('ignores a second submit while the first is in progress', () async {
      repository.delay = const Duration(milliseconds: 50);
      final c = createContainer();

      final first = controller(c)
          .submit(email: 'officer@jbr.com', password: 'secret');
      final second = controller(c)
          .submit(email: 'officer@jbr.com', password: 'secret');
      await Future.wait([first, second]);

      expect(repository.calls, hasLength(1));
    });

    test('wrong credentials flag both fields', () async {
      repository.failure = AuthFailure.invalidCredentials;
      final c = createContainer();

      await controller(c).submit(email: 'officer@jbr.com', password: 'wrong');

      expect(state(c).status, LoginStatus.failure);
      expect(state(c).message, LoginMessages.invalid);
      expect(state(c).emailInvalid, isTrue);
      expect(state(c).passwordInvalid, isTrue);
      expect(c.read(sessionProvider), isNull);
    });

    for (final (failure, message) in [
      (AuthFailure.network, LoginMessages.network),
      (AuthFailure.server, LoginMessages.server),
      (AuthFailure.notConfigured, LoginMessages.notConfigured),
    ]) {
      test('${failure.name} failure shows its message without flagging '
          'fields', () async {
        repository.failure = failure;
        final c = createContainer();

        await controller(c).submit(email: 'officer@jbr.com', password: 'x');

        expect(state(c).message, message);
        expect(state(c).emailInvalid, isFalse);
        expect(state(c).passwordInvalid, isFalse);
      });
    }
  });

  test('restores the saved Remember Session choice', () async {
    preferences.values[StorageKeys.rememberSession] = true;
    final c = createContainer();

    await pumpEventQueue();

    expect(state(c).rememberSession, isTrue);
  });
}
