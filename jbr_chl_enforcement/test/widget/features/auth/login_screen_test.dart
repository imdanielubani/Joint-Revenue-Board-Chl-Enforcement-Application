import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:jbr_chl_enforcement/core/navigation/route_names.dart';
import 'package:jbr_chl_enforcement/core/theme/app_colors.dart';
import 'package:jbr_chl_enforcement/core/theme/app_theme.dart';
import 'package:jbr_chl_enforcement/features/auth/data/datasources/auth_local_data_source.dart';
import 'package:jbr_chl_enforcement/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/auth_failure.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/providers/auth_controller.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/screens/forgot_password_screen.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/screens/login_screen.dart';
import 'package:jbr_chl_enforcement/features/dashboard/presentation/screens/dashboard_screen.dart';
import 'package:jbr_chl_enforcement/shared/ui/widgets/app_alert_banner.dart';
import 'package:jbr_chl_enforcement/shared/ui/widgets/app_spinner.dart';

import '../../../helpers/fakes.dart';

Widget _app(FakeAuthRepository repository) {
  final router = GoRouter(
    initialLocation: RoutePaths.login,
    routes: [
      GoRoute(
        path: RoutePaths.login,
        name: RouteNames.login,
        builder: (context, state) => const LoginScreen(),
        routes: [
          GoRoute(
            path: 'forgot-password',
            name: RouteNames.forgotPassword,
            builder: (context, state) => const ForgotPasswordScreen(),
          ),
        ],
      ),
      GoRoute(
        path: RoutePaths.dashboard,
        name: RouteNames.dashboard,
        builder: (context, state) => const DashboardScreen(),
      ),
    ],
  );
  return ProviderScope(
    overrides: [
      authRepositoryProvider.overrideWithValue(repository),
      authLocalDataSourceProvider.overrideWithValue(
        AuthLocalDataSource(
          FakeSecureStorageService(),
          FakePreferencesService(),
        ),
      ),
    ],
    child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
  );
}

/// Pumps the sign-in screen on a 390 × 844 phone (the design frame).
Future<void> _pumpOnPhone(
  WidgetTester tester,
  FakeAuthRepository repository,
) async {
  tester.view
    ..physicalSize = const Size(390 * 3, 844 * 3)
    ..devicePixelRatio = 3
    ..padding = const FakeViewPadding(top: 47 * 3, bottom: 34 * 3);
  addTearDown(tester.view.reset);
  await tester.pumpWidget(_app(repository));
  await tester.pumpAndSettle();
}

final _email = find.byType(TextField).first;
final _password = find.byType(TextField).last;
final _signIn = find.widgetWithText(FilledButton, 'Sign in');

Color? _borderColor(WidgetTester tester, Finder field) {
  final decoration = tester.widget<TextField>(field).decoration!;
  return (decoration.enabledBorder as OutlineInputBorder).borderSide.color;
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
    this.keyboard = 0,
    this.textScale = 1,
  });

  final String name;
  final double width;
  final double height;
  final double top;
  final double bottom;
  final double left;
  final double right;
  final double keyboard;
  final double textScale;
}

