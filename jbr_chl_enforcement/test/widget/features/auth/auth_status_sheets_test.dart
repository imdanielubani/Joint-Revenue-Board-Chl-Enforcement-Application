import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:jbr_chl_enforcement/app/app.dart';
import 'package:jbr_chl_enforcement/core/navigation/app_router.dart';
import 'package:jbr_chl_enforcement/core/navigation/route_names.dart';
import 'package:jbr_chl_enforcement/core/theme/app_theme.dart';
import 'package:jbr_chl_enforcement/features/auth/data/datasources/auth_local_data_source.dart';
import 'package:jbr_chl_enforcement/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/auth_failure.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/auth_session.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/providers/session_provider.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/screens/login_screen.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/widgets/auth_status_sheets.dart';
import 'package:jbr_chl_enforcement/features/dashboard/presentation/screens/dashboard_screen.dart';
import 'package:jbr_chl_enforcement/features/offline_sync/presentation/providers/sync_controller.dart';

import '../../../helpers/fakes.dart';

List<Override> _overrides({
  FakeAuthRepository? repository,
  int pendingActions = 0,
}) => [
  authRepositoryProvider.overrideWithValue(repository ?? FakeAuthRepository()),
  authLocalDataSourceProvider.overrideWithValue(
    AuthLocalDataSource(FakeSecureStorageService(), FakePreferencesService()),
  ),
  pendingSyncCountProvider.overrideWithValue(pendingActions),
];

Future<void> _usePhone(WidgetTester tester) async {
  tester.view
    ..physicalSize = const Size(390 * 3, 844 * 3)
    ..devicePixelRatio = 3
    ..padding = const FakeViewPadding(top: 47 * 3, bottom: 34 * 3)
    ..viewPadding = const FakeViewPadding(top: 47 * 3, bottom: 34 * 3);
  addTearDown(tester.view.reset);
}

