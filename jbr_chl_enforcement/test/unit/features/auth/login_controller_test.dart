import 'package:fake_async/fake_async.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jbr_chl_enforcement/core/constants/storage_keys.dart';
import 'package:jbr_chl_enforcement/features/auth/data/datasources/auth_local_data_source.dart';
import 'package:jbr_chl_enforcement/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/auth_failure.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/providers/auth_controller.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/providers/session_provider.dart';

import '../../../helpers/fakes.dart';

/// Long enough for every step of a sign-in to finish.
const _allSteps = Duration(seconds: 5);

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

  /// Runs [body] with controllable time; the container is created inside.
  void withTime(void Function(FakeAsync async, ProviderContainer c) body) {
    fakeAsync((async) {
      final c = createContainer();
      async.flushMicrotasks();
      body(async, c);
    });
  }

  /// Every status the controller changes to from now on.
  List<LoginStatus> record(ProviderContainer c) {
    final statuses = <LoginStatus>[];
    var last = state(c).status;
    c.listen(loginControllerProvider, (_, next) {
      if (next.status == last) return;
      last = next.status;
      statuses.add(next.status);
    });
    return statuses;
  }

  void submit(ProviderContainer c, {String password = 'secret'}) {
    controller(c).submit(email: 'officer@jbr.com', password: password);
  }

  setUp(() {
    repository = FakeAuthRepository();
    preferences = FakePreferencesService();
  });

  group('validation', () {
    test('shows a malformed email on the email field only', () async {
      final c = createContainer();

      await controller(c).submit(email: 'not-an-email', password: 'secret');

      expect(state(c).status, LoginStatus.invalidInput);
      expect(state(c).emailError, LoginMessages.emailInvalid);
      expect(state(c).passwordError, isNull);
      expect(state(c).showsSignInDialog, isFalse);
      expect(repository.calls, isEmpty);
    });

    test('asks for both fields when both are empty', () async {
      final c = createContainer();

      await controller(c).submit(email: '  ', password: '');

      expect(state(c).emailError, LoginMessages.emailRequired);
      expect(state(c).passwordError, LoginMessages.passwordRequired);
      expect(repository.calls, isEmpty);
    });

    test("editing a field clears only that field's error", () async {
      final c = createContainer();
      await controller(c).submit(email: '', password: '');

      controller(c).onEmailChanged();

      expect(state(c).emailError, isNull);
      expect(state(c).passwordError, LoginMessages.passwordRequired);
      expect(state(c).status, LoginStatus.invalidInput);

      controller(c).onPasswordChanged();

      expect(state(c).passwordError, isNull);
      expect(state(c).status, LoginStatus.idle);
    });
  });

  group('signing in as an enforcement agent', () {
    test('goes through each step, then keeps and starts the session', () {
      withTime((async, c) {
        controller(c).setRememberSession(true);
        final statuses = record(c);

        controller(
          c,
        ).submit(email: '  officer@jbr.com ', password: ' pass with spaces ');
        async.elapse(_allSteps);

        expect(statuses, [
          LoginStatus.authenticating,
          LoginStatus.checkingAccess,
          LoginStatus.accessConfirmed,
          LoginStatus.success,
        ]);
        expect(repository.calls.single.email, 'officer@jbr.com');
        expect(repository.calls.single.password, ' pass with spaces ');
        expect(state(c).message, LoginMessages.success);
        expect(c.read(sessionProvider)?.officer.name, 'Test Officer');
        expect(repository.kept.single.remember, isTrue);
        expect(state(c).showsSignInDialog, isFalse);
      });
    });

    test('shows each step for at least the minimum time', () {
      withTime((async, c) {
        submit(c);

        async.elapse(
          LoginController.minStepDuration - const Duration(milliseconds: 1),
        );
        expect(state(c).status, LoginStatus.authenticating);

        async.elapse(const Duration(milliseconds: 1));
        expect(state(c).status, LoginStatus.checkingAccess);

        async.elapse(LoginController.minStepDuration);
        expect(state(c).status, LoginStatus.accessConfirmed);

        async.elapse(LoginController.confirmedHold);
        expect(state(c).status, LoginStatus.success);
      });
    });

    test('keeps nothing until agent access is confirmed', () {
      withTime((async, c) {
        submit(c);

        async.elapse(LoginController.minStepDuration);
        expect(state(c).status, LoginStatus.checkingAccess);
        expect(repository.kept, isEmpty);
        expect(c.read(sessionProvider), isNull);

        async.elapse(LoginController.minStepDuration);
        expect(state(c).status, LoginStatus.accessConfirmed);
        expect(repository.kept, isEmpty);
        expect(c.read(sessionProvider), isNull);
      });
    });

    test('locks the form and shows the dialog while signing in', () {
      withTime((async, c) {
        submit(c);

        expect(state(c).isSubmitting, isTrue);
        expect(state(c).isLocked, isTrue);
        expect(state(c).showsSignInDialog, isTrue);
        async.elapse(_allSteps);
      });
    });

    test('ignores a second submit while the first is in progress', () {
      withTime((async, c) {
        submit(c);
        submit(c);
        async.elapse(_allSteps);

        expect(repository.calls, hasLength(1));
      });
    });
  });

  group('agent access', () {
    for (final role in ['Revenue Clerk', null]) {
      test('${role ?? 'no role'} is not authorized and nothing is kept', () {
        withTime((async, c) {
          repository.role = role;
          submit(c);
          async.elapse(_allSteps);

          expect(state(c).status, LoginStatus.notAuthorized);
          expect(state(c).showsSignInDialog, isTrue);
          expect(repository.kept, isEmpty);
          expect(c.read(sessionProvider), isNull);
        });
      });
    }

    test('Recheck Access signs in again and picks up a new role', () {
      withTime((async, c) {
        repository.role = 'Revenue Clerk';
        submit(c);
        async.elapse(_allSteps);

        // An administrator grants the role.
        repository.role = 'ENFORCEMENT_AGENT';
        final statuses = record(c);
        controller(c).recheckAccess();
        async.elapse(_allSteps);

        expect(statuses, [
          LoginStatus.checkingAccess,
          LoginStatus.accessConfirmed,
          LoginStatus.success,
        ]);
        expect(repository.calls, hasLength(2));
        expect(c.read(sessionProvider)?.officer.role, 'ENFORCEMENT_AGENT');
        expect(repository.kept, hasLength(1));
      });
    });

    test('Recheck Access with the role unchanged stays not authorized', () {
      withTime((async, c) {
        repository.role = 'Revenue Clerk';
        submit(c);
        async.elapse(_allSteps);

        controller(c).recheckAccess();
        async.elapse(_allSteps);

        expect(state(c).status, LoginStatus.notAuthorized);
        expect(repository.kept, isEmpty);
      });
    });

    test('Use Another Account closes the dialog and empties the form', () {
      withTime((async, c) {
        repository.role = 'Revenue Clerk';
        submit(c);
        async.elapse(_allSteps);
        final requests = state(c).clearFormRequests;

        controller(c).useAnotherAccount();

        expect(state(c).status, LoginStatus.idle);
        expect(state(c).showsSignInDialog, isFalse);
        expect(state(c).clearFormRequests, requests + 1);
      });
    });

    test('a failed recheck can be tried again', () {
      withTime((async, c) {
        repository.role = 'Revenue Clerk';
        submit(c);
        async.elapse(_allSteps);

        repository.failure = AuthFailure.network;
        controller(c).recheckAccess();
        async.elapse(_allSteps);
        expect(state(c).status, LoginStatus.rejected);
        expect(state(c).rejection, AuthFailure.network);

        repository
          ..failure = null
          ..role = FakeAuthRepository.agentRole;
        controller(c).retry();
        async.elapse(_allSteps);
        expect(state(c).status, LoginStatus.success);
      });
    });
  });

  group('accounts that may not sign in at all', () {
    test('show "not authorized", not "Unable to sign in"', () {
      withTime((async, c) {
        repository.failure = AuthFailure.notAuthorized;
        submit(c);
        async.elapse(_allSteps);

        expect(state(c).status, LoginStatus.notAuthorized);
        expect(state(c).rejection, isNull);
        expect(repository.kept, isEmpty);
        expect(c.read(sessionProvider), isNull);
      });
    });

    test('Recheck Access signs in again from the start', () {
      withTime((async, c) {
        repository.failure = AuthFailure.notAuthorized;
        submit(c, password: 'pass');
        async.elapse(_allSteps);

        // An administrator gives the account agent access.
        repository.failure = null;
        final statuses = record(c);
        controller(c).recheckAccess();
        async.elapse(_allSteps);

        expect(statuses.first, LoginStatus.authenticating);
        expect(state(c).status, LoginStatus.success);
        expect(repository.calls, hasLength(2));
        expect(repository.calls.last.password, 'pass');
      });
    });

    test('Recheck Access still refused stays "not authorized"', () {
      withTime((async, c) {
        repository.failure = AuthFailure.notAuthorized;
        submit(c);
        async.elapse(_allSteps);

        controller(c).recheckAccess();
        async.elapse(_allSteps);

        expect(state(c).status, LoginStatus.notAuthorized);
      });
    });
  });

  group('sign-in not confirmed', () {
    for (final failure in [
      AuthFailure.invalidCredentials,
      AuthFailure.network,
      AuthFailure.server,
      AuthFailure.notConfigured,
    ]) {
      test('${failure.name} is shown in the dialog, not on the fields', () {
        withTime((async, c) {
          repository.failure = failure;
          submit(c);
          async.elapse(_allSteps);

          expect(state(c).status, LoginStatus.rejected);
          expect(state(c).rejection, failure);
          expect(state(c).showsSignInDialog, isTrue);
          expect(state(c).emailError, isNull);
          expect(state(c).passwordError, isNull);
          expect(c.read(sessionProvider), isNull);
        });
      });
    }

    test('Try again signs in again with the same credentials', () {
      withTime((async, c) {
        repository.failure = AuthFailure.network;
        submit(c, password: 'pass');
        async.elapse(_allSteps);

        repository.failure = null;
        controller(c).retry();
        async.elapse(_allSteps);

        expect(repository.calls, hasLength(2));
        expect(repository.calls.last.password, 'pass');
        expect(state(c).status, LoginStatus.success);
      });
    });

    test('Edit credentials closes the dialog and keeps the form', () {
      withTime((async, c) {
        repository.failure = AuthFailure.invalidCredentials;
        submit(c);
        async.elapse(_allSteps);
        final requests = state(c).clearFormRequests;

        controller(c).dismiss();

        expect(state(c).status, LoginStatus.idle);
        expect(state(c).isLocked, isFalse);
        expect(state(c).clearFormRequests, requests);
      });
    });

    test('a deactivated account closes the dialog for its own sheet', () {
      withTime((async, c) {
        repository.failure = AuthFailure.accountDisabled;
        submit(c);
        async.elapse(_allSteps);

        expect(state(c).status, LoginStatus.accountDisabled);
        expect(state(c).showsSignInDialog, isFalse);
        expect(c.read(sessionProvider), isNull);

        controller(c).acknowledgeAccountDisabled();
        expect(state(c).status, LoginStatus.idle);
      });
    });

    test('rejection wording follows the failure', () {
      expect(
        LoginMessages.rejectionFor(AuthFailure.invalidCredentials),
        LoginMessages.rejectedCredentials,
      );
      expect(
        LoginMessages.rejectionFor(AuthFailure.network),
        LoginMessages.rejectedNetwork,
      );
      expect(
        LoginMessages.rejectionFor(AuthFailure.server),
        LoginMessages.rejectedServer,
      );
      expect(
        LoginMessages.rejectionFor(AuthFailure.notConfigured),
        LoginMessages.rejectedNotConfigured,
      );
    });
  });

  group('the form is never left locked', () {
    test('the form stays unlocked behind a result dialog', () {
      withTime((async, c) {
        repository.failure = AuthFailure.invalidCredentials;
        submit(c);
        async.elapse(_allSteps);

        expect(state(c).showsSignInDialog, isTrue);
        expect(state(c).isLocked, isFalse);
      });
    });

    test('editing a field after the dialog went dismisses the result', () {
      withTime((async, c) {
        repository.role = 'Revenue Clerk';
        submit(c);
        async.elapse(_allSteps);
        expect(state(c).status, LoginStatus.notAuthorized);

        controller(c).onPasswordChanged();

        expect(state(c).status, LoginStatus.idle);
        expect(state(c).showsSignInDialog, isFalse);
      });
    });

    test('the dialog closing on its own dismisses sign-in', () {
      withTime((async, c) {
        repository.failure = AuthFailure.network;
        submit(c);
        async.elapse(_allSteps);

        controller(c).onDialogClosed();

        expect(state(c).status, LoginStatus.idle);
      });
    });

    test('the dialog closing after success changes nothing', () {
      withTime((async, c) {
        submit(c);
        async.elapse(_allSteps);

        controller(c).onDialogClosed();

        expect(state(c).status, LoginStatus.success);
      });
    });
  });

  group('cancelling', () {
    test('closing during sign-in abandons it, even if it then succeeds', () {
      withTime((async, c) {
        repository.delay = const Duration(seconds: 1);
        submit(c);
        async.elapse(const Duration(milliseconds: 200));

        controller(c).dismiss();
        expect(state(c).status, LoginStatus.idle);

        async.elapse(_allSteps);
        expect(state(c).status, LoginStatus.idle);
        expect(c.read(sessionProvider), isNull);
        expect(repository.kept, isEmpty);
      });
    });

    test('closing while checking access abandons it', () {
      withTime((async, c) {
        submit(c);
        async.elapse(LoginController.minStepDuration);
        expect(state(c).status, LoginStatus.checkingAccess);

        controller(c).dismiss();
        async.elapse(_allSteps);

        expect(state(c).status, LoginStatus.idle);
        expect(c.read(sessionProvider), isNull);
        expect(repository.kept, isEmpty);
      });
    });

    test('cannot be abandoned once access is confirmed', () {
      withTime((async, c) {
        submit(c);
        async.elapse(LoginController.minStepDuration * 2);
        expect(state(c).status, LoginStatus.accessConfirmed);
        expect(state(c).canCancel, isFalse);

        controller(c).dismiss();
        async.elapse(_allSteps);

        expect(state(c).status, LoginStatus.success);
      });
    });

    test('a new sign-in after cancelling works normally', () {
      withTime((async, c) {
        submit(c);
        async.elapse(const Duration(milliseconds: 100));
        controller(c).dismiss();

        submit(c);
        async.elapse(_allSteps);

        expect(state(c).status, LoginStatus.success);
        expect(repository.kept, hasLength(1));
      });
    });
  });

  test('restores the saved Remember Session choice', () async {
    preferences.values[StorageKeys.rememberSession] = true;
    final c = createContainer();

    await pumpEventQueue();

    expect(state(c).rememberSession, isTrue);
  });
}
