import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:jbr_chl_enforcement/core/navigation/route_names.dart';
import 'package:jbr_chl_enforcement/core/theme/app_theme.dart';
import 'package:jbr_chl_enforcement/features/auth/data/datasources/auth_local_data_source.dart';
import 'package:jbr_chl_enforcement/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/auth_failure.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/providers/auth_controller.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/providers/session_provider.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/screens/login_screen.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/widgets/sign_in_dialog.dart';

import '../../../helpers/fakes.dart';

const _dashboard = 'dashboard page';

late ProviderContainer _container;

Future<void> _pump(
  WidgetTester tester,
  FakeAuthRepository repository, {
  Size size = const Size(390, 844),
  EdgeInsets safeArea = const EdgeInsets.only(top: 47, bottom: 34),
  double textScale = 1,
  bool reduceMotion = false,
}) async {
  final padding = FakeViewPadding(
    left: safeArea.left * 3,
    top: safeArea.top * 3,
    right: safeArea.right * 3,
    bottom: safeArea.bottom * 3,
  );
  tester.view
    ..physicalSize = size * 3
    ..devicePixelRatio = 3
    ..padding = padding
    ..viewPadding = padding;
  tester.platformDispatcher
    ..textScaleFactorTestValue = textScale
    ..accessibilityFeaturesTestValue = FakeAccessibilityFeatures(
      disableAnimations: reduceMotion,
    );
  addTearDown(tester.view.reset);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
  addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);

  _container = ProviderContainer(
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
  addTearDown(_container.dispose);
  final router = GoRouter(
    initialLocation: RoutePaths.login,
    routes: [
      GoRoute(
        path: RoutePaths.login,
        name: RouteNames.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: RoutePaths.dashboard,
        name: RouteNames.dashboard,
        builder: (context, state) =>
            const Scaffold(body: Center(child: Text(_dashboard))),
      ),
    ],
  );
  addTearDown(router.dispose);

  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: _container,
      child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
}

Finder get _email => find.byType(TextField).first;
Finder get _password => find.byType(TextField).last;

/// Fills in the form and taps Sign in (scrolling to it on short screens).
Future<void> _signIn(WidgetTester tester) async {
  await tester.enterText(_email, 'officer@jbr.com');
  await tester.enterText(_password, 'secret');
  // Close the keyboard first, or the focused field scrolls back into view.
  FocusManager.instance.primaryFocus?.unfocus();
  await tester.pumpAndSettle();
  final button = find.widgetWithText(FilledButton, 'Sign in');
  await tester.ensureVisible(button);
  await tester.pumpAndSettle();
  await tester.tap(button);
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 250));
}

/// Runs a step's minimum time and lets the dialog settle on the result.
Future<void> _finishStep(WidgetTester tester) async {
  await tester.pump(LoginController.minStepDuration);
  await tester.pump(const Duration(milliseconds: 250));
}

/// Runs sign-in to a result dialog (it has no endless animation).
Future<void> _toResult(WidgetTester tester) async {
  await _finishStep(tester);
  await _finishStep(tester);
  await tester.pumpAndSettle();
}

/// Runs a successful sign-in through to the dashboard.
Future<void> _toDashboard(WidgetTester tester) async {
  for (var i = 0; i < 2; i++) {
    await _finishStep(tester);
  }
  await tester.pump(LoginController.confirmedHold);
  await tester.pump(const Duration(milliseconds: 250));
  await tester.pump(LoginScreen.successHoldDuration);
  await tester.pumpAndSettle();
}

Finder get _close => find.bySemanticsLabel('Close and return to sign in');