Future<void> _pumpLogin(
  WidgetTester tester, {
  LoginNotice? notice,
  FakeAuthRepository? repository,
  int pendingActions = 0,
}) async {
  await _usePhone(tester);
  await tester.pumpWidget(
    ProviderScope(
      overrides: _overrides(
        repository: repository,
        pendingActions: pendingActions,
      ),
      child: MaterialApp(
        theme: AppTheme.light,
        home: LoginScreen(notice: notice),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

class _Device {
  const _Device(
    this.name,
    this.width,
    this.height, {
    this.top = 0,
    this.bottom = 0,
    this.left = 0,
    this.right = 0,
    this.textScale = 1,
  });

  final String name;
  final double width;
  final double height;
  final double top;
  final double bottom;
  final double left;
  final double right;
  final double textScale;
}

const _devices = [
  _Device('small Android, 3-button nav', 360, 640, top: 24, bottom: 48),
  _Device('iPhone SE', 375, 667, top: 20),
  _Device('iPhone 15 Pro Max', 430, 932, top: 59, bottom: 34),
  _Device('narrow 320x568', 320, 568, top: 20),
  _Device('iPad Pro 12.9', 1024, 1366, top: 24, bottom: 20),
  _Device('iPhone landscape', 852, 393, bottom: 21, left: 59, right: 59),
  _Device('Android landscape', 800, 360, top: 24, right: 48),
  _Device(
    'iPhone 15 Pro, 200% text',
    393,
    852,
    top: 59,
    bottom: 34,
    textScale: 2,
  ),
];

void main() {
  setUpAll(() async {
    final loader = FontLoader('Poppins');
    for (final weight in ['Regular', 'Medium', 'SemiBold', 'Bold']) {
      loader.addFont(
        rootBundle.load('assets/fonts/poppins/Poppins-$weight.ttf'),
      );
    }
    await loader.load();
  });

  group('account deactivated', () {
    testWidgets('shows when sign-in is refused; Back to Login closes it', (
      tester,
    ) async {
      final repository = FakeAuthRepository(
        failure: AuthFailure.accountDisabled,
      );
      await _pumpLogin(tester, repository: repository);

      await tester.enterText(find.byType(TextField).first, 'officer@jbr.com');
      await tester.enterText(find.byType(TextField).last, 'secret');
      await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
      await tester.pumpAndSettle();

      expect(find.byType(AccountDeactivatedSheet), findsOneWidget);
      expect(find.text('Account Deactivated'), findsOneWidget);
      expect(
        find.text(
          'This account can no longer access CHL Enforcement. Contact your '
          'JRB supervisor or administrator to restore access.',
        ),
        findsOneWidget,
      );

      await tester.tap(find.text('Back to Login'));
      await tester.pumpAndSettle();

      expect(find.byType(AccountDeactivatedSheet), findsNothing);
      expect(find.byType(LoginScreen), findsOneWidget);

      // The form works again: a second attempt shows the sheet again.
      await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
      await tester.pumpAndSettle();
      expect(find.byType(AccountDeactivatedSheet), findsOneWidget);
      expect(repository.calls, hasLength(2));
    });
  });

  group('session expired', () {
    testWidgets('shows when sign-in opens after expiry, without a banner', (
      tester,
    ) async {
      await _pumpLogin(tester, notice: LoginNotice.sessionExpired);

      expect(find.byType(SessionExpiredSheet), findsOneWidget);
      expect(find.text('Your Session Has Expired'), findsOneWidget);
      expect(
        find.text(
          'For security, sessions end automatically. Sign in to continue.',
        ),
        findsOneWidget,
      );
      expect(find.text('Queued work is safe'), findsNothing);

      await tester.tap(find.text('Back to Login'));
      await tester.pumpAndSettle();
      expect(find.byType(SessionExpiredSheet), findsNothing);
    });

    testWidgets('is not shown on a normal visit to sign-in', (tester) async {
      await _pumpLogin(tester);

      expect(find.byType(SessionExpiredSheet), findsNothing);
    });

    testWidgets('mentions one queued offline action', (tester) async {
      await _pumpLogin(
        tester,
        notice: LoginNotice.sessionExpired,
        pendingActions: 1,
      );

      expect(find.text('Queued work is safe'), findsOneWidget);
      expect(
        find.text('1 offline action will sync after you sign in.'),
        findsOneWidget,
      );
    });

    testWidgets('mentions several queued offline actions', (tester) async {
      await _pumpLogin(
        tester,
        notice: LoginNotice.sessionExpired,
        pendingActions: 3,
      );

      expect(
        find.text('3 offline actions will sync after you sign in.'),
        findsOneWidget,
      );
    });

    testWidgets('an expiring session sends the officer to sign-in with the '
        'sheet', (tester) async {
      await _usePhone(tester);
      final router = GoRouter(
        initialLocation: RoutePaths.dashboard,
        routes: [
          GoRoute(
            path: RoutePaths.login,
            name: RouteNames.login,
            builder: (context, state) => LoginScreen(
              notice: state.extra is LoginNotice
                  ? state.extra! as LoginNotice
                  : null,
            ),
          ),
          GoRoute(
            path: RoutePaths.dashboard,
            name: RouteNames.dashboard,
            builder: (context, state) => const DashboardScreen(),
          ),
        ],
      );
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            ..._overrides(),
            appRouterProvider.overrideWithValue(router),
          ],
          child: const ChlEnforcementApp(),
        ),
      );
      final container = ProviderScope.containerOf(
        tester.element(find.byType(DashboardScreen)),
      );
      container
          .read(sessionProvider.notifier)
          .start(
            AuthSession(
              accessToken: 'token',
              officer: FakeAuthRepository.officer,
              expiresAt: DateTime.now().add(const Duration(seconds: 30)),
            ),
          );
      await tester.pumpAndSettle();
      expect(find.text('Test Officer'), findsOneWidget);

      await tester.pump(const Duration(seconds: 31));
      await tester.pumpAndSettle();

      expect(find.byType(DashboardScreen), findsNothing);
      expect(find.byType(LoginScreen), findsOneWidget);
      expect(find.byType(SessionExpiredSheet), findsOneWidget);
      expect(container.read(sessionProvider), isNull);
    });
  });

  for (final device in _devices) {
    for (final pending in [0, 2]) {
      testWidgets('sheets fit on ${device.name} (pending $pending)', (
        tester,
      ) async {
        const dpr = 3.0;
        tester.view
          ..physicalSize = Size(device.width * dpr, device.height * dpr)
          ..devicePixelRatio = dpr
          ..padding = FakeViewPadding(
            top: device.top * dpr,
            bottom: device.bottom * dpr,
            left: device.left * dpr,
            right: device.right * dpr,
          );
        // On a real phone the system bars are in viewPadding as well.
        tester.view.viewPadding = tester.view.padding;
        tester.platformDispatcher.textScaleFactorTestValue = device.textScale;
        addTearDown(() {
          tester.view.reset();
          tester.platformDispatcher.clearTextScaleFactorTestValue();
        });

        await tester.pumpWidget(
          ProviderScope(
            overrides: _overrides(pendingActions: pending),
            child: MaterialApp(
              theme: AppTheme.light,
              home: const LoginScreen(notice: LoginNotice.sessionExpired),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);

        // The button can always be reached, inside the screen.
        final button = find.widgetWithText(FilledButton, 'Back to Login');
        await tester.ensureVisible(button);
        await tester.pumpAndSettle();
        final rect = tester.getRect(button);
        final screen = Rect.fromLTRB(
          device.left,
          device.top,
          device.width - device.right,
          device.height - device.bottom,
        ).inflate(0.5);
        expect(
          screen.contains(rect.topLeft) && screen.contains(rect.bottomRight),
          isTrue,
          reason: 'button $rect outside $screen',
        );

        // The deactivated sheet fits as well.
        await tester.tap(button);
        await tester.pumpAndSettle();
        final context = tester.element(find.byType(LoginScreen));
        // ignore: unawaited_futures
        showAccountDeactivatedSheet(context);
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(find.byType(AccountDeactivatedSheet), findsOneWidget);
      });
    }
  }
}
