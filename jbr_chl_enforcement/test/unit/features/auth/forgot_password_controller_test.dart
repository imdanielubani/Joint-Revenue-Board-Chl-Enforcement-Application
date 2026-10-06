import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jbr_chl_enforcement/features/auth/data/datasources/auth_local_data_source.dart';
import 'package:jbr_chl_enforcement/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/auth_failure.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/providers/auth_controller.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/providers/forgot_password_controller.dart';

import '../../../helpers/fakes.dart';

void main() {
  late FakeAuthRepository repository;

  ProviderContainer createContainer() {
    final container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(repository),
        authLocalDataSourceProvider.overrideWithValue(
          AuthLocalDataSource(
            FakeSecureStorageService(),
            FakePreferencesService(),
          ),
        ),
      ],
    );
    addTearDown(container.dispose);
    container.listen(forgotPasswordControllerProvider, (_, _) {});
    return container;
  }

  ForgotPasswordController controller(ProviderContainer c) =>
      c.read(forgotPasswordControllerProvider.notifier);
  ForgotPasswordState state(ProviderContainer c) =>
      c.read(forgotPasswordControllerProvider);

  setUp(() => repository = FakeAuthRepository());

  group('validation', () {
    test('asks for an email when empty', () async {
      final c = createContainer();

      await controller(c).submit('   ');

      expect(state(c).status, ForgotPasswordStatus.failure);
      expect(state(c).emailError, LoginMessages.emailRequired);
      expect(state(c).message, isNull);
      expect(repository.resetRequests, isEmpty);
    });

    test('rejects a malformed email', () async {
      final c = createContainer();

      await controller(c).submit('officer@jbr');

      expect(state(c).emailError, LoginMessages.emailInvalid);
      expect(repository.resetRequests, isEmpty);
    });

    test('editing clears the error', () async {
      final c = createContainer();
      await controller(c).submit('');

      controller(c).onEmailChanged();

      expect(state(c).status, ForgotPasswordStatus.idle);
      expect(state(c).emailError, isNull);
    });
  });

  test('sends the trimmed email and reports it sent', () async {
    final c = createContainer();

    await controller(c).submit('  officer@jbr.com ');

    expect(repository.resetRequests, ['officer@jbr.com']);
    expect(state(c).status, ForgotPasswordStatus.sent);
  });

  test('shows the sending state while waiting', () async {
    repository.resetDelay = const Duration(milliseconds: 50);
    final c = createContainer();

    final pending = controller(c).submit('officer@jbr.com');

    expect(state(c).isSubmitting, isTrue);
    await pending;
    expect(state(c).status, ForgotPasswordStatus.sent);
  });

  test('ignores repeated taps while sending', () async {
    repository.resetDelay = const Duration(milliseconds: 50);
    final c = createContainer();

    await Future.wait([
      controller(c).submit('officer@jbr.com'),
      controller(c).submit('officer@jbr.com'),
    ]);

    expect(repository.resetRequests, hasLength(1));
  });

  test('another link can be requested after the sheet is closed', () async {
    final c = createContainer();
    await controller(c).submit('officer@jbr.com');

    await controller(c).submit('officer@jbr.com');
    expect(repository.resetRequests, hasLength(1), reason: 'still showing');

    controller(c).acknowledgeSent();
    await controller(c).submit('officer@jbr.com');

    expect(repository.resetRequests, hasLength(2));
  });

  group('failures', () {
    test('a rejected email shows on the field', () async {
      repository.resetFailure = AuthFailure.invalidCredentials;
      final c = createContainer();

      await controller(c).submit('officer@jbr.com');

      expect(state(c).emailError, LoginMessages.emailInvalid);
      expect(state(c).message, isNull);
    });

    for (final (failure, message) in [
      (AuthFailure.network, LoginMessages.network),
      (AuthFailure.server, ForgotPasswordMessages.server),
      (AuthFailure.notConfigured, LoginMessages.notConfigured),
    ]) {
      test('${failure.name} shows an alert', () async {
        repository.resetFailure = failure;
        final c = createContainer();

        await controller(c).submit('officer@jbr.com');

        expect(state(c).status, ForgotPasswordStatus.failure);
        expect(state(c).message, message);
        expect(state(c).emailError, isNull);
      });
    }
  });
}