void main() {
  setUpAll(() async {
    // Real font so the layout checks measure text as on a device.
    final loader = FontLoader('Poppins');
    for (final weight in ['Regular', 'Medium', 'SemiBold', 'Bold']) {
      loader.addFont(
        rootBundle.load('assets/fonts/poppins/Poppins-$weight.ttf'),
      );
    }
    await loader.load();
  });

  group('progress', () {
    testWidgets('shows both steps and their progress', (tester) async {
      await _pump(tester, FakeAuthRepository());
      await _signIn(tester);

      expect(find.text('Signing you in'), findsOneWidget);
      expect(find.text('Authentication'), findsWidgets);
      expect(find.bySemanticsLabel('Authentication: Pending'), findsOneWidget);
      expect(find.bySemanticsLabel('Agent access: Pending'), findsOneWidget);

      await _finishStep(tester);
      expect(find.text('Checking agent access'), findsOneWidget);
      expect(find.text('Agent Authentication'), findsOneWidget);
      expect(
        find.bySemanticsLabel('Authentication: Completed'),
        findsOneWidget,
      );
      expect(find.bySemanticsLabel('Agent access: Pending'), findsOneWidget);

      // Access is confirmed one step later; "Completed" shows briefly.
      await tester.pump(const Duration(milliseconds: 200));
      expect(find.bySemanticsLabel('Agent access: Completed'), findsOneWidget);
      // The session is about to be kept: it can no longer be cancelled.
      expect(_close, findsNothing);

      await _toDashboard(tester);
      expect(find.text(_dashboard), findsOneWidget);
    });

    testWidgets('the close button abandons sign-in', (tester) async {
      await _pump(
        tester,
        FakeAuthRepository(delay: const Duration(seconds: 1)),
      );
      await _signIn(tester);

      await tester.tap(_close);
      await tester.pumpAndSettle();

      expect(find.byType(SignInDialog), findsNothing);
      expect(tester.widget<TextField>(_email).enabled, isTrue);

      // The late answer is ignored.
      await tester.pump(const Duration(seconds: 3));
      await tester.pumpAndSettle();
      expect(find.byType(SignInDialog), findsNothing);
      expect(_container.read(sessionProvider), isNull);
    });

    testWidgets('the system back button abandons sign-in', (tester) async {
      await _pump(tester, FakeAuthRepository());
      await _signIn(tester);

      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();

      expect(find.byType(SignInDialog), findsNothing);
      expect(find.byType(LoginScreen), findsOneWidget);
      expect(_container.read(sessionProvider), isNull);
    });

    testWidgets('the ring spinner holds still with reduced motion', (
      tester,
    ) async {
      // A slow server keeps sign-in on its first step.
      await _pump(
        tester,
        FakeAuthRepository(delay: const Duration(seconds: 10)),
        reduceMotion: true,
      );
      await _signIn(tester);
      // Let the Sign in button's tap ripple finish.
      await tester.pump(const Duration(seconds: 2));

      expect(find.text('Signing you in'), findsOneWidget);
      expect(tester.hasRunningAnimations, isFalse);

      await tester.tap(_close);
      await tester.pump(const Duration(seconds: 10));
      await tester.pumpAndSettle();
    });
  });

  group('Unable to sign in', () {
    testWidgets('Try again signs in once the problem is fixed', (tester) async {
      final repository = FakeAuthRepository(failure: AuthFailure.network);
      await _pump(tester, repository);
      await _signIn(tester);
      await _toResult(tester);

      expect(find.text('Unable to sign in'), findsOneWidget);
      expect(find.text('Sign-In Unsuccessful'), findsOneWidget);
      expect(find.text(LoginMessages.rejectedNetwork), findsOneWidget);

      repository.failure = null;
      await tester.tap(find.text('Try again'));
      await tester.pump();
      expect(find.text('Signing you in'), findsOneWidget);

      await _toDashboard(tester);
      expect(find.text(_dashboard), findsOneWidget);
      expect(repository.calls, hasLength(2));
    });

    testWidgets('the close button returns to the form as it was', (
      tester,
    ) async {
      await _pump(
        tester,
        FakeAuthRepository(failure: AuthFailure.invalidCredentials),
      );
      await _signIn(tester);
      await _toResult(tester);

      await tester.tap(_close);
      await tester.pumpAndSettle();

      expect(find.byType(SignInDialog), findsNothing);
      expect(tester.widget<TextField>(_email).controller!.text, isNotEmpty);
    });
  });

  group('Agent access not authorized', () {
    testWidgets('Use Another Account empties the form', (tester) async {
      await _pump(tester, FakeAuthRepository(role: 'Revenue Clerk'));
      await _signIn(tester);
      await _toResult(tester);

      expect(find.text('Agent access not authorized'), findsOneWidget);
      expect(find.text('Access Restricted'), findsOneWidget);

      await tester.tap(find.text('Use Another Account'));
      await tester.pumpAndSettle();

      expect(find.byType(SignInDialog), findsNothing);
      expect(tester.widget<TextField>(_email).controller!.text, isEmpty);
      expect(tester.widget<TextField>(_password).controller!.text, isEmpty);
      expect(_container.read(sessionProvider), isNull);
    });

    testWidgets('Recheck Access lets in an account whose role was fixed', (
      tester,
    ) async {
      final repository = FakeAuthRepository(role: 'Revenue Clerk');
      await _pump(tester, repository);
      await _signIn(tester);
      await _toResult(tester);

      repository.role = 'Enforcement Agent';
      await tester.tap(find.text('Recheck Access'));
      await tester.pump();
      expect(find.text('Checking agent access'), findsOneWidget);

      await _finishStep(tester);
      await tester.pump(LoginController.confirmedHold);
      await tester.pump(const Duration(milliseconds: 250));
      await tester.pump(LoginScreen.successHoldDuration);
      await tester.pumpAndSettle();
      expect(find.text(_dashboard), findsOneWidget);
    });

    testWidgets('Recheck Access with the role unchanged asks again', (
      tester,
    ) async {
      await _pump(tester, FakeAuthRepository(role: 'Revenue Clerk'));
      await _signIn(tester);
      await _toResult(tester);

      await tester.tap(find.text('Recheck Access'));
      await tester.pump();
      await _finishStep(tester);
      await tester.pumpAndSettle();

      expect(find.text('Agent access not authorized'), findsOneWidget);
    });
  });

  testWidgets('a deactivated account swaps the dialog for its sheet', (
    tester,
  ) async {
    await _pump(
      tester,
      FakeAuthRepository(failure: AuthFailure.accountDisabled),
    );
    await _signIn(tester);
    await _toResult(tester);

    expect(find.byType(SignInDialog), findsNothing);
    expect(find.text('Account Deactivated'), findsOneWidget);
  });

  group('never leaves the form locked', () {
    /// Removes the dialog the way navigation would, without its buttons.
    Future<void> removeDialogExternally(WidgetTester tester) async {
      final route = ModalRoute.of(tester.element(find.byType(SignInDialog)))!;
      route.navigator!.removeRoute(route);
      await tester.pumpAndSettle();
    }

    testWidgets('the form behind a result dialog stays enabled', (
      tester,
    ) async {
      await _pump(
        tester,
        FakeAuthRepository(failure: AuthFailure.invalidCredentials),
      );
      await _signIn(tester);
      await _toResult(tester);

      expect(find.text('Unable to sign in'), findsOneWidget);
      expect(tester.widget<TextField>(_email).enabled, isTrue);
      expect(tester.widget<TextField>(_password).enabled, isTrue);
    });

    for (final (outcome, repository) in [
      (
        'Unable to sign in',
        () => FakeAuthRepository(failure: AuthFailure.invalidCredentials),
      ),
      (
        'Agent access not authorized',
        () => FakeAuthRepository(role: 'Revenue Clerk'),
      ),
    ]) {
      testWidgets('"$outcome" removed by navigation unlocks the form', (
        tester,
      ) async {
        final repo = repository();
        await _pump(tester, repo);
        await _signIn(tester);
        await _toResult(tester);
        expect(find.text(outcome), findsOneWidget);

        await removeDialogExternally(tester);

        expect(find.byType(SignInDialog), findsNothing);
        expect(
          _container.read(loginControllerProvider).status,
          LoginStatus.idle,
        );

        // The form works: edit with real taps, and sign in again.
        WidgetController.hitTestWarningShouldBeFatal = true;
        addTearDown(() => WidgetController.hitTestWarningShouldBeFatal = false);
        await tester.tap(_password);
        await tester.pump();
        tester.testTextInput.enterText('Demo@2026');
        await tester.pump();
        expect(
          tester.widget<TextField>(_password).controller!.text,
          'Demo@2026',
        );

        repo
          ..failure = null
          ..role = FakeAuthRepository.agentRole;
        await _signIn(tester);
        expect(find.text('Signing you in'), findsOneWidget);
        await _toDashboard(tester);
        expect(find.text(_dashboard), findsOneWidget);
      });
    }

    testWidgets('progress removed by navigation abandons sign-in', (
      tester,
    ) async {
      await _pump(
        tester,
        FakeAuthRepository(delay: const Duration(seconds: 1)),
      );
      await _signIn(tester);

      await removeDialogExternally(tester);
      expect(tester.widget<TextField>(_email).enabled, isTrue);

      // The late answer is ignored.
      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();
      expect(find.byType(SignInDialog), findsNothing);
      expect(_container.read(sessionProvider), isNull);
    });

    testWidgets('Use Another Account ends the browser autofill session', (
      tester,
    ) async {
      final calls = <MethodCall>[];
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.textInput,
        (call) async {
          calls.add(call);
          return null;
        },
      );
      addTearDown(
        () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
          SystemChannels.textInput,
          null,
        ),
      );
      await _pump(tester, FakeAuthRepository(role: 'Revenue Clerk'));
      await _signIn(tester);
      await _toResult(tester);
      calls.clear();

      await tester.tap(find.text('Use Another Account'));
      await tester.pumpAndSettle();

      final finish = calls.where(
        (call) => call.method == 'TextInput.finishAutofillContext',
      );
      expect(finish, hasLength(1));
      expect(finish.single.arguments, isFalse, reason: 'nothing is saved');
    });
  });

  group('fits', () {
    final devices = <(String, Size, EdgeInsets, double)>[
      (
        'small Android, 3-button nav',
        const Size(360, 640),
        const EdgeInsets.only(top: 24, bottom: 48),
        1,
      ),
      (
        'narrow 320x568',
        const Size(320, 568),
        const EdgeInsets.only(top: 20),
        1,
      ),
      (
        'iPhone 15 Pro Max',
        const Size(430, 932),
        const EdgeInsets.only(top: 59, bottom: 34),
        1,
      ),
      (
        'iPad Pro 12.9',
        const Size(1024, 1366),
        const EdgeInsets.only(top: 24, bottom: 20),
        1,
      ),
      (
        'iPhone landscape',
        const Size(844, 390),
        const EdgeInsets.only(left: 47, right: 47, bottom: 21),
        1,
      ),
      (
        'iPhone 15 Pro, 200% text',
        const Size(393, 852),
        const EdgeInsets.only(top: 59, bottom: 34),
        2,
      ),
      (
        'small Android, 200% text',
        const Size(360, 640),
        const EdgeInsets.only(top: 24, bottom: 48),
        2,
      ),
    ];
    final outcomes = <(String, FakeAuthRepository Function(), String)>[
      (
        'rejected',
        () => FakeAuthRepository(failure: AuthFailure.invalidCredentials),
        'Edit credentials',
      ),
      (
        'not authorized',
        () => FakeAuthRepository(role: 'Revenue Clerk'),
        'Recheck Access',
      ),
    ];

    for (final (name, size, safeArea, textScale) in devices) {
      testWidgets('progress on $name', (tester) async {
        await _pump(
          tester,
          FakeAuthRepository(),
          size: size,
          safeArea: safeArea,
          textScale: textScale,
        );
        await _signIn(tester);
        expect(tester.takeException(), isNull);
        expect(
          tester.getSize(find.byType(SignInDialog).last).width,
          lessThanOrEqualTo(size.width),
        );
        await _toDashboard(tester);
      });

      for (final (outcome, repository, lastButton) in outcomes) {
        testWidgets('$outcome on $name', (tester) async {
          await _pump(
            tester,
            repository(),
            size: size,
            safeArea: safeArea,
            textScale: textScale,
          );
          await _signIn(tester);
          await _toResult(tester);
          expect(tester.takeException(), isNull);

          // Both buttons can be reached, scrolling the card if needed, and
          // stay inside the safe area.
          final button = find.text(lastButton);
          await tester.ensureVisible(button);
          await tester.pumpAndSettle();
          final rect = tester.getRect(button);
          expect(rect.bottom, lessThanOrEqualTo(size.height - safeArea.bottom));
          expect(rect.top, greaterThanOrEqualTo(safeArea.top));
          await tester.tap(button);
          await tester.pump();
          expect(tester.takeException(), isNull);
          await tester.pump(const Duration(seconds: 5));
          await tester.pumpAndSettle();
        });
      }
    }
  });
}
