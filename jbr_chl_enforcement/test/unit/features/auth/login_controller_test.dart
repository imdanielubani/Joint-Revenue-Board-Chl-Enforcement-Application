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
    test('shows a malformed email on the email field only', () async {
      final c = createContainer();

      await controller(c).submit(email: 'not-an-email', password: 'secret');

      expect(state(c).status, LoginStatus.failure);
      expect(state(c).emailError, LoginMessages.emailInvalid);
      expect(state(c).passwordError, isNull);
      expect(state(c).message, isNull, reason: 'no alert for field errors');
      expect(repository.calls, isEmpty);
    });

    test('asks for both fields when both are empty', () async {
      final c = createContainer();

      await controller(c).submit(email: '  ', password: '');

      expect(state(c).emailError, LoginMessages.emailRequired);
      expect(state(c).passwordError, LoginMessages.passwordRequired);
      expect(state(c).message, isNull);
      expect(repository.calls, isEmpty);
    });

    test("editing a field clears only that field's error", () async {
      final c = createContainer();
      await controller(c).submit(email: '', password: '');

      controller(c).onEmailChanged();

      expect(state(c).emailError, isNull);
      expect(state(c).passwordError, LoginMessages.passwordRequired);
      expect(state(c).status, LoginStatus.failure);

      controller(c).onPasswordChanged();

      expect(state(c).passwordError, isNull);
      expect(state(c).status, LoginStatus.idle);
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

    test('wrong credentials show one alert and leave the fields', () async {
      repository.failure = AuthFailure.invalidCredentials;
      final c = createContainer();

      await controller(c).submit(email: 'officer@jbr.com', password: 'wrong');

      expect(state(c).status, LoginStatus.failure);
      expect(state(c).message, LoginMessages.invalidCredentials);
      expect(state(c).emailError, isNull);
      expect(state(c).passwordError, isNull);
      expect(c.read(sessionProvider), isNull);
    });

    test('editing after a failed sign-in clears the alert', () async {
      repository.failure = AuthFailure.invalidCredentials;
      final c = createContainer();
      await controller(c).submit(email: 'officer@jbr.com', password: 'wrong');

      controller(c).onPasswordChanged();

      expect(state(c).message, isNull);
      expect(state(c).status, LoginStatus.idle);
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
        expect(state(c).emailError, isNull);
        expect(state(c).passwordError, isNull);
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