const _devices = [
  _Device('small Android, 3-button nav', 360, 640, top: 24, bottom: 48),
  _Device('Pixel 9', 412, 915, top: 24, bottom: 24),
  _Device('iPhone SE', 375, 667, top: 20),
  _Device('iPhone 15 Pro', 393, 852, top: 59, bottom: 34),
  _Device('iPhone 15 Pro Max', 430, 932, top: 59, bottom: 34),
  _Device('narrow 320x568', 320, 568, top: 20),
  _Device('iPad Pro 12.9', 1024, 1366, top: 24, bottom: 20),
  _Device('Galaxy Fold inner', 673, 841, top: 24, bottom: 24),
  _Device('iPhone landscape', 852, 393, bottom: 21, left: 59, right: 59),
  _Device('Android landscape', 800, 360, top: 24, right: 48),
  _Device('iPhone 15 Pro, keyboard open', 393, 852, top: 59, keyboard: 336),
  _Device('small Android, keyboard open', 360, 640, top: 24, keyboard: 280),
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

  testWidgets('shows the design content', (tester) async {
    await _pumpOnPhone(tester, FakeAuthRepository());

    expect(find.text('Sign In to Continue'), findsOneWidget);
    expect(
      find.text(
        'Enter your authorized enforcement credentials to begin field '
        'operations.',
      ),
      findsOneWidget,
    );
    expect(find.text('Secure Enforcement Platform'), findsOneWidget);
    expect(find.text('Email Address'), findsOneWidget);
    expect(find.text('example@jbr.com'), findsOneWidget);
    expect(find.text('Password'), findsOneWidget);
    expect(find.text('Type Password'), findsOneWidget);
    expect(find.text('Remember Session'), findsOneWidget);
    expect(find.text('Forgot Password!'), findsOneWidget);
    expect(_signIn, findsOneWidget);
    expect(
      find.text(
        'This system is for authorized JBR personnel only. All activities '
        'are monitored and audited.',
      ),
      findsOneWidget,
    );
    expect(find.byType(AppAlertBanner), findsNothing);
  });

  testWidgets('empty submit shows a message on each field, no alert', (
    tester,
  ) async {
    final repository = FakeAuthRepository();
    await _pumpOnPhone(tester, repository);

    await tester.tap(_signIn);
    await tester.pumpAndSettle();

    expect(find.text(LoginMessages.emailRequired), findsOneWidget);
    expect(find.text(LoginMessages.passwordRequired), findsOneWidget);
    expect(find.byType(AppAlertBanner), findsNothing);
    expect(_borderColor(tester, _email), AppColors.fieldError);
    expect(_borderColor(tester, _password), AppColors.fieldError);
    expect(repository.calls, isEmpty);

    // Typing in the email clears only the email's error.
    await tester.enterText(_email, 'o');
    await tester.pumpAndSettle();

    expect(find.text(LoginMessages.emailRequired), findsNothing);
    expect(_borderColor(tester, _email), AppColors.ink);
    expect(find.text(LoginMessages.passwordRequired), findsOneWidget);
    expect(_borderColor(tester, _password), AppColors.fieldError);
  });

  testWidgets('a malformed email marks only the email field', (tester) async {
    await _pumpOnPhone(tester, FakeAuthRepository());

    await tester.enterText(_email, 'officer@jbr');
    await tester.enterText(_password, 'secret');
    await tester.tap(_signIn);
    await tester.pumpAndSettle();

    expect(find.text(LoginMessages.emailInvalid), findsOneWidget);
    expect(_borderColor(tester, _email), AppColors.fieldError);
    expect(_borderColor(tester, _password), AppColors.ink);
    expect(find.byType(AppAlertBanner), findsNothing);
  });

  testWidgets('Show/Hide toggles password visibility', (tester) async {
    await _pumpOnPhone(tester, FakeAuthRepository());

    bool obscured() => tester.widget<TextField>(_password).obscureText;
    expect(obscured(), isTrue);

    await tester.tap(find.text('Show'));
    await tester.pump();
    expect(obscured(), isFalse);
    expect(find.text('Hide'), findsOneWidget);

    await tester.tap(find.text('Hide'));
    await tester.pump();
    expect(obscured(), isTrue);
  });

  testWidgets('wrong credentials show one alert; fields stay normal', (
    tester,
  ) async {
    await _pumpOnPhone(
      tester,
      FakeAuthRepository(failure: AuthFailure.invalidCredentials),
    );

    await tester.enterText(_email, 'officer@jbr.com');
    await tester.enterText(_password, 'wrong');
    await tester.tap(_signIn);
    await tester.pumpAndSettle();

    expect(find.text(LoginMessages.invalidCredentials), findsOneWidget);
    expect(_borderColor(tester, _email), AppColors.ink);
    expect(_borderColor(tester, _password), AppColors.ink);
    expect(find.byType(LoginScreen), findsOneWidget);

    await tester.enterText(_password, 'wrong2');
    await tester.pumpAndSettle();
    expect(find.byType(AppAlertBanner), findsNothing);
  });

  testWidgets('signs in: spinner, success alert, then the dashboard', (
    tester,
  ) async {
    final repository = FakeAuthRepository(
      delay: const Duration(milliseconds: 500),
    );
    await _pumpOnPhone(tester, repository);

    await tester.tap(find.text('Remember Session'));
    await tester.enterText(_email, 'officer@jbr.com');
    await tester.enterText(_password, 'secret');
    await tester.tap(_signIn);
    await tester.pump();

    expect(find.byType(AppSpinner), findsOneWidget);
    expect(tester.widget<TextField>(_email).enabled, isFalse);

    await tester.pump(const Duration(milliseconds: 500));
    await tester.pump();
    expect(find.text(LoginMessages.success), findsOneWidget);
    expect(repository.calls.single.remember, isTrue);

    await tester.pump(LoginScreen.successHoldDuration);
    await tester.pumpAndSettle();
    expect(find.byType(DashboardScreen), findsOneWidget);
    expect(find.text('Test Officer'), findsOneWidget);
  });

  testWidgets('Forgot Password! opens password reset', (tester) async {
    await _pumpOnPhone(tester, FakeAuthRepository());

    await tester.tap(find.text('Forgot Password!'));
    await tester.pumpAndSettle();

    expect(find.byType(ForgotPasswordScreen), findsOneWidget);
  });

  testWidgets('the header stays fixed while the form scrolls', (tester) async {
    // Small phone with the keyboard open, so the form has to scroll.
    tester.view
      ..physicalSize = const Size(360 * 3, 640 * 3)
      ..devicePixelRatio = 3
      ..padding = const FakeViewPadding(top: 24 * 3)
      ..viewInsets = const FakeViewPadding(bottom: 280 * 3);
    addTearDown(tester.view.reset);
    await tester.pumpWidget(_app(FakeAuthRepository()));
    await tester.pumpAndSettle();

    final logoBefore = tester.getRect(find.text('Sign In to Continue'));
    final emailBefore = tester.getRect(_email);

    await tester.drag(find.text('Email Address'), const Offset(0, -200));
    await tester.pumpAndSettle();

    expect(tester.getRect(find.text('Sign In to Continue')), logoBefore);
    expect(tester.getRect(_email).top, lessThan(emailBefore.top));
  });

  group('keyboard on a 360 x 806 phone', () {
    // Top of the white sheet: the form starts 17 + 16 below it.
    double sheetTop(WidgetTester tester) =>
        tester.getRect(find.text('Email Address')).top - 33;

    Future<void> pumpWithKeyboard(WidgetTester tester, double keyboard) async {
      tester.view
        ..physicalSize = const Size(360 * 2, 806 * 2)
        ..devicePixelRatio = 2
        ..padding = const FakeViewPadding(top: 24 * 2)
        ..viewInsets = FakeViewPadding(bottom: keyboard * 2);
      addTearDown(tester.view.reset);
      await tester.pumpWidget(_app(FakeAuthRepository()));
      await tester.pumpAndSettle();
    }

    for (final keyboard in [0.0, 300.0]) {
      testWidgets('sheet stays below the whole header (keyboard $keyboard)', (
        tester,
      ) async {
        await pumpWithKeyboard(tester, keyboard);

        final pill = tester.getRect(find.text('Secure Enforcement Platform'));
        // Header: 24 status bar + 39 + content + 71 gap.
        expect(sheetTop(tester), closeTo(pill.bottom + 6 + 71, 2));
      });
    }

    testWidgets('a taller keyboard never covers the logo, text or pill', (
      tester,
    ) async {
      await pumpWithKeyboard(tester, 340);

      final top = sheetTop(tester);
      for (final finder in [
        find.text('Sign In to Continue'),
        find.textContaining('Enter your authorized enforcement'),
        find.text('Secure Enforcement Platform'),
      ]) {
        expect(tester.getRect(finder).bottom, lessThan(top));
      }
      // The badge ends well above the title.
      expect(
        tester.getRect(find.text('Sign In to Continue')).top,
        greaterThan(24 + 39 + 64),
      );
      // The email field is usable above the keyboard.
      expect(tester.getRect(_email).bottom, lessThanOrEqualTo(806 - 340));
    });

    testWidgets('the focused password field scrolls into view', (tester) async {
      await pumpWithKeyboard(tester, 340);

      await tester.showKeyboard(_password);
      await tester.pumpAndSettle();

      final password = tester.getRect(_password);
      expect(password.bottom, lessThanOrEqualTo(806 - 340 + 0.5));
      expect(password.top, greaterThanOrEqualTo(sheetTop(tester)));
      expect(
        tester.getRect(find.text('Secure Enforcement Platform')).bottom,
        lessThan(tester.getRect(find.text('Password')).top),
      );
    });
  });

  testWidgets('the header does not scroll with the page on tall screens', (
    tester,
  ) async {
    await _pumpOnPhone(tester, FakeAuthRepository());
    final titleBefore = tester.getRect(find.text('Sign In to Continue'));

    await tester.drag(find.text('Sign In to Continue'), const Offset(0, -200));
    await tester.pumpAndSettle();

    expect(tester.getRect(find.text('Sign In to Continue')), titleBefore);
  });

  for (final device in _devices) {
    for (final withError in [false, true]) {
      final variant = withError ? 'error state' : 'default state';
      testWidgets('$variant fits on ${device.name}', (tester) async {
        const dpr = 3.0;
        tester.view
          ..physicalSize = Size(device.width * dpr, device.height * dpr)
          ..devicePixelRatio = dpr
          ..padding = FakeViewPadding(
            top: device.top * dpr,
            bottom: device.bottom * dpr,
            left: device.left * dpr,
            right: device.right * dpr,
          )
          ..viewInsets = FakeViewPadding(bottom: device.keyboard * dpr);
        tester.platformDispatcher.textScaleFactorTestValue = device.textScale;
        addTearDown(() {
          tester.view.reset();
          tester.platformDispatcher.clearTextScaleFactorTestValue();
        });

        await tester.pumpWidget(_app(FakeAuthRepository()));
        await tester.pumpAndSettle();
        if (withError) {
          await tester.tap(_signIn, warnIfMissed: false);
          await tester.pumpAndSettle();
        }

        expect(tester.takeException(), isNull);

        // Everything can be reached: scroll the button into view.
        await tester.ensureVisible(_signIn);
        await tester.pumpAndSettle();
        final visible = Rect.fromLTRB(
          device.left,
          device.top,
          device.width - device.right,
          device.height - device.bottom - device.keyboard,
        ).inflate(0.5);
        final button = tester.getRect(_signIn);
        expect(
          visible.contains(button.topLeft) &&
              visible.contains(button.bottomRight),
          isTrue,
          reason: 'Sign in button $button outside $visible',
        );

        // Fields keep their order without overlapping.
        expect(
          tester.getRect(_email).bottom,
          lessThanOrEqualTo(tester.getRect(_password).top),
        );
        expect(tester.getRect(_password).bottom, lessThanOrEqualTo(button.top));
      });
    }
  }
}
